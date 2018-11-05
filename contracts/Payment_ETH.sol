pragma solidity ^0.4.24;

import "./Dice_SC.sol" as Game;
import "./ECVerify.sol"; 

contract Payment_ETH {

    /* 
     *   constant
     */

    //address constant DUMMY_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /*
     *   state
     */

    Game public game;

    struct Participant {
        uint256 deposit;
        bool isCloser;
        bytes32 balanceHash;
        uint256 nonce;
    }

    struct Channel {
        // 1 = open, 2 = closed
        // 0 = non-existent or settled
        uint8 state;

        mapping(address => Participant) participants;

        // After opening the channel this value represents the settlement window. This is the number of blocks that need to be mined between closing the channel uncooperatively and settling the channel.
        // After the channel has been uncooperatively closed, this value represents the block number after which settleChannel can be called.
        uint256 settleBlock;
    }

    uint256 public channelCounter;

    // The key is keccak256(lexicographic order of participant addresses)
    mapping (bytes32 => uint256) public participantsHash_to_channelCounter;

    // channel_identifier => channel. channel identifier is the keccak256(lexicographic order of participant addresses, channelCounter)
    mapping (bytes32 => Channel) public channels;

    //lockIdentifier is keccak256(channelIdentifier, lockID)
    mapping(bytes32 => mapping (address => uint256)) public lockIdentifier_to_lockedAmount;

    uint256 public settle_window_min;
    uint256 public settle_window_max;


    /*
     *   constructor
     */

    constructor(
        address _game,
        uint256 _settle_window_min,
        uint256 _settle_window_max 
    ) 
        public 
    {
        game = Game(_game);
        settle_window_min = _settle_window_min;
        settle_window_max = _settle_window_max;
    }

    /*
     *   modifiers
     */

    modifier isOpen (address participant, address partner) {
        bytes32 channelIdentifier = getChannelIdentifier(participant, partner);
        require(channels[channelIdentifier].state == 1, "channel should be open");
        _;
    }

    modifier settleWindowValid (uint256 settleWindow) {
        require(settleWindow <= settle_window_max && settleWindow >= settle_window_min, "invalid settle window");
        _;
    }

    /*
     *   public function
     */

    function openChannel(
        address participant1, 
        address participant2, 
        uint256 settle_window
    )
        settleWindowValid(settle_window)
        public
        returns (bytes32) 
    {
        bytes32 participantsHash = getParticipantsHash(participant1, participant2);
        require(participantsHash_to_channelCounter[participantsHash] == 0, "channel already exists");

        channelCounter += 1;
        participantsHash_to_channelCounter[participantsHash] = channelCounter;

        bytes32 channelIdentifier = getChannelIdentifier(participant1, participant2);
        channels[channelIdentifier].state = 1;
        channels[channelIdentifier].settleBlock = settle_window;

        emit ChannelOpened(participant1, participant2, channelIdentifier, settle_window);
    }

    function setTotalDeposit(
        address participant, 
        address partner
    )
        isOpen(participant, partner)
        public
        payable
    {
        bytes32 channelIdentifier = getChannelIdentifier(participant, partner);
        Participant storage participant_struct = channels[channelIdentifier].participants[participant];
        participant_struct.deposit += msg.value;

        emit ChannelNewDeposit(channelIdentifier, participant, participant_struct.deposit);
    }

    function cooperativeSettle (
        address participant1_address,
        uint256 participant1_balance,
        address participant2_address,
        uint256 participant2_balance,
        bytes participant1_signature,
        bytes participant2_signature
    )
        isOpen (participant1_address, participant2_address)
        public
    {
        bytes32 channelIdentifier = getChannelIdentifier(participant1_address, participant2_address);

        address recoveredParticipant1 = recoverAddressFromCooperativeSettleSignature(
            channelIdentifier, 
            participant1_address, 
            participant1_balance, 
            participant2_address, 
            participant2_balance, 
            participant1_signature
        );
        require(recoveredParticipant1 == participant1_address, "signature should be signed by participant1");

        address recoveredParticipant2 = recoverAddressFromCooperativeSettleSignature(
            channelIdentifier, 
            participant1_address, 
            participant1_balance, 
            participant2_address, 
            participant2_balance, 
            participant2_signature
        );
        require(recoveredParticipant2 == participant2_address, "signature should be signed by participant2");

        Channel storage channel = channels[channelIdentifier];

        uint256 totalDeposit = channel.participants[participant1_address].deposit + channel.participants[participant2_address].deposit;
        require(totalDeposit == participant1_balance + participant2_balance, "the sum of balances should be equal to the total deposit");

        delete channel.participants[participant1_address];
        delete channel.participants[participant2_address];
        delete channels[channelIdentifier];
        delete participantsHash_to_channelCounter[getParticipantsHash(participant1_address, participant2_address)];

        if (participant1_balance > 0) {
            participant1_address.transfer(participant1_balance);
        }

        if (participant2_balance > 0) {
            participant2_address.transfer(participant2_balance);
        }
        
        emit CooperativeSettled(channelIdentifier, participant1_balance, participant2_balance);
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
        bytes32 indexed channelIdentifier,
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

    function getChannelIdentifier (
        address participant, 
        address partner
    ) 
        view
        internal
        returns (bytes32)
    {
        require(participant != 0x0 && partner != 0x0 && participant != partner, "invalid input");

        bytes32 participantsHash = getParticipantsHash(participant, partner);
        uint256 counter = participantsHash_to_channelCounter[participantsHash];
        return keccak256((abi.encodePacked(participantsHash, counter)));
    }    

    function getParticipantsHash(
        address participant,
        address partner
    )
        view
        internal
        returns (bytes32)
    {
        require(participant != 0x0 && partner != 0x0 && participant != partner, "invalid input");

        if (participant < partner) {
            return keccac256(abi.encodePacked(participant, partner));
        } else {
            return keccak256(abi.encodePacked(partner, participant));
        }
    }

    function recoverAddressFromCooperativeSettleSignature (
        bytes32 channelIdentifier,
        address participant1,
        uint256 participant1_balance,
        address participant2,
        uint256 participant2_balance,
        bytes signature
    )
        view
        internal
        returns (address signatureAddress)
    {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                address(this), 
                channelIdentifier, 
                participant1, 
                participant1_balance, 
                participant2, 
                participant2_balance
            )
        );
        signatureAddress = ECVerify.ecverify(messageHash, signature);
    }
}