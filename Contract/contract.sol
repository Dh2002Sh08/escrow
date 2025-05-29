// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenEscrow {
    // Enum to represent the status of an escrow
    enum EscrowStatus { Created, Delivered, Confirmed, Cancelled }

    // Struct to store escrow details
    struct Escrow {
        address sender;
        address receiver;
        uint256 amount;
        EscrowStatus status;
    }

    // State variables
    IERC20 public token;
    uint256 public escrowCount;
    mapping(uint256 => Escrow) public escrows;
    // Mappings to track escrow IDs for each sender and receiver
    mapping(address => uint256[]) private senderEscrows;
    mapping(address => uint256[]) private receiverEscrows;

    // Events
    event EscrowCreated(uint256 indexed escrowId, address indexed sender, address indexed receiver, uint256 amount);
    event MarkedDelivered(uint256 indexed escrowId, address indexed receiver);
    event Confirmed(uint256 indexed escrowId, address indexed sender);
    event Cancelled(uint256 indexed escrowId);

    // Constructor
    constructor(address _token) {
        token = IERC20(_token);
    }

    // Create a new escrow
    function createEscrow(address _receiver, uint256 _amount) external returns (uint256) {
        require(_receiver != address(0), "Invalid receiver address");
        require(_amount > 0, "Amount must be greater than zero");
        
        // Transfer tokens from sender to contract
        require(token.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");

        // Increment escrow count and create new escrow
        escrowCount++;
        escrows[escrowCount] = Escrow({
            sender: msg.sender,
            receiver: _receiver,
            amount: _amount,
            status: EscrowStatus.Created
        });

        // Map escrow ID to sender and receiver
        senderEscrows[msg.sender].push(escrowCount);
        receiverEscrows[_receiver].push(escrowCount);

        emit EscrowCreated(escrowCount, msg.sender, _receiver, _amount);
        return escrowCount;
    }

    // Mark escrow as delivered
    function markDelivered(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.sender != address(0), "Escrow does not exist");
        require(msg.sender == escrow.sender, "Only sender can mark as delivered");
        require(escrow.status == EscrowStatus.Created, "Escrow not in Created state");

        escrow.status = EscrowStatus.Delivered;
        emit MarkedDelivered(_escrowId, escrow.receiver);
    }

    // Confirm delivery and release funds
    function confirmDelivery(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.sender != address(0), "Escrow does not exist");
        require(msg.sender == escrow.receiver, "Only receiver can confirm delivery");
        require(escrow.status == EscrowStatus.Delivered, "Escrow not in Delivered state");

        escrow.status = EscrowStatus.Confirmed;

        // Transfer tokens to receiver
        require(token.transfer(escrow.receiver, escrow.amount), "Token transfer failed");

        emit Confirmed(_escrowId, escrow.sender);
    }

    // Cancel escrow and refund sender
    function cancelEscrow(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.sender != address(0), "Escrow does not exist");
        require(msg.sender == escrow.sender, "Only sender can cancel");
        require(escrow.status == EscrowStatus.Created, "Escrow not in Created state");

        escrow.status = EscrowStatus.Cancelled;

        // Refund tokens to sender
        require(token.transfer(escrow.sender, escrow.amount), "Token transfer failed");

        emit Cancelled(_escrowId);
    }

    // Get escrow details (restricted to sender or receiver)
    function getEscrowDetails(uint256 _escrowId) external view returns (address sender, address receiver, uint256 amount, EscrowStatus status) {
        Escrow memory escrow = escrows[_escrowId];
        require(escrow.sender != address(0), "Escrow does not exist");
        require(msg.sender == escrow.sender || msg.sender == escrow.receiver, "Not authorized to view escrow");
        return (escrow.sender, escrow.receiver, escrow.amount, escrow.status);
    }

    // Get list of escrow IDs for the caller as sender
    function getSenderEscrows() external view returns (uint256[] memory) {
        return senderEscrows[msg.sender];
    }

    // Get list of escrow IDs for the caller as receiver
    function getReceiverEscrows() external view returns (uint256[] memory) {
        return receiverEscrows[msg.sender];
    }

    // // Get token address
    // function token() external view returns (IERC20) {
    //     return token;
    // }
}