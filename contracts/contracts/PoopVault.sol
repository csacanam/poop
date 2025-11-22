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

    // Track balances per recipient address
    mapping(address => uint256) public recipientBalances;

    // Track total deposits in the vault
    uint256 public totalDeposits;

    // Track claimed POOPs to prevent double-claiming
    mapping(string => bool) public claimedPoops;

    // Track which recipient owns each poopId
    mapping(string => address) public poopIdToRecipient;

    // Track the sender of each poopId (for refunds/cancellations)
    mapping(string => address) public poopIdToSender;

    // Track the amount for each poopId
    mapping(string => uint256) public poopIdToAmount;

    // Track cancelled POOPs
    mapping(string => bool) public cancelledPoops;

    // Events
    event Deposit(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        string poopId
    );

    event Claim(
        address indexed recipient,
        address indexed to,
        uint256 amount,
        string poopId
    );

    event Cancelled(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        string poopId
    );

    // Errors
    error Unauthorized();
    error ZeroAmount();
    error InsufficientBalance();
    error TransferFailed();
    error AlreadyClaimed();
    error InvalidRecipient();
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
     * @notice Deposit tokens into the vault for a recipient
     * @param recipient Address of the recipient who will claim the tokens
     * @param amount Amount of tokens to deposit
     * @param poopId Unique ID of the POOP for tracking
     */
    function deposit(
        address recipient,
        uint256 amount,
        string calldata poopId
    ) external {
        if (amount == 0) revert ZeroAmount();
        if (recipient == address(0)) revert InvalidRecipient();

        // Prevent duplicate poopIds (security: each poopId should be unique)
        if (poopIdToRecipient[poopId] != address(0))
            revert PoopIdAlreadyExists();

        // Link poopId to recipient, sender, and amount
        poopIdToRecipient[poopId] = recipient;
        poopIdToSender[poopId] = msg.sender;
        poopIdToAmount[poopId] = amount;

        // Transfer tokens from sender to vault
        bool success = token.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();

        // Update balances
        recipientBalances[recipient] += amount;
        totalDeposits += amount;

        emit Deposit(msg.sender, recipient, amount, poopId);
    }

    /**
     * @notice Claim tokens on behalf of a recipient
     * @dev Only owner (backend) can execute, claims from recipient linked to poopId
     * @dev Used when recipients claim their POOP after email verification
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

        // Get recipient from poopId
        address recipient = poopIdToRecipient[poopId];
        if (recipient == address(0)) revert InvalidRecipient();

        // Validate sufficient balance
        if (recipientBalances[recipient] < amount) revert InsufficientBalance();

        // Mark POOP as claimed
        claimedPoops[poopId] = true;

        // Update balances
        recipientBalances[recipient] -= amount;
        totalDeposits -= amount;

        // Transfer tokens to recipient
        bool success = token.transfer(to, amount);
        if (!success) revert TransferFailed();

        emit Claim(recipient, to, amount, poopId);
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

        // Get recipient and amount from poopId
        address recipient = poopIdToRecipient[poopId];
        uint256 amount = poopIdToAmount[poopId];

        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert ZeroAmount();

        // Validate sufficient balance for this specific POOP
        if (recipientBalances[recipient] < amount) revert InsufficientBalance();

        // Mark POOP as cancelled
        cancelledPoops[poopId] = true;

        // Update balances (remove only this POOP's amount from recipient's balance)
        recipientBalances[recipient] -= amount;
        totalDeposits -= amount;

        // Refund tokens to sender (msg.sender is the original sender)
        bool success = token.transfer(msg.sender, amount);
        if (!success) revert TransferFailed();

        emit Cancelled(msg.sender, recipient, amount, poopId);
    }

    /**
     * @notice Get the balance of a specific recipient
     * @param recipient Address of the recipient
     * @return Balance of the recipient in the vault
     */
    function getBalance(address recipient) external view returns (uint256) {
        return recipientBalances[recipient];
    }

    /**
     * @notice Get the total balance held by the vault
     * @return Total balance of tokens in the vault
     */
    function getTotalBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
