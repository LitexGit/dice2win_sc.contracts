var Web3 = require('web3');
var web3 = new Web3('http://39.96.8.192:8545');
const fs = require('fs');
const {sendSignedTx} = require('./sendSignedTx');
const ethUtil = require('ethereumjs-util');

web3.eth.isSyncing().then(console.log);

const paymentContract = "0x4B70A4d4d885cb397E2bD5b0A77DA9bD3EEb033e";
const abi = [ { "constant": true, "inputs": [], "name": "settle_window_min", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "channelCounter", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "bytes32" } ], "name": "channels", "outputs": [ { "name": "state", "type": "uint8" }, { "name": "settleBlock", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "bytes32" } ], "name": "participantsHash_to_channelCounter", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "settle_window_max", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [], "name": "game", "outputs": [ { "name": "", "type": "address" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "", "type": "bytes32" }, { "name": "", "type": "address" } ], "name": "lockIdentifier_to_lockedAmount", "outputs": [ { "name": "", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "inputs": [ { "name": "_game", "type": "address" }, { "name": "_settle_window_min", "type": "uint256" }, { "name": "_settle_window_max", "type": "uint256" } ], "payable": false, "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "participant1", "type": "address" }, { "indexed": true, "name": "participant2", "type": "address" }, { "indexed": false, "name": "channelIdentifier", "type": "bytes32" }, { "indexed": false, "name": "settle_timeout", "type": "uint256" }, { "indexed": false, "name": "amount", "type": "uint256" } ], "name": "ChannelOpened", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channel_identifier", "type": "bytes32" }, { "indexed": true, "name": "participant", "type": "address" }, { "indexed": false, "name": "new_deposit", "type": "uint256" }, { "indexed": false, "name": "total_deposit", "type": "uint256" } ], "name": "ChannelNewDeposit", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelIdentifier", "type": "bytes32" }, { "indexed": true, "name": "participant1_address", "type": "address" }, { "indexed": true, "name": "participant2_address", "type": "address" }, { "indexed": false, "name": "participant1_balance", "type": "uint256" }, { "indexed": false, "name": "participant2_balance", "type": "uint256" } ], "name": "CooperativeSettled", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channel_identifier", "type": "bytes32" }, { "indexed": true, "name": "closing", "type": "address" }, { "indexed": false, "name": "balanceHash", "type": "bytes32" } ], "name": "ChannelClosed", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channel_identifier", "type": "bytes32" }, { "indexed": true, "name": "nonclosing", "type": "address" }, { "indexed": false, "name": "balanceHash", "type": "bytes32" } ], "name": "NonclosingUpdateBalanceProof", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelIdentifier", "type": "bytes32" }, { "indexed": true, "name": "participant1", "type": "address" }, { "indexed": true, "name": "participant2", "type": "address" }, { "indexed": false, "name": "lockedIdentifier", "type": "bytes32" }, { "indexed": false, "name": "transferToParticipant1Amount", "type": "uint256" }, { "indexed": false, "name": "transferToParticipant2Amount", "type": "uint256" } ], "name": "ChannelSettled", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelIdentifier", "type": "bytes32" }, { "indexed": true, "name": "beneficiary", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" } ], "name": "ChannelLockedSent", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "name": "channelIdentifier", "type": "bytes32" }, { "indexed": true, "name": "beneficiary", "type": "address" }, { "indexed": false, "name": "amount", "type": "uint256" } ], "name": "ChannelLockedReturn", "type": "event" }, { "constant": false, "inputs": [ { "name": "participant", "type": "address" }, { "name": "partner", "type": "address" }, { "name": "settle_window", "type": "uint256" } ], "name": "openChannel", "outputs": [], "payable": true, "stateMutability": "payable", "type": "function" }, { "constant": false, "inputs": [ { "name": "participant", "type": "address" }, { "name": "partner", "type": "address" } ], "name": "setTotalDeposit", "outputs": [], "payable": true, "stateMutability": "payable", "type": "function" }, { "constant": false, "inputs": [ { "name": "participant1_address", "type": "address" }, { "name": "participant1_balance", "type": "uint256" }, { "name": "participant2_address", "type": "address" }, { "name": "participant2_balance", "type": "uint256" }, { "name": "participant1_signature", "type": "bytes" }, { "name": "participant2_signature", "type": "bytes" } ], "name": "cooperativeSettle", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "partner", "type": "address" }, { "name": "balanceHash", "type": "bytes32" }, { "name": "nonce", "type": "uint256" }, { "name": "signature", "type": "bytes" } ], "name": "closeChannel", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "closing", "type": "address" }, { "name": "balanceHash", "type": "bytes32" }, { "name": "nonce", "type": "uint256" }, { "name": "signature", "type": "bytes" } ], "name": "nonclosingUpdateBalanceProof", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "participant1", "type": "address" }, { "name": "participant1_transferred_amount", "type": "uint256" }, { "name": "participant1_locked_amount", "type": "uint256" }, { "name": "participant1_lock_id", "type": "uint256" }, { "name": "participant2", "type": "address" }, { "name": "participant2_transferred_amount", "type": "uint256" }, { "name": "participant2_locked_amount", "type": "uint256" }, { "name": "participant2_lock_id", "type": "uint256" } ], "name": "settleChannel", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": false, "inputs": [ { "name": "participant1", "type": "address" }, { "name": "participant2", "type": "address" }, { "name": "lockIdentifier", "type": "bytes32" } ], "name": "unlock", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, { "constant": true, "inputs": [ { "name": "participant", "type": "address" }, { "name": "partner", "type": "address" } ], "name": "getChannelIdentifier", "outputs": [ { "name": "", "type": "bytes32" } ], "payable": false, "stateMutability": "view", "type": "function" }, { "constant": true, "inputs": [ { "name": "channelIdentifier", "type": "bytes32" }, { "name": "participant", "type": "address" } ], "name": "getParticipantInfo", "outputs": [ { "name": "deposit", "type": "uint256" }, { "name": "isCloser", "type": "bool" }, { "name": "balanceHash", "type": "bytes32" }, { "name": "nonce", "type": "uint256" } ], "payable": false, "stateMutability": "view", "type": "function" } ];
let myContract = new web3.eth.Contract(abi, paymentContract);


const addressFile = '/Users/vincent/Develop/dice2win_blockchain_sc/web3/addresses.json';
const refugees = JSON.parse(fs.readFileSync(addressFile));

async function cooperativeSettle(p1, p1Balance, p2, p2Balance, p1PrivateKey, p2PrivateKey) {
    let channelIdentifier = await myContract.methods.getChannelIdentifier(p1, p2).call({from: p1});

    p1Balance = web3.utils.toWei(p1Balance, 'ether');
    p2Balance = web3.utils.toWei(p2Balance, 'ether');

    let message = web3.utils.soliditySha3(paymentContract, channelIdentifier, p1, p1Balance, p2, p2Balance);

    message = new Buffer(message.substr(2), 'hex');

    p1Signature = ethUtil.ecsign(message, p1PrivateKey);
    p2Signature = ethUtil.ecsign(message, p2PrivateKey);

    p1Signature = ethUtil.toRpcSig(p1Signature.v, p1Signature.r, p1Signature.s).toString("hex");
    p2Signature = ethUtil.toRpcSig(p2Signature.v, p2Signature.r, p2Signature.s).toString("hex");

    p1Signature = web3.utils.hexToBytes(p1Signature);
    p2Signature = web3.utils.hexToBytes(p2Signature);

    let data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "participant1_address", "type": "address" }, { "name": "participant1_balance", "type": "uint256" }, { "name": "participant2_address", "type": "address" }, { "name": "participant2_balance", "type": "uint256" }, { "name": "participant1_signature", "type": "bytes" }, { "name": "participant2_signature", "type": "bytes" } ], "name": "cooperativeSettle", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, [p1, p1Balance, p2, p2Balance, p1Signature, p2Signature]);

    let receipt = await sendSignedTx(p1, paymentContract, data, '0', p1PrivateKey);

    if (receipt && receipt.status) {
        return 'o98k'
    }

    return receipt;
}

//let failedAddress = new Array();

function main() {
    let idx = process.argv[2];
    idx = Number(idx);
    let p1 = refugees[idx][0];
    let p2 = refugees[idx+1][0];
    let p1PrivateKey = refugees[idx][1];
    let p2PrivateKey = refugees[idx+1][1];
    p1PrivateKey = new Buffer(p1PrivateKey, 'hex');
    p2PrivateKey = new Buffer(p2PrivateKey, 'hex');
    cooperativeSettle(p1, '0.000000000001', p2, '0', p1PrivateKey, p2PrivateKey).then(console.log);
}

const test = '/Users/vincent/Develop/dice2win_blockchain_sc/web3/test.json';

async function getChannelInfo() {
    let failCount = 0;
    for (let idx = 0; idx < 1000; idx += 2) {
        let p1 = refugees[idx][0];
        let p2 = refugees[idx+1][0];
        let channelIdentifier = await myContract.methods.getChannelIdentifier(p1, p2).call({from: p1});
        let channelInfo = await myContract.methods.channels(channelIdentifier).call();
        let channelState = channelInfo.state;
        if (channelState == '1') {
            failCount++;
            let address = new Array();
            address[0] = refugees[idx][0];
            address[1] = refugees[idx][1];
            address[2] = idx;
            failedAddress.push(address);
        }
        console.log(channelState);
    }
    fs.writeFileSync(test, JSON.stringify(failedAddress));
    console.log(failCount);
}

function settleFailedAddress () {
    let failedAddress = JSON.parse(fs.readFileSync(test));

    let idx = process.argv[2];
    idx = Number(idx);
    let index = failedAddress[idx][2];
    index = Number(index);
    let p1 = failedAddress[idx][0];
    let p2 = refugees[index+1][0];
    let p1PrivateKey = failedAddress[idx][1];
    let p2PrivateKey = refugees[index+1][1];
    p1PrivateKey = new Buffer(p1PrivateKey, 'hex');
    p2PrivateKey = new Buffer(p2PrivateKey, 'hex');
    cooperativeSettle(p1, '0.000000000001', p2, '0', p1PrivateKey, p2PrivateKey).then(console.log);
}

async function getFailedInfo () {
    let count = 0;
    let failedAddress = JSON.parse(fs.readFileSync(test));
    for (const address of failedAddress) {
        let p1 = address[0];
        let idx = address[2];
        idx = Number(idx);
        let p2 = refugees[idx+1][0];
        let channelIdentifier = await myContract.methods.getChannelIdentifier(p1, p2).call({from: p1});
        let channelInfo = await myContract.methods.channels(channelIdentifier).call();
        let channelState = channelInfo.state;
        //console.log(channelState);
        if (channelState == '1') {
            console.log(channelInfo);
            console.log(p1);
            count++;
        }
    }
    console.log(count);
}

//console.log(process.argv[2]);

//main();

//getChannelInfo();

//settleFailedAddress();

getFailedInfo();
