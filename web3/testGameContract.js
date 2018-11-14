const Web3 = require('web3');

const web3 = new Web3('http://54.250.21.165:8545');  //rinkeby
//const web3 = new Web3('ws://54.249.21.74:8546'); //mainnet
//const web3 = new Web3('http://54.249.21.74:8545'); //mainnet

const {sendSignedTx} = require('./sendSignedTx');
const {myEcsign} = require('./myEcsign');

const diceContract = "0xad6C7F6785184B3F7941717D13ca86b34FC04cfD";

const p1 = "0xa08105d7650Fe007978a291CcFECbB321fC21ffe";
const p1PrivateKey = new Buffer('6A22D7D5D87EFC4A1375203B7E54FBCF35FAA84975891C5E3D12BE86C579A6E5', 'hex');

const p2 = "0x430195EBc99c0e2Fe3caA7B7dC8De8491Cf04fA9";
const p2PrivateKey = new Buffer('C84795FFCFEA582F50AB364A76270A3131826F4F01DC592F3335B71CA31E939B', 'hex');

async function testInitiatorSettle (channelIdentifier, round, betMask, modulo, positive, negative) {
    let initiatorR = web3.utils.randomHex(32);
    let initiatorHashR = web3.utils.soliditySha3(initiatorR);
    let acceptorR = web3.utils.randomHex(32);
    let initiatorMessageHash = web3.utils.soliditySha3(diceContract, channelIdentifier, round, betMask, modulo, positive, negative, initiatorHashR);
    let initiatorSignature = myEcsign(initiatorMessageHash, p1PrivateKey);
    let initiatorSignatureHex = web3.utils.bytesToHex(initiatorSignature);
    //console.log(typeof(initiatorSignature), initiatorSignature);

    let acceptorMessageHash = web3.utils.soliditySha3(diceContract, channelIdentifier, round, betMask, modulo, positive, negative, initiatorHashR, {t:'bytes', v:initiatorSignatureHex}, acceptorR);
    let acceptorSignature = myEcsign(acceptorMessageHash, p2PrivateKey);

    let data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "channelIdentifier", "type": "bytes32" }, { "name": "round", "type": "uint256" }, { "name": "betMask", "type": "uint256" }, { "name": "modulo", "type": "uint256" }, { "name": "positive", "type": "address" }, { "name": "negative", "type": "address" }, { "name": "initiatorHashR", "type": "bytes32" }, { "name": "initiatorSignature", "type": "bytes" }, { "name": "acceptorR", "type": "bytes32" }, { "name": "acceptorSignature", "type": "bytes" }, { "name": "initiatorR", "type": "bytes32" } ], "name": "initiatorSettle", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, [channelIdentifier, round, betMask, modulo, positive, negative, initiatorHashR, initiatorSignature, acceptorR, acceptorSignature, initiatorR]);

    let receipt = await sendSignedTx(p1, diceContract, data, '0', p1PrivateKey);

    console.log('initiator settle receipt', receipt);
    console.log(initiatorR);
    console.log(acceptorR);
}

async function testAcceptorSettle(channelIdentifier, round, betMask, modulo, positive, negative) {
    let initiatorR = web3.utils.randomHex(32);
    let initiatorHashR = web3.utils.soliditySha3(initiatorR);
    let acceptorR = web3.utils.randomHex(32);
    let initiatorMessageHash = web3.utils.soliditySha3(diceContract, channelIdentifier, round, betMask, modulo, positive, negative, initiatorHashR);
    let initiatorSignature = myEcsign(initiatorMessageHash, p1PrivateKey);
    //let initiatorSignatureHex = web3.utils.bytesToHex(initiatorSignature);

    let data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "channelIdentifier", "type": "bytes32" }, { "name": "round", "type": "uint256" }, { "name": "betMask", "type": "uint256" }, { "name": "modulo", "type": "uint256" }, { "name": "positive", "type": "address" }, { "name": "negative", "type": "address" }, { "name": "initiatorHashR", "type": "bytes32" }, { "name": "initiatorSignature", "type": "bytes" }, { "name": "acceptorR", "type": "bytes32" } ], "name": "acceptorSettle", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, [channelIdentifier, round, betMask, modulo, positive, negative, initiatorHashR, initiatorSignature, acceptorR]);
    let receipt = await sendSignedTx(p2, diceContract, data, '0', p2PrivateKey);
    console.log("acceptor settled", receipt);

    data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "channelIdentifier", "type": "bytes32" }, { "name": "round", "type": "uint256" }, { "name": "initiatorR", "type": "bytes32" } ], "name": "initiatorReveal", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, [channelIdentifier, round, initiatorR]);
    receipt = await sendSignedTx(p1, diceContract, data, '0', p1PrivateKey);
    console.log("initiator revealed", receipt);
}



//testInitiatorSettle("0x71baf12e8bee587744419563c5e4e84c776918b26c6ff8ef8ce0e5f240faee12", 1, 1, 2, p1, p2);

testAcceptorSettle("0x71baf12e8bee587744419563c5e4e84c776918b26c6ff8ef8ce0e5f240faee12", 1, 1, 2, p1, p2);