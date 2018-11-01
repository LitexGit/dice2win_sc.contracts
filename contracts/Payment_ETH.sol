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
    mapping(bytes32 => mapping (address => uint256)) roundIdentifier_to_lockedAmount;

    uint256 public settle_timeout_min;
    uint256 public settle_timeout_max;


    /*
     *   constructor
     */

    constructor() public {
        game = Game(DUMMY_ADDRESS);
    }

    /*
     *   public function
     */

    function openChannel(
        address participant1, 
        address participant2, 
        uint256 settle_timeout
    )
        settleTimeoutValid(settle_timeout)
        public
        returns (bytes32) 
    {
        emit ChannelOpened(channelIdentifier, participant1, participant2, settle_timeout);
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

    function closeChannel(
        address partner, 
        bytes32 round, 
        bytes32 balanceHash, 
        uint256 nonce, 
        bytes signature
    )
        public
    {
        emit ChannelClosed(channelIdentifier, msg.sender);
    }

    function partnerCloseChannel(
        address partner, 
        bytes32 round, 
        bytes32 balanceHash, 
        uint256 nonce, 
        bytes signature
        )
        public
    {
        emit PartnerUpdateBalanceProof(channelIdentifier, msg.sender);
    }

    function settleChannel(
        address participant1, 
        uint256 participant1_transferred_amount,
        uint256 participant1_locked_amount,
        address participant2,
        uint256 participant2_transferred_amount,
        uint256 participant2_locked_amount,
        bytes32 round
    )
        public
    {
        emit ChannelSettled(channelIdentifier, participant1_transferred_amount, participant2_transferred_amount);
    }

    function unlock(
        address participant1,
        address participant2,
        bytes256 round
    )
        public
    {
        emit ChannelLockedSent(channelIdentifier, round, beneficiary, amount);
        emit ChannelLockedReturn(channelIdentifier, round, beneficiary, amount);
    }

    /*
     *   event
     */

    event ChannelOpened(
        bytes32 indexed channel_identifier,
        address indexed participant1,
        address indexed participant2,
        uint256 settle_timeout
    );

    event ChannelNewDeposit(
        bytes32 indexed channel_identifier,
        address indexed participant,
        uint256 total_deposit
    );

    event ChannelClosed(
        bytes32 indexed channel_identifier,
        address indexed closing_participant
    );

    event PartnerUpdateBalanceProof(
        bytes32 indexed channel_identifier,
        address indexed closing_partner
    );

    event ChannelSettled(
        bytes32 indexed channelIdentifier, 
        uint256 participant1_transferred_amount, 
        uint256 participant2_transferred_amount
    );

    event ChannelLockedSent(
        bytes32 indexed channelIdentifier, 
        bytes32 indexed round, 
        beneficiary, 
        amount
    );

    event ChannelLockedReturn(
        bytes32 indexed channelIdentifier, 
        bytes32 indexed round, 
        beneficiary, 
        amount
    );

    /*
     *   private function
     */

    
}