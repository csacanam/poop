// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import "../contracts/PoopVault.sol";
import "../contracts/MockERC20.sol";

contract PoopVaultTest is Test {
    PoopVault public vault;
    MockERC20 public testToken;

    address public owner = address(0x1);
    address public sender = address(0x2);
    address public recipient = address(0x3);
    address public recipient2 = address(0x4);
    address public claimer = address(0x5);

    function setUp() public {
        // Deploy mock ERC20 token
        testToken = new MockERC20();

        // Deploy PoopVault for this token
        vault = new PoopVault(address(testToken), owner);

        // Mint some tokens to sender for testing
        testToken.mint(sender, 1000 ether);
    }

    // ========== Deposit Tests ==========

    function testDeposit() public {
        uint256 depositAmount = 100 ether;

        // Sender deposits tokens
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(recipient, depositAmount, "poop-123");
        vm.stopPrank();

        // Verify balances
        assertEq(vault.getBalance(recipient), depositAmount);
        assertEq(vault.totalDeposits(), depositAmount);
        assertEq(vault.getTotalBalance(), depositAmount);
    }

    function testMultipleDeposits() public {
        uint256 deposit1 = 100 ether;
        uint256 deposit2 = 50 ether;

        // First deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), deposit1);
        vault.deposit(recipient, deposit1, "poop-123");

        // Second deposit
        testToken.approve(address(vault), deposit2);
        vault.deposit(recipient, deposit2, "poop-456");
        vm.stopPrank();

        // Verify cumulative balance
        assertEq(vault.getBalance(recipient), deposit1 + deposit2);
        assertEq(vault.totalDeposits(), deposit1 + deposit2);
    }

    function testCannotDepositZero() public {
        vm.startPrank(sender);
        testToken.approve(address(vault), 100 ether);
        vm.expectRevert(PoopVault.ZeroAmount.selector);
        vault.deposit(recipient, 0, "poop-123");
        vm.stopPrank();
    }

    function testDepositEvent() public {
        uint256 depositAmount = 100 ether;
        string memory poopId = "poop-123";

        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);

        // Expect event emission
        vm.expectEmit(true, true, false, true);
        emit PoopVault.Deposit(sender, recipient, depositAmount, poopId);

        vault.deposit(recipient, depositAmount, poopId);
        vm.stopPrank();
    }

    // ========== ClaimFor Tests ==========

    function testClaimFor() public {
        uint256 depositAmount = 100 ether;
        string memory poopId = "poop-123";

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(recipient, depositAmount, poopId);
        vm.stopPrank();

        // Owner claims on behalf of recipient
        vm.prank(owner);
        vault.claimFor(claimer, depositAmount, poopId);

        // Verify balances
        assertEq(vault.getBalance(recipient), 0);
        assertEq(vault.totalDeposits(), 0);
        assertEq(testToken.balanceOf(claimer), depositAmount);

        // Verify POOP is marked as claimed
        assertTrue(vault.claimedPoops(poopId));
    }

    function testClaimForPartialAmount() public {
        uint256 depositAmount = 100 ether;
        uint256 claimAmount = 30 ether;
        string memory poopId = "poop-123";

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(recipient, depositAmount, poopId);
        vm.stopPrank();

        // Owner claims partial amount
        vm.prank(owner);
        vault.claimFor(claimer, claimAmount, poopId);

        // Verify balances
        assertEq(vault.getBalance(recipient), depositAmount - claimAmount);
        assertEq(vault.totalDeposits(), depositAmount - claimAmount);
        assertEq(testToken.balanceOf(claimer), claimAmount);
    }

    function testCannotClaimForUnauthorized() public {
        vm.prank(address(0x999));
        vm.expectRevert(PoopVault.Unauthorized.selector);
        vault.claimFor(claimer, 100 ether, "poop-123");
    }

    function testCannotClaimForZeroAmount() public {
        vm.prank(owner);
        vm.expectRevert(PoopVault.ZeroAmount.selector);
        vault.claimFor(claimer, 0, "poop-123");
    }

    function testCannotClaimForMoreThanBalance() public {
        uint256 depositAmount = 50 ether;
        string memory poopId = "poop-123";

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(recipient, depositAmount, poopId);
        vm.stopPrank();

        // Try to claim more than balance
        vm.prank(owner);
        vm.expectRevert(PoopVault.InsufficientBalance.selector);
        vault.claimFor(claimer, 100 ether, poopId);
    }

    function testCannotClaimForAlreadyClaimed() public {
        uint256 depositAmount = 100 ether;
        string memory poopId = "poop-123";

        // Deposit enough for two claims
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount * 2);
        vault.deposit(recipient, depositAmount * 2, poopId);
        vm.stopPrank();

        // First claim succeeds
        vm.prank(owner);
        vault.claimFor(claimer, depositAmount, poopId);

        // Second claim with same poopId should fail
        vm.prank(owner);
        vm.expectRevert(PoopVault.AlreadyClaimed.selector);
        vault.claimFor(claimer, depositAmount, poopId);
    }

    function testClaimForEvent() public {
        uint256 depositAmount = 100 ether;
        string memory poopId = "poop-123";

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(recipient, depositAmount, poopId);
        vm.stopPrank();

        // Expect event emission
        vm.expectEmit(true, true, false, true);
        emit PoopVault.Claim(recipient, claimer, depositAmount, poopId);

        vm.prank(owner);
        vault.claimFor(claimer, depositAmount, poopId);
    }

    function testClaimForMultipleRecipients() public {
        uint256 amount1 = 100 ether;
        uint256 amount2 = 50 ether;

        // Deposit to two different recipients
        vm.startPrank(sender);
        testToken.approve(address(vault), amount1 + amount2);
        vault.deposit(recipient, amount1, "poop-123");
        vault.deposit(recipient2, amount2, "poop-456");
        vm.stopPrank();

        // Claim from both recipients
        vm.prank(owner);
        vault.claimFor(claimer, amount1, "poop-123");

        vm.prank(owner);
        vault.claimFor(claimer, amount2, "poop-456");

        // Verify balances
        assertEq(vault.getBalance(recipient), 0);
        assertEq(vault.getBalance(recipient2), 0);
        assertEq(testToken.balanceOf(claimer), amount1 + amount2);
    }

    function testDifferentPoopsSameRecipient() public {
        uint256 amount1 = 100 ether;
        uint256 amount2 = 50 ether;

        // Deposit two different POOPs to same recipient
        vm.startPrank(sender);
        testToken.approve(address(vault), amount1 + amount2);
        vault.deposit(recipient, amount1, "poop-123");
        vault.deposit(recipient, amount2, "poop-456");
        vm.stopPrank();

        // Claim both POOPs
        vm.startPrank(owner);
        vault.claimFor(claimer, amount1, "poop-123");
        vault.claimFor(claimer, amount2, "poop-456");
        vm.stopPrank();

        // Verify both POOPs are claimed
        assertTrue(vault.claimedPoops("poop-123"));
        assertTrue(vault.claimedPoops("poop-456"));
        assertEq(testToken.balanceOf(claimer), amount1 + amount2);
    }

    function testCannotClaimForInvalidPoopId() public {
        vm.prank(owner);
        vm.expectRevert(PoopVault.InvalidRecipient.selector);
        vault.claimFor(claimer, 100 ether, "non-existent-poop");
    }

    // ========== Cancel Tests ==========

    function testCancel() public {
        uint256 depositAmount = 100 ether;
        string memory poopId = "poop-123";

        // Deposit
        uint256 initialSenderBalance = testToken.balanceOf(sender);
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(recipient, depositAmount, poopId);
        vm.stopPrank();

        // Cancel
        vm.prank(sender);
        vault.cancel(poopId);

        // Verify balances
        assertEq(vault.getBalance(recipient), 0);
        assertEq(vault.totalDeposits(), 0);
        assertEq(testToken.balanceOf(sender), initialSenderBalance);
        assertTrue(vault.cancelledPoops(poopId));
    }

    function testCannotCancelUnauthorized() public {
        uint256 depositAmount = 100 ether;
        string memory poopId = "poop-123";

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(recipient, depositAmount, poopId);
        vm.stopPrank();

        // Try to cancel with different account
        vm.prank(recipient);
        vm.expectRevert(PoopVault.Unauthorized.selector);
        vault.cancel(poopId);
    }

    function testCannotCancelAlreadyCancelled() public {
        uint256 depositAmount = 100 ether;
        string memory poopId = "poop-123";

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(recipient, depositAmount, poopId);
        vm.stopPrank();

        // Cancel once
        vm.prank(sender);
        vault.cancel(poopId);

        // Try to cancel again
        vm.prank(sender);
        vm.expectRevert(PoopVault.AlreadyCancelled.selector);
        vault.cancel(poopId);
    }

    function testCannotCancelAlreadyClaimed() public {
        uint256 depositAmount = 100 ether;
        string memory poopId = "poop-123";

        // Deposit and claim
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(recipient, depositAmount, poopId);
        vm.stopPrank();

        vm.prank(owner);
        vault.claimFor(claimer, depositAmount, poopId);

        // Try to cancel after claiming
        vm.prank(sender);
        vm.expectRevert(PoopVault.AlreadyClaimed.selector);
        vault.cancel(poopId);
    }

    function testCannotClaimCancelledPoop() public {
        uint256 depositAmount = 100 ether;
        string memory poopId = "poop-123";

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(recipient, depositAmount, poopId);
        vm.stopPrank();

        // Cancel
        vm.prank(sender);
        vault.cancel(poopId);

        // Try to claim cancelled POOP
        vm.prank(owner);
        vm.expectRevert(PoopVault.AlreadyCancelled.selector);
        vault.claimFor(claimer, depositAmount, poopId);
    }

    function testCancelledEvent() public {
        uint256 depositAmount = 100 ether;
        string memory poopId = "poop-123";

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(recipient, depositAmount, poopId);
        vm.stopPrank();

        // Expect event emission
        vm.expectEmit(true, true, false, true);
        emit PoopVault.Cancelled(sender, recipient, depositAmount, poopId);

        vm.prank(sender);
        vault.cancel(poopId);
    }

    // ========== Security Tests ==========

    function testCannotDepositDuplicatePoopId() public {
        uint256 amount = 100 ether;
        string memory poopId = "poop-123";

        // First deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), amount * 2);
        vault.deposit(recipient, amount, poopId);

        // Try to deposit with same poopId
        vm.expectRevert(PoopVault.PoopIdAlreadyExists.selector);
        vault.deposit(recipient, amount, poopId);
        vm.stopPrank();
    }

    function testCannotDepositSamePoopIdDifferentRecipient() public {
        uint256 amount = 100 ether;
        string memory poopId = "poop-123";

        // Deposit to recipient
        vm.startPrank(sender);
        testToken.approve(address(vault), amount * 2);
        vault.deposit(recipient, amount, poopId);

        // Try to deposit same poopId to different recipient
        vm.expectRevert(PoopVault.PoopIdAlreadyExists.selector);
        vault.deposit(recipient2, amount, poopId);
        vm.stopPrank();
    }

    function testPoopIdToRecipientMapping() public {
        string memory poopId = "poop-123";
        uint256 amount = 100 ether;

        // Before deposit, mapping should be empty
        assertEq(vault.poopIdToRecipient(poopId), address(0));

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), amount);
        vault.deposit(recipient, amount, poopId);
        vm.stopPrank();

        // After deposit, mapping should link to recipient
        assertEq(vault.poopIdToRecipient(poopId), recipient);
    }

    function testPoopIdToSenderMapping() public {
        string memory poopId = "poop-123";
        uint256 amount = 100 ether;

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), amount);
        vault.deposit(recipient, amount, poopId);
        vm.stopPrank();

        // Check sender mapping
        assertEq(vault.poopIdToSender(poopId), sender);
    }

    function testPoopIdToAmountMapping() public {
        string memory poopId = "poop-123";
        uint256 amount = 100 ether;

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), amount);
        vault.deposit(recipient, amount, poopId);
        vm.stopPrank();

        // Check amount mapping
        assertEq(vault.poopIdToAmount(poopId), amount);
    }
}

