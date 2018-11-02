pragma solidity ^0.4.24;

contract Dice_SC {

    /*
     *   constant
     */

    address constant DUMMY_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /*
     *   state
     */

    // only paymentContract can call getRoundResult
    address public paymentContract;

    // roundIdentifier is keccak256(lexicographic order of participant addresses+round)
    mapping (bytes32 => DiceResult) roundIdentifier_to_result;

    struct DiceResult {
        address positive;

        address negative;

        uint256 betMask;

        uint256 modulo;

        bytes32 acceptorR;

        // 0 = non-existent or settled
        // 1 = waiting for initiator reveal 
        // 2 = result worked out
        uint8 state; 

        address winner;

        uint256 lastRevealBlock;
    }

    uint256 public reveal_time_out;

    /*
     *   constructor
     */

    constructor(uint256 _reveal_time_out) public {
        reveal_time_out = _reveal_time_out;
    }

    /*
     *   modifiers
     */


    /*
     *   public function
     */

    function setPaymentContract (
        address _paymentContract
    )
        public
    {
        paymentContract = _paymentContract;
    }

    function initiatorSettle (
        bytes32 initiatorHashR,
        uint256 round,
        uint256 betMask,
        uint256 modulo,
        address positive,
        address negative,
        uint256 lastCommitBlock,
        uint256 value,
        bytes initiatorSignature,
        bytes32 acceptorR,
        bytes acceptorSignature
    )
        public
    {
        emit InitiatorSettled(msg.sender, acceptor, round, winnner);
    }

    function acceptorSettle (
        bytes32 initiatorHashR,
        bytes32 roundIdendifier,
        uint256 betMask,
        uint256 modulo,
        address positive,
        address negative,
        uint256 lastCommitBlock,
        uint256 value,
        bytes initiatorSignature,
        bytes32 acceptorR
    )
        public
    {
        emit AcceptorSettled(initiator, acceptor, round, lastRevealBlock);
    }

    function initiatorReveal (
        address acceptor,
        uint256 round,
        bytes32 initiatorR
    )
        public
    {
        emit InitiatorRevealed(initiator, acceptor, round, winner);
    }

    function getRoundResult (
        bytes32 roundIdentifier
    )
        public
        returns (address)
    {
        emit DiceResultSettled(initiator, acceptor, round, winner);
    }

    /*
     *   event
     */

    event InitiatorSetteld (
        address indexed initiator,
        address indexed acceptor,
        uint256 round,
        address winner
    );

    event AcceptorSettled (
        address indexed initiator,
        address indexed acceptor,
        uint256 round,
        uint256 lastRevealBlock
    );

    event InitiatorRevealed (
        address indexed initiator,
        address indexed acceptor,
        uint256 round,
        address winner
    );

    event DiceResultSettled (
        address indexed initiator,
        address indexed acceptor,
        uint256 round,
        address winner
    );

    /*
     *   private function
     */
     

}