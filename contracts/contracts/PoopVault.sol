// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PoopVault
 * @notice A vault to receive and store ERC20 tokens for POOP recipients
 * @dev Sender deposits tokens, recipient claims them later
 */
contract PoopVault {
    // The ERC20 token this vault manages (USDC)
    IERC20 public immutable token;

    // Owner of the vault (backend/authorized address)
    address public immutable owner;

    // Track balances per sender address
    mapping(address => uint256) public senderBalances;

    // Track total deposits in the vault
    uint256 public totalDeposits;

    // Track claimed POOPs to prevent double-claiming
    mapping(string => bool) public claimedPoops;

    // Track the sender of each poopId (for refunds/cancellations)
    mapping(string => address) public poopIdToSender;

    // Track the amount for each poopId
    mapping(string => uint256) public poopIdToAmount;

    // Track cancelled POOPs
    mapping(string => bool) public cancelledPoops;

    // Events
    event Deposit(address indexed sender, uint256 amount, string poopId);

    event Claim(
        address indexed sender,
        address indexed to,
        uint256 amount,
        string poopId
    );

    event Cancelled(address indexed sender, uint256 amount, string poopId);

    // Errors
    error Unauthorized();
    error ZeroAmount();
    error InsufficientBalance();
    error TransferFailed();
    error AlreadyClaimed();
    error PoopIdAlreadyExists();
    error AlreadyCancelled();
    error NotCancelled();

    /**
     * @notice Constructor to initialize the vault
     * @param _token Address of the ERC20 token (USDC on Celo)
     * @param _owner Address of the authorized owner (backend)
     */
    constructor(address _token, address _owner) {
        require(_token != address(0), "Invalid token address");
        require(_owner != address(0), "Invalid owner address");

        token = IERC20(_token);
        owner = _owner;
    }

    /**
     * @notice Deposit tokens into the vault
     * @dev Sender deposits tokens for a specific poopId
     * @dev Recipient will be determined later when they claim (backend knows who the recipient is based on poopId)
     * @param amount Amount of tokens to deposit
     * @param poopId Unique ID of the POOP for tracking
     */
    function deposit(uint256 amount, string calldata poopId) external {
        if (amount == 0) revert ZeroAmount();

        // Prevent duplicate poopIds (security: each poopId should be unique)
        if (poopIdToSender[poopId] != address(0)) revert PoopIdAlreadyExists();

        // Link poopId to sender and amount
        poopIdToSender[poopId] = msg.sender;
        poopIdToAmount[poopId] = amount;

        // Transfer tokens from sender to vault
        bool success = token.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        // Update balances
        senderBalances[msg.sender] += amount;
        totalDeposits += amount;

        emit Deposit(msg.sender, amount, poopId);
    }

    /**
     * @notice Claim tokens on behalf of a recipient
     * @dev Only owner (backend) can execute, claims from sender linked to poopId
     * @dev Used when recipients claim their POOP after email verification
     * @dev Backend knows who the recipient is based on poopId (from database)
     * @dev Prevents double-claiming by tracking poopId on-chain
     * @param to Address to send tokens to (the recipient claiming)
     * @param amount Amount of tokens to claim
     * @param poopId Unique identifier for this POOP
     */
    function claimFor(
        address to,
        uint256 amount,
        string calldata poopId
    ) external {
        if (msg.sender != owner) revert Unauthorized();
        if (amount == 0) revert ZeroAmount();
        if (claimedPoops[poopId]) revert AlreadyClaimed();

        // Cannot claim if already cancelled (check before balance to give clearer error)
        if (cancelledPoops[poopId]) revert AlreadyCancelled();

        // Get sender from poopId
        address sender = poopIdToSender[poopId];
        if (sender == address(0)) revert Unauthorized();

        // Validate sufficient balance
        if (senderBalances[sender] < amount) revert InsufficientBalance();

        // Validate amount matches the stored amount for this poopId
        if (poopIdToAmount[poopId] != amount) revert InsufficientBalance();

        // Mark POOP as claimed
        claimedPoops[poopId] = true;

        // Update balances
        senderBalances[sender] -= amount;
        totalDeposits -= amount;

        // Transfer tokens to recipient
        bool success = token.transfer(to, amount);
        if (!success) revert TransferFailed();

        emit Claim(sender, to, amount, poopId);
    }

    /**
     * @notice Cancel a POOP deposit and refund tokens to sender
     * @dev Only the original sender can cancel their own POOP
     * @dev Used when a sender wants to cancel/revert their POOP before it's claimed
     * @dev Prevents claiming after cancellation
     * @param poopId Unique identifier for this POOP to cancel
     */
    function cancel(string calldata poopId) external {
        // Get sender from poopId
        address sender = poopIdToSender[poopId];

        // Only the original sender can cancel
        if (msg.sender != sender) revert Unauthorized();
        if (cancelledPoops[poopId]) revert AlreadyCancelled();
        if (claimedPoops[poopId]) revert AlreadyClaimed();

        // Get amount from poopId
        uint256 amount = poopIdToAmount[poopId];
        if (amount == 0) revert ZeroAmount();

        // Validate sufficient balance for this specific POOP
        if (senderBalances[sender] < amount) revert InsufficientBalance();

        // Mark POOP as cancelled
        cancelledPoops[poopId] = true;

        // Update balances (remove only this POOP's amount from sender's balance)
        senderBalances[sender] -= amount;
        totalDeposits -= amount;

        // Refund tokens to sender (msg.sender is the original sender)
        bool success = token.transfer(msg.sender, amount);
        if (!success) revert TransferFailed();

        emit Cancelled(msg.sender, amount, poopId);
    }

    /**
     * @notice Get the balance of a specific sender
     * @param sender Address of the sender
     * @return Balance of the sender in the vault
     */
    function getBalance(address sender) external view returns (uint256) {
        return senderBalances[sender];
    }

    /**
     * @notice Get the total balance held by the vault
     * @return Total balance of tokens in the vault
     */
    function getTotalBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
