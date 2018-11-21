const Web3 = require('web3');

// var web3 = new Web3('http://54.250.21.165:8545');  //rinkeby
var web3 = new Web3('http://54.250.21.165:8545');  //rinkeby
//const web3 = new Web3('ws://54.249.21.74:8546'); //mainnet
//const web3 = new Web3('http://54.249.21.74:8545'); //mainnet

//const Tx = require('ethereumjs-tx')
const ethUtil = require('ethereumjs-util');
const {sendSignedTx} = require('./sendSignedTx');

const paymentContract = "0x86364E2a57C4040d94Ab1440E48693c6e7483c30";
const abi = [ { "constant": true, "inputs": [], "name": "settle_window_min", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "channelCounter", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "bytes32" } ], "name": "channels", "outputs": [ { "name": "state", "type": "uint8" }, { "name": "settleBlock", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "bytes32" } ], "name": "participantsHash_to_channelCounter", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "settle_window_max", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "game", "outputs": [ { "name": "", "type": "address" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "bytes32" }, { "name": "", "type": "address" } ], "name": "lockIdentifier_to_lockedAmount", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "inputs": [ { "name": "_game", "type": "address" }, { "name": "_settle_window_min", "type": "uint256" }, { "name": "_settle_window_max", "type": "uint256" } ], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "participant1", "type": "address" }, { "indexed": true, "name": "participant2", "type": "address" }, { "indexed": false, "name": "channelIdentifier", "type": "bytes32" }, { "indexed": false, "name": "settle_timeout", "type": "uint256" }, { "indexed": false, "name": "amount", "type": "uint256" } ], "name": "ChannelOpened", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channel_identifier", "type": "bytes32" }, { "indexed": true, "name": "participant", "type": "address" }, { "indexed": false, "name": "new_deposit", "type": "uint256" }, { "indexed": false, "name": "total_deposit", "type": "uint256" } ], "name": "ChannelNewDeposit", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelIdentifier", "type": "bytes32" }, { "indexed": true, "name": "participant1_address", "type": "address" }, { "indexed": true, "name": "participant2_address", "type": "address" }, { "indexed": false, "name": "participant1_balance", "type": "uint256" }, { "indexed": false, "name": "participant2_balance", "type": "uint256" } ], "name": "CooperativeSettled", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channel_identifier", "type": "bytes32" }, { "indexed": true, "name": "closing", "type": "address" }, { "indexed": false, "name": "balanceHash", "type": "bytes32" } ], "name": "ChannelClosed", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channel_identifier", "type": "bytes32" }, { "indexed": true, "name": "nonclosing", "type": "address" }, { "indexed": false, "name": "balanceHash", "type": "bytes32" } ], "name": "NonclosingUpdateBalanceProof", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelIdentifier", "type": "bytes32" }, { "indexed": true, "name": "participant1", "type": "address" }, { "indexed": true, "name": "participant2", "type": "address" }, { "indexed": false, "name": "lockedIdentifier", "type": "bytes32" }, { "indexed": false, "name": "transferToParticipant1Amount", "type": "uint256" }, { "indexed": false, "name": "transferToParticipant2Amount", "type": "uint256" } ], "name": "ChannelSettled", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelIdentifier", "type": "bytes32" }, { "indexed": true, "name": "beneficiary", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" } ], "name": "ChannelLockedSent", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelIdentifier", "type": "bytes32" }, { "indexed": true, "name": "beneficiary", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" } ], "name": "ChannelLockedReturn", "type": "event" }, { "constant": false, "inputs": [ { "name": "participant", "type": "address" }, { "name": "partner", "type": "address" }, { "name": "settle_window", "type": "uint256" } ], "name": "openChannel", "outputs": [], "payable": true, "stateMutability": "payable", "type": "function" }, { "constant": false, "inputs": [ { "name": "participant", "type": "address" }, { "name": "partner", "type": "address" } ], "name": "setTotalDeposit", "outputs": [], "payable": true, "stateMutability": "payable", "type": "function" }, { "constant": false, "inputs": [ { "name": "participant1_address", "type": "address" }, { "name": "participant1_balance", "type": "uint256" }, { "name": "participant2_address", "type": "address" }, { "name": "participant2_balance", "type": "uint256" }, { "name": "participant1_signature", "type": "bytes" }, { "name": "participant2_signature", "type": "bytes" } ], "name": "cooperativeSettle", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "partner", "type": "address" }, { "name": "balanceHash", "type": "bytes32" }, { "name": "nonce", "type": "uint256" }, { "name": "signature", "type": "bytes" } ], "name": "closeChannel", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "closing", "type": "address" }, { "name": "balanceHash", "type": "bytes32" }, { "name": "nonce", "type": "uint256" }, { "name": "signature", "type": "bytes" } ], "name": "nonclosingUpdateBalanceProof", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "participant1", "type": "address" }, { "name": "participant1_transferred_amount", "type": "uint256" }, { "name": "participant1_locked_amount", "type": "uint256" }, { "name": "participant1_lock_id", "type": "uint256" }, { "name": "participant2", "type": "address" }, { "name": "participant2_transferred_amount", "type": "uint256" }, { "name": "participant2_locked_amount", "type": "uint256" }, { "name": "participant2_lock_id", "type": "uint256" } ], "name": "settleChannel", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "participant1", "type": "address" }, { "name": "participant2", "type": "address" }, { "name": "lockIdentifier", "type": "bytes32" } ], "name": "unlock", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [ { "name": "participant", "type": "address" }, { "name": "partner", "type": "address" } ], "name": "getChannelIdentifier", "outputs": [ { "name": "", "type": "bytes32" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "channelIdentifier", "type": "bytes32" }, { "name": "participant", "type": "address" } ], "name": "getParticipantInfo", "outputs": [ { "name": "deposit", "type": "uint256" }, { "name": "isCloser", "type": "bool" }, { "name": "balanceHash", "type": "bytes32" }, { "name": "nonce", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" } ];

const settleWindow = 3;

const p1 = "0x56d77fcb5e4Fd52193805EbaDeF7a9D75325bdC0";
const p1PrivateKey = new Buffer('118538D2E2B08396D49AB77565F3038510B033A74C7D920C1C9C7E457276A3FB', 'hex');

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

    console.log('data is ', data);

    let receipt = await sendSignedTx(p1, paymentContract, data, '0', p1PrivateKey);

    return receipt;
}


async function getChannelIdentifier(p1, p2){

  let paymentContract1 = new web3.eth.Contract(
      abi,
      paymentContract
    );

  let data = await paymentContract1.methods.getChannelIdentifier(p1, p2).call({from: p1});
  return data;

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

async function main1(){
  let channelIdentifier = await getChannelIdentifier(p1, p2);
  console.log('channelId', channelIdentifier);

let receipt = await cooperativeSettle(p1, '0.2', p2, '0', channelIdentifier);

console.log(receipt);


}

async function plugClose () {
    //let channelIdentifier = await getChannelIdentifier(p1, p2);
    let myContract = new web3.eth.Contract(
        abi,
        paymentContract
    );
    let channelIdentifier = await myContract.methods.getChannelIdentifier(p1, p2).call({from: p1});
  
    let p1Deposit = await myContract.methods.getParticipantInfo(channelIdentifier, p1).call({from: p1});
    p1Deposit = p1Deposit.deposit;

    let p2Deposit = await myContract.methods.getParticipantInfo(channelIdentifier, p2).call({from: p1});
    p2Deposit = p2Deposit.deposit;

    let receipt = await cooperativeSettle(p1, web3.utils.fromWei(p1Deposit, 'ether'), p2, web3.utils.fromWei(p2Deposit, 'ether'), channelIdentifier);

    console.log(receipt);
}

//web3.eth.isSyncing().then(console.log);
plugClose();
//main1();
