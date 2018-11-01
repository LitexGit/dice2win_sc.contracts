pragma solidity ^0.4.24;

contract Dice_SC {

    /*
     *   state
     */

    mapping (bytes32 => address) round_to_winner;

    /*
     *   constructor
     */

    constructor() public {}

    /*
     *   public function
     */

    function initiatorSettle(
        bytes32 initiatorHashR,
        bytes32 roundIdendifier,
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

    }

    function acceptorSettle(
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

    }

    function initiatorReveal(
        bytes32 initiatorR
    )
        public
    {

    }

    function getRoundResult(
        bytes32 roundIdentifier
    )
        public
        returns(address)
    {

    }

    /*
     *   event
     */


    /*
     *   private function
     */
     
}