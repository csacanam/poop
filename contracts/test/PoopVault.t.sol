// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {PoopVault} from "../contracts/PoopVault.sol";
import {MockERC20} from "../contracts/MockERC20.sol";

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
        vault.deposit(depositAmount, "poop-123");
        vm.stopPrank();

        // Verify balances
        assertEq(vault.getBalance(sender), depositAmount);
        assertEq(vault.totalDeposits(), depositAmount);
        assertEq(vault.getTotalBalance(), depositAmount);
    }

    function testMultipleDeposits() public {
        uint256 deposit1 = 100 ether;
        uint256 deposit2 = 50 ether;

        // First deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), deposit1);
        vault.deposit(deposit1, "poop-123");

        // Second deposit
        testToken.approve(address(vault), deposit2);
        vault.deposit(deposit2, "poop-456");
        vm.stopPrank();

        // Verify cumulative balance
        assertEq(vault.getBalance(sender), deposit1 + deposit2);
        assertEq(vault.totalDeposits(), deposit1 + deposit2);
    }

    function testCannotDepositZero() public {
        vm.startPrank(sender);
        testToken.approve(address(vault), 100 ether);
        vm.expectRevert(PoopVault.ZeroAmount.selector);
        vault.deposit(0, "poop-123");
        vm.stopPrank();
    }

    function testDepositEvent() public {
        uint256 depositAmount = 100 ether;
        string memory poopId = "poop-123";

        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);

        // Expect event emission
        vm.expectEmit(true, true, false, true);
        emit PoopVault.Deposit(sender, depositAmount, poopId);

        vault.deposit(depositAmount, poopId);
        vm.stopPrank();
    }

    // ========== ClaimFor Tests ==========

    function testClaimFor() public {
        uint256 depositAmount = 100 ether;
        string memory poopId = "poop-123";

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, poopId);
        vm.stopPrank();

        // Owner claims on behalf of recipient
        vm.prank(owner);
        vault.claimFor(claimer, depositAmount, poopId);

        // Verify balances
        assertEq(vault.getBalance(sender), 0);
        assertEq(vault.totalDeposits(), 0);
        assertEq(testToken.balanceOf(claimer), depositAmount);

        // Verify POOP is marked as claimed
        assertTrue(vault.claimedPoops(poopId));
    }

    function testCannotClaimForPartialAmount() public {
        uint256 depositAmount = 100 ether;
        uint256 claimAmount = 30 ether;
        string memory poopId = "poop-123";

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, poopId);
        vm.stopPrank();

        // Try to claim partial amount (should fail - must claim exact amount)
        vm.prank(owner);
        vm.expectRevert(PoopVault.InsufficientBalance.selector);
        vault.claimFor(claimer, claimAmount, poopId);
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
        vault.deposit(depositAmount, poopId);
        vm.stopPrank();

        // Try to claim more than balance
        vm.prank(owner);
        vm.expectRevert(PoopVault.InsufficientBalance.selector);
        vault.claimFor(claimer, 100 ether, poopId);
    }

    function testCannotClaimForAlreadyClaimed() public {
        uint256 depositAmount = 100 ether;
        string memory poopId = "poop-123";

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, poopId);
        vm.stopPrank();

        // First claim succeeds
        vm.prank(owner);
        vault.claimFor(claimer, depositAmount, poopId);

        // Second claim with same poopId should fail (already claimed)
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
        vault.deposit(depositAmount, poopId);
        vm.stopPrank();

        // Expect event emission
        vm.expectEmit(true, true, false, true);
        emit PoopVault.Claim(sender, claimer, depositAmount, poopId);

        vm.prank(owner);
        vault.claimFor(claimer, depositAmount, poopId);
    }

    function testClaimForMultipleRecipients() public {
        uint256 amount1 = 100 ether;
        uint256 amount2 = 50 ether;

        // Deposit to two different recipients
        vm.startPrank(sender);
        testToken.approve(address(vault), amount1 + amount2);
        vault.deposit(amount1, "poop-123");
        vault.deposit(amount2, "poop-456");
        vm.stopPrank();

        // Claim from both recipients
        vm.prank(owner);
        vault.claimFor(claimer, amount1, "poop-123");

        vm.prank(owner);
        vault.claimFor(claimer, amount2, "poop-456");

        // Verify balances
        assertEq(vault.getBalance(sender), 0);
        assertEq(vault.getBalance(sender), 0);
        assertEq(testToken.balanceOf(claimer), amount1 + amount2);
    }

    function testDifferentPoopsSameRecipient() public {
        uint256 amount1 = 100 ether;
        uint256 amount2 = 50 ether;

        // Deposit two different POOPs to same recipient
        vm.startPrank(sender);
        testToken.approve(address(vault), amount1 + amount2);
        vault.deposit(amount1, "poop-123");
        vault.deposit(amount2, "poop-456");
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
        vm.expectRevert(PoopVault.Unauthorized.selector);
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
        vault.deposit(depositAmount, poopId);
        vm.stopPrank();

        // Cancel
        vm.prank(sender);
        vault.cancel(poopId);

        // Verify balances
        assertEq(vault.getBalance(sender), 0);
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
        vault.deposit(depositAmount, poopId);
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
        vault.deposit(depositAmount, poopId);
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
        vault.deposit(depositAmount, poopId);
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
        vault.deposit(depositAmount, poopId);
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
        vault.deposit(depositAmount, poopId);
        vm.stopPrank();

        // Expect event emission
        vm.expectEmit(true, true, false, true);
        emit PoopVault.Cancelled(sender, depositAmount, poopId);

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
        vault.deposit(amount, poopId);

        // Try to deposit with same poopId
        vm.expectRevert(PoopVault.PoopIdAlreadyExists.selector);
        vault.deposit(amount, poopId);
        vm.stopPrank();
    }

    function testCannotDepositSamePoopIdDifferentRecipient() public {
        uint256 amount = 100 ether;
        string memory poopId = "poop-123";

        // Deposit to recipient
        vm.startPrank(sender);
        testToken.approve(address(vault), amount * 2);
        vault.deposit(amount, poopId);

        // Try to deposit same poopId to different recipient
        vm.expectRevert(PoopVault.PoopIdAlreadyExists.selector);
        vault.deposit(amount, poopId);
        vm.stopPrank();
    }

    // Note: poopIdToRecipient mapping was removed - recipient is determined by backend when claiming

    function testPoopIdToSenderMapping() public {
        string memory poopId = "poop-123";
        uint256 amount = 100 ether;

        // Deposit
        vm.startPrank(sender);
        testToken.approve(address(vault), amount);
        vault.deposit(amount, poopId);
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
        vault.deposit(amount, poopId);
        vm.stopPrank();

        // Check amount mapping
        assertEq(vault.poopIdToAmount(poopId), amount);
    }
}
