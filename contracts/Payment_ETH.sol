pragma solidity ^0.4.24;

//import "./Dice_SC.sol" as Game;
import "./Dice_SC.sol";
import "./ECVerify.sol"; 

contract Payment_ETH {

    /* 
     *   constant
     */

    //address constant DUMMY_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /*
     *   state
     */

    Dice_SC public game;

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
        game = Dice_SC(_game);
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

    modifier isClosed (address participant, address partner) {
        bytes32 channelIdentifier = getChannelIdentifier(participant, partner);
        require(channels[channelIdentifier].state == 2, "channel should be closed");
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

        recoveredParticipant1 = recoverAddressFromCooperativeSettleSignature(
            channelIdentifier, 
            participant1_address, 
            participant1_balance, 
            participant2_address, 
            participant2_balance, 
            participant2_signature
        );
        require(recoveredParticipant1 == participant2_address, "signature should be signed by participant2");

        // address recoveredParticipant2 = recoverAddressFromCooperativeSettleSignature(
        //     channelIdentifier, 
        //     participant1_address, 
        //     participant1_balance, 
        //     participant2_address, 
        //     participant2_balance, 
        //     participant2_signature
        // );
        // require(recoveredParticipant2 == participant2_address, "signature should be signed by participant2");

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
    function closeChannel (
        address partner, 
        bytes32 balanceHash, 
        uint256 nonce, 
        bytes signature
    )
        isOpen (msg.sender, partner)
        public
    {
        bytes32 channelIdentifier = getChannelIdentifier(msg.sender, partner);
        Channel storage channel = channels[channelIdentifier];
        Participant storage partnerStruct = channel.participants[partner];

        if (nonce > 0) {
            address recoveredPartner = recoverAddressFromBalanceProof(channelIdentifier, balanceHash, nonce, signature);
            require(recoveredPartner == partner, "balance proof should be signed by partner");

            updateParticipantBalanceProof(partnerStruct, balanceHash, nonce);
        }
        
        channel.state = 2;
        channel.participants[msg.sender].isCloser = true;
        channel.settleBlock += uint256(block.number);

        emit ChannelClosed(channelIdentifier, msg.sender, balanceHash);
    }

    //balanceHash is keccak256(transferredAmount, lockedAmount, lockID)
    function nonclosingUpdateBalanceProof(
        address closing, 
        bytes32 balanceHash, 
        uint256 nonce, 
        bytes signature
    )
        isClosed(closing, msg.sender)
        public
    {
        require(balanceHash != 0x0 && nonce > 0, "invalid balance proof");

        bytes32 channelIdentifier = getChannelIdentifier(msg.sender, closing);
        Channel storage channel = channels[channelIdentifier];
        Participant storage closingStruct = channel.participants[closing];
        //require(channel.state == 2, "channel should be closed");
        require(closingStruct.isCloser, "partner should be closer");
        require(block.number <= channel.settleBlock, "channel should be in settlement window");

        address recoveredClosing = recoverAddressFromBalanceProof(
            channelIdentifier,
            balanceHash,
            nonce,
            signature
        );
        require(recoveredClosing == closing, "signature should be signed by closing");

        updateParticipantBalanceProof(closingStruct, balanceHash, nonce);

        emit NonclosingUpdateBalanceProof(channelIdentifier, msg.sender, balanceHash);
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
        //isClosed(participant1, participant2)
        public
    {
        bytes32 channelIdentifier = getChannelIdentifier(participant1, participant2);
        Channel storage channel = channels[channelIdentifier];
        
        require(channel.state == 2, "channel state shold be closed");
        require(channel.settleBlock < block.number, "settlement window should be over");

        Participant storage participant1Struct = channel.participants[participant1];
        Participant storage participant2Struct = channel.participants[participant2];

        verifyBalanceHashData(
            participant1Struct,
            participant1_transferred_amount,
            participant1_locked_amount,
            participant1_lock_id
        );

        verifyBalanceHashData(
            participant2Struct,
            participant2_transferred_amount,
            participant2_locked_amount,
            participant2_lock_id
        );

        bytes32 lockIdentifier = updateLockData(
            channelIdentifier,
            participant1,
            participant1_locked_amount,
            participant1_lock_id,
            participant2,
            participant2_locked_amount,
            participant2_lock_id
        );

        delete channel.participants[participant1];
        delete channel.participants[participant2];
        delete channels[channelIdentifier];
        delete participantsHash_to_channelCounter[getParticipantsHash(participant1, participant2)];

        // uint256 transferToParticipant1Amount;
        // uint256 transferToParticipant2Amount;
        (
            participant1_transferred_amount, 
            participant2_transferred_amount
        ) = getSettleTransferAmounts (
            participant1Struct,
            participant1_transferred_amount,
            participant2Struct,
            participant2_transferred_amount
        );  
        participant1.transfer(participant1_transferred_amount);
        participant2.transfer(participant2_transferred_amount);

        emit ChannelSettled(channelIdentifier, lockIdentifier, participant1, participant1_transferred_amount);
        emit ChannelSettled(channelIdentifier, lockIdentifier, participant2, participant2_transferred_amount);

        // uint256 transferToParticipant1Amount;
        // uint256 transferToParticipant2Amount;
        // (
        //     transferToParticipant1Amount, 
        //     transferToParticipant2Amount
        // ) = getSettleTransferAmounts (
        //     participant1Struct,
        //     participant1_transferred_amount,
        //     participant2Struct,
        //     participant2_transferred_amount
        // );  
        // participant1.transfer(transferToParticipant1Amount);
        // participant2.transfer(transferToParticipant2Amount);

        // emit ChannelSettled(channelIdentifier, lockIdentifier, participant1, transferToParticipant1Amount);
        // emit ChannelSettled(channelIdentifier, lockIdentifier, participant2, transferToParticipant2Amount);
    }

    function unlock(
        address participant1,
        address participant2,
        bytes32 lockIdentifier
    )
        public
    {
        uint256 participant1LockedAmount = lockIdentifier_to_lockedAmount[lockIdentifier][participant1];
        uint256 participant2LockedAmount = lockIdentifier_to_lockedAmount[lockIdentifier][participant2];

        address winner = game.getResult(lockIdentifier);

        if (winner == 0x0) {
            if (participant1LockedAmount > 0) {
                participant1.transfer(participant1LockedAmount);
                emit ChannelLockedReturn(lockIdentifier, participant1, participant1LockedAmount);
            }
            if (participant2LockedAmount > 0) {
                participant2.transfer(participant2LockedAmount);
                emit ChannelLockedReturn(lockIdentifier, participant2, participant2LockedAmount);
            }
        } else {
            if (winner == participant1) {
                if (participant2LockedAmount > 0) {
                    participant1.transfer(participant2LockedAmount);
                    emit ChannelLockedSent(lockIdentifier, participant1, participant2LockedAmount);
                }
                if (participant1LockedAmount > 0) {
                    participant1.transfer(participant1LockedAmount);
                    emit ChannelLockedReturn(lockIdentifier, participant1, participant1LockedAmount);
                }
            } else {
                if (participant1LockedAmount > 0) {
                    participant2.transfer(participant1LockedAmount);
                    emit ChannelLockedSent(lockIdentifier, participant2, participant1LockedAmount);
                }
                if (participant2LockedAmount > 0) {
                    participant2.transfer(participant2LockedAmount);
                    emit ChannelLockedReturn(lockIdentifier, participant2, participant2LockedAmount);
                }
            }       
        } 
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
        address participant, 
        uint256 transferToParticipantAmount
    );

    event ChannelLockedSent(
        bytes32 indexed channelIdentifier, 
        address indexed beneficiary, 
        uint256 amount
    );

    event ChannelLockedReturn(
        bytes32 indexed channelIdentifier, 
        address indexed beneficiary, 
        uint256 amount
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
        pure
        internal
        returns (bytes32)
    {
        require(participant != 0x0 && partner != 0x0 && participant != partner, "invalid input");

        if (participant < partner) {
            return keccak256(abi.encodePacked(participant, partner));
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

    function recoverAddressFromBalanceProof (
        bytes32 channelIdentifier,
        bytes32 balanceHash,
        uint256 nonce,
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
                balanceHash,
                nonce
            )
        );
        signatureAddress = ECVerify.ecverify(messageHash, signature);
    }

    function updateParticipantBalanceProof (
        Participant storage participant,
        bytes32 balanceHash,
        uint256 nonce
    )
        internal
    {
        require(nonce > participant.nonce, "nonce should be monotonic");

        participant.balanceHash = balanceHash;
        participant.nonce = nonce;
    }

    function verifyBalanceHashData (
        Participant storage participant,
        uint256 transferredAmount,
        uint256 lockedAmount,
        uint256 lockID
    )
        view
        internal
    {
        if (participant.balanceHash == 0x0 && transferredAmount == 0 && lockedAmount == 0 && lockID == 0) {
            return;
        }

        bytes32 balanceHash = keccak256(abi.encodePacked(transferredAmount, lockedAmount, lockID));
        require(balanceHash == participant.balanceHash, "balance hash should be correct");
    }

    function getSettleTransferAmounts (
        Participant storage participant1,
        uint256 participant1_transferred_amount,
        Participant storage participant2,
        uint256 participant2_transferred_amount
    )
        view
        internal
        returns (uint256 transferToParticipant1Amount, uint256 transferToParticipant2Amount)
    {
        uint256 margin;
        uint256 min;
        (margin, min) = magicSubtract(participant1_transferred_amount, participant2_transferred_amount);
        if (min == participant1_transferred_amount) {
            margin = participant2.deposit > margin ? margin : participant2.deposit;
            transferToParticipant1Amount = participant1.deposit + margin;
            transferToParticipant2Amount = participant2.deposit - margin;
        } else {
            margin = participant1.deposit > margin ? margin : participant1.deposit;
            transferToParticipant1Amount = participant1.deposit - margin;
            transferToParticipant2Amount = participant2.deposit + margin;
        }
    }

    function updateLockData(
        bytes32 channelIdentifier,
        address participant1,
        uint256 participant1_locked_amount,
        uint256 participant1_lock_id,
        address participant2,
        uint256 participant2_locked_amount,
        uint256 participant2_lock_id
    )
        internal
        returns (bytes32 lockIdentifier)
    {
        if (participant1_lock_id == participant2_lock_id) {
            lockIdentifier = keccak256(abi.encodePacked(channelIdentifier, participant1_lock_id));
        } else if (participant1_lock_id < participant2_lock_id) {
            lockIdentifier = keccak256(abi.encodePacked(channelIdentifier, participant2_lock_id));
            participant1_locked_amount = 0;
        } else {
            lockIdentifier = keccak256(abi.encodePacked(channelIdentifier, participant1_lock_id));
            participant2_locked_amount = 0;
        }

        lockIdentifier_to_lockedAmount[lockIdentifier][participant1] = participant1_locked_amount;
        lockIdentifier_to_lockedAmount[lockIdentifier][participant2] = participant2_locked_amount;
    }

    function magicSubtract(
        uint256 a,
        uint256 b
    )
        pure
        internal
        returns (uint256, uint256)
    {
        return a > b ? (a - b, b) : (b - a, a);
    }
}