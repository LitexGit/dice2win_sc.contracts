const Web3 = require('web3');

var web3 = new Web3('http://18.179.206.91:8545');  //rinkeby
//const web3 = new Web3('ws://54.249.21.74:8546'); //mainnet
//const web3 = new Web3('http://54.249.21.74:8545'); //mainnet

//const Tx = require('ethereumjs-tx')
const ethUtil = require('ethereumjs-util');
const {sendSignedTx} = require('./sendSignedTx');

const paymentContract = "0x5167553b547973487Aeaf2413B68f290d5266FE0";
const settleWindow = 3;

const p1 = "0xa08105d7650Fe007978a291CcFECbB321fC21ffe";
const p1PrivateKey = new Buffer('6A22D7D5D87EFC4A1375203B7E54FBCF35FAA84975891C5E3D12BE86C579A6E5', 'hex');

const p2 = "0x633177eeE5dB5a2c504e0AE6044d20a9287909f9";
const p2PrivateKey = new Buffer('4E9866ADC11E202E6B47CC087B3776B1F460CECD53086007538FB2D207FE54A6', 'hex');

async function openChannel(p1, p2, window, amount) {
    let data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "participant", "type": "address" }, { "name": "partner", "type": "address" }, { "name": "settle_window", "type": "uint256" } ], "name": "openChannel", "outputs": [], "payable": true, "stateMutability": "payable", "type": "function" }, [p1, p2, window]);

    let receipt = await sendSignedTx(p1, paymentContract, data, amount, p1PrivateKey);

    return receipt;
}

async function setTotalDeposit(participant, partner, amount, privateKey) {

    let data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "participant", "type": "address" }, { "name": "partner", "type": "address" } ], "name": "setTotalDeposit", "outputs": [], "payable": true, "stateMutability": "payable", "type": "function" }, [participant, partner]);

    let receipt = await sendSignedTx(participant, paymentContract, data, amount, privateKey);

    return receipt;
}

async function cooperativeSettle(p1, p1Balance, p2, p2Balance, channelIdentifier) {
    p1Balance = web3.utils.toWei(p1Balance, 'ether');
    p2Balance = web3.utils.toWei(p2Balance, 'ether');
    //p1Balance = web3.utils.toHex(p1Balance);
    //p2Balance = web3.utils.toHex(p2Balance)

    // let message = paymentContract + channelIdentifier.substr(2) + p1.substr(2) + web3.utils.toHex(p1Balance).substr(2) + p2.substr(2) + web3.utils.toHex(p2Balance).substr(2);
    // console.log("message", message);

    message = web3.utils.soliditySha3(paymentContract, channelIdentifier, p1, p1Balance, p2, p2Balance);
    console.log("message", message);

    message = new Buffer(message.substr(2), 'hex');
    console.log("message", message);


    p1Signature = ethUtil.ecsign(message, p1PrivateKey);
    p2Signature = ethUtil.ecsign(message, p2PrivateKey);

    p1Signature = ethUtil.toRpcSig(p1Signature.v, p1Signature.r, p1Signature.s).toString("hex");
    p2Signature = ethUtil.toRpcSig(p2Signature.v, p2Signature.r, p2Signature.s).toString("hex");

    p1Signature = web3.utils.hexToBytes(p1Signature);
    p2Signature = web3.utils.hexToBytes(p2Signature);

    let data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "participant1_address", "type": "address" }, { "name": "participant1_balance", "type": "uint256" }, { "name": "participant2_address", "type": "address" }, { "name": "participant2_balance", "type": "uint256" }, { "name": "participant1_signature", "type": "bytes" }, { "name": "participant2_signature", "type": "bytes" } ], "name": "cooperativeSettle", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, [p1, p1Balance, p2, p2Balance, p1Signature, p2Signature]);

    let receipt = await sendSignedTx(p1, paymentContract, data, '0', p1PrivateKey);

    return receipt;
}

async function main () {
    let receipt = await openChannel(p1, p2, 3, '0.5');
    
    if (receipt == '0x0') {
        console.log("open channel failed");
        return;
    }

    let channelIdentifier = receipt.logs[0].data.slice(0, 64)

    console.log("open channel succ", receipt);

    receipt = await setTotalDeposit(p2, p1, '0.5', p2PrivateKey);

    if (receipt == '0x0') {
        console.log("p2 deposit failed");
        return;
    }

    console.log("p2 deposit succ", receipt);

    // let receipt = await cooperativeSettle(p1, '0.2', p2, '0.8', channelIdentifier);
    // console.log(receipt);
}

main();