pragma solidity ^0.4.24;

import "./Dice_SC.sol" as Game;

contract Payment_ETH {

    /* 
     *   constant
     */

    address constant DUMMY_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /*
     *   state
     */

    Game public game;

    // channel_identifier => channel. channel identifier is the keccak256(lexicographic order of participant addresses)
    mapping (bytes32 => Channel) public channels;

    struct Participant {
        uint256 deposit;
        bool isCloser;
        bytes32 balanceHash;
        uint256 nonce;
    }

    struct Channel {
        uint8 state;
        mapping(address => Participant) participants;
        uint256 settle_block_number;
    }

    //roundIdentifier is keccak256(lexicographic order of participant addresses+round)
    mapping(bytes32 => mapping (address => uint256)) public roundIdentifier_to_lockedAmount;

    uint256 public settle_timeout_min;
    uint256 public settle_timeout_max;


    /*
     *   constructor
     */

    constructor() public {
        game = Game(DUMMY_ADDRESS);
    }

    /*
     *   modifiers
     */



    /*
     *   public function
     */

    function setSettleTimeout (
        uint256 _settle_timeout_min,
        uint256 _settle_timeout_max
    )
        public
    {
        settle_timeout_min = _settle_timeout_min;
        settle_timeout_max = _settle_timeout_max;
    }

    function openChannel(
        address participant1, 
        address participant2, 
        uint256 settle_timeout
    )
        settleTimeoutValid(settle_timeout)
        public
        returns (bytes32) 
    {
        emit ChannelOpened(participant1, participant2, channelIdentifier, settle_timeout);
    }

    function setTotalDeposit(
        address participant, 
        address partner
    )
        isOpen(participant, partner)
        public
        payable
    {
        emit ChannelNewDeposit(channelIdentifier, participant, total_deposit);
    }

    function cooperativeSettle (
        address participant1_address,
        uint256 participant1_balance,
        address participant2_address,
        uint256 participant2_balance,
        bytes participant1_signature,
        bytes participant2_signature
    )
        public
    {
        emit CooperativeSettled(participant1_address, participant2_address, participant1_balance, participant2_balance);
    }

    //balanceHash is keccak256(transferredAmount, lockedAmount, lockID)
    function closeChannel(
        address partner, 
        bytes32 balanceHash, 
        uint256 nonce, 
        bytes signature
    )
        public
    {
        emit ChannelClosed(channelIdentifier, balanceHash, msg.sender);
    }

    //balanceHash is keccak256(transferredAmount, lockedAmount, lockID)
    function nonclosingUpdateBalanceProof(
        address nonclosing,
        address closing, 
        bytes32 balanceHash, 
        uint256 nonce, 
        bytes signature
    )
        public
    {
        emit NonclosingUpdateBalanceProof(channelIdentifier, balanceHash, nonclosing);
    }

    function settleChannel(
        address participant1, 
        uint256 participant1_transferred_amount,
        uint256 participant1_locked_amount,
        uint256 participant1_lock_id,
        address participant2,
        uint256 participant2_transferred_amount,
        uint256 participant2_locked_amount,
        uint256 participant2_lock_id
    )
        public
    {
        emit ChannelSettled(channelIdentifier, lockedIdentifier, participant1_transferred_amount, participant2_transferred_amount);
    }

    function unlock(
        address participant1,
        address participant2,
        uint256 lock_id 
    )
        public
    {
        emit ChannelLockedSent(channelIdentifier, beneficiary, amount);
        emit ChannelLockedReturn(channelIdentifier, beneficiary, amount);
    }

    /*
     *   event
     */

    event ChannelOpened(
        address indexed participant1,
        address indexed participant2,
        bytes32 indexed channelIdentifier,
        uint256 settle_timeout
    );

    event ChannelNewDeposit(
        bytes32 indexed channel_identifier,
        address indexed participant,
        uint256 total_deposit
    );

    event CooperativeSettled (
        address indexed participant1,
        address indexed participant2,
        uint256 participant1_balance,
        uint256 participant2_balance
    );

    event ChannelClosed(
        bytes32 indexed channel_identifier,
        address indexed closing,
        bytes32 balanceHash
    );

    event NonclosingUpdateBalanceProof(
        bytes32 indexed channel_identifier,
        address indexed nonclosing,
        bytes32 balanceHash
    );

    event ChannelSettled(
        bytes32 indexed channelIdentifier, 
        bytes32 indexed lockedIdentifier,
        uint256 closing_transferred_amount, 
        uint256 nonclosing_transferred_amount
    );

    event ChannelLockedSent(
        bytes32 indexed channelIdentifier, 
        beneficiary, 
        amount
    );

    event ChannelLockedReturn(
        bytes32 indexed channelIdentifier, 
        beneficiary, 
        amount
    );

    /*
     *   private function
     */

    
}