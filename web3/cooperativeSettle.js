const Web3 = require('web3');

var web3 = new Web3('http://54.250.21.165:8545');  //rinkeby
//const web3 = new Web3('ws://54.249.21.74:8546'); //mainnet
//const web3 = new Web3('http://54.249.21.74:8545'); //mainnet

//const Tx = require('ethereumjs-tx')
const ethUtil = require('ethereumjs-util');
const {sendSignedTx} = require('./sendSignedTx');
const {myEcsign} = require('./myEcsign');

const paymentContract = "0x4B70A4d4d885cb397E2bD5b0A77DA9bD3EEb033e";
const settleWindow = 3;

const p1 = "0xa08105d7650Fe007978a291CcFECbB321fC21ffe";
const p1PrivateKey = new Buffer('6A22D7D5D87EFC4A1375203B7E54FBCF35FAA84975891C5E3D12BE86C579A6E5', 'hex');

const p2 = "0x430195EBc99c0e2Fe3caA7B7dC8De8491Cf04fA9";
const p2PrivateKey = new Buffer('C84795FFCFEA582F50AB364A76270A3131826F4F01DC592F3335B71CA31E939B', 'hex');

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

    let message = web3.utils.soliditySha3(paymentContract, channelIdentifier, p1, p1Balance, p2, p2Balance);
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

async function setUp () {
    let receipt = await openChannel(p1, p2, 3, '0.05');
    
    if (receipt == '0x0') {
        console.log("open channel failed");
        return;
    }

    let channelIdentifier = receipt.logs[0].data.slice(0, 66)

    console.log("open channel succ", receipt);
    console.log("channelIdentifier", channelIdentifier);

    receipt = await setTotalDeposit(p2, p1, '0.05', p2PrivateKey);

    if (receipt == '0x0') {
        console.log("p2 deposit failed");
        return;
    }

    console.log("p2 deposit succ", receipt);
    
    return channelIdentifier;

    // let receipt = await cooperativeSettle(p1, '0.2', p2, '0.8', channelIdentifier);
    // console.log(receipt);
}

async function testCooperativeSettle(p1Balance, p2Balance) {
    let channelIdentifier = await setUp();
    let receipt = await cooperativeSettle(p1, p1Balance, p2, p2Balance, channelIdentifier);
    console.log(receipt);
}

async function testCloseChannelWithNonlock(p1Balance, p2Balance) {
    let channelIdentifier = await setUp();
    //let channelIdentifier = '0xe99d15a2b07746beb6b0144c75ad2ecac908663fad97090b39e145508e5abb0c';
    let p2TransferredAmount = web3.utils.toWei(p1Balance, 'ether');
    let p2BalanceHash = web3.utils.soliditySha3(p2TransferredAmount, 0, 0);
    let messageHash = web3.utils.soliditySha3(paymentContract, channelIdentifier, p2BalanceHash, 1);
    let signature = myEcsign(messageHash, p2PrivateKey);
    let data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "partner", "type": "address" }, { "name": "balanceHash", "type": "bytes32" }, { "name": "nonce", "type": "uint256" }, { "name": "signature", "type": "bytes" } ], "name": "closeChannel", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, [p2, p2BalanceHash, 1, signature]);
    let receipt = await sendSignedTx(p1, paymentContract, data, '0', p1PrivateKey);

    if (receipt && receipt.status) {
        console.log('p1 close channel success', receipt);
    } else {
        return;
    }

    let p1TransferredAmount = web3.utils.toWei(p2Balance, 'ether');
    let p1BalanceHash = web3.utils.soliditySha3(p1TransferredAmount, 0, 0);
    messageHash = web3.utils.soliditySha3(paymentContract, channelIdentifier, p1BalanceHash, 1);
    signature = myEcsign(messageHash, p1PrivateKey);
    data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "closing", "type": "address" }, { "name": "balanceHash", "type": "bytes32" }, { "name": "nonce", "type": "uint256" }, { "name": "signature", "type": "bytes" } ], "name": "nonclosingUpdateBalanceProof", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, [p1, p1BalanceHash, 1, signature]);
    receipt = await sendSignedTx(p2, paymentContract, data, '0', p2PrivateKey);

    if (receipt && receipt.status) {
        console.log('p2 close channel success', receipt);
    } else {
        return;
    }
}

async function testSettleChannelWithNonlock(p1Balance, p2Balance) {
    let data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "participant1", "type": "address" }, { "name": "participant1_transferred_amount", "type": "uint256" }, { "name": "participant1_locked_amount", "type": "uint256" }, { "name": "participant1_lock_id", "type": "uint256" }, { "name": "participant2", "type": "address" }, { "name": "participant2_transferred_amount", "type": "uint256" }, { "name": "participant2_locked_amount", "type": "uint256" }, { "name": "participant2_lock_id", "type": "uint256" } ], "name": "settleChannel", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, [p1, web3.utils.toWei(p2Balance, 'ether'), 0, 0, p2, web3.utils.toWei(p1Balance, 'ether'), 0, 0]);

    let receipt = await sendSignedTx(p1, paymentContract, data, '0', p1PrivateKey);
    if (receipt && receipt.status) {
        console.log('p1 close channel success', receipt);
    } else {
        console.log('p1 settle channel failed',receipt);
        return;
    }
}

async function testCloseChannelWithLock(p1Balance, p1LockedBalance, p2Balance, p2LockedBalance) {
    let channelIdentifier = await setUp();
    //let channelIdentifier = '0xe99d15a2b07746beb6b0144c75ad2ecac908663fad97090b39e145508e5abb0c';
    let p2TransferredAmount = web3.utils.toWei(p1Balance, 'ether');
    let p2LockedAmount = web3.utils.toWei(p1LockedBalance, 'ether');
    let p2BalanceHash = web3.utils.soliditySha3(p2TransferredAmount, p2LockedAmount, 1);
    let messageHash = web3.utils.soliditySha3(paymentContract, channelIdentifier, p2BalanceHash, 1);
    let signature = myEcsign(messageHash, p2PrivateKey);
    let data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "partner", "type": "address" }, { "name": "balanceHash", "type": "bytes32" }, { "name": "nonce", "type": "uint256" }, { "name": "signature", "type": "bytes" } ], "name": "closeChannel", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, [p2, p2BalanceHash, 1, signature]);
    let receipt = await sendSignedTx(p1, paymentContract, data, '0', p1PrivateKey);

    if (receipt && receipt.status) {
        console.log('p1 close channel success', receipt);
    } else {
        return;
    }

    let p1TransferredAmount = web3.utils.toWei(p2Balance, 'ether');
    let p1LockedAmount = web3.utils.toWei(p2LockedBalance, 'ether');
    let p1BalanceHash = web3.utils.soliditySha3(p1TransferredAmount, p1LockedAmount, 1);
    messageHash = web3.utils.soliditySha3(paymentContract, channelIdentifier, p1BalanceHash, 1);
    signature = myEcsign(messageHash, p1PrivateKey);
    data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "closing", "type": "address" }, { "name": "balanceHash", "type": "bytes32" }, { "name": "nonce", "type": "uint256" }, { "name": "signature", "type": "bytes" } ], "name": "nonclosingUpdateBalanceProof", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, [p1, p1BalanceHash, 1, signature]);
    receipt = await sendSignedTx(p2, paymentContract, data, '0', p2PrivateKey);

    if (receipt && receipt.status) {
        console.log('p2 close channel success', receipt);
    } else {
        return;
    }
}

async function testSettleChannelWithLock(p2Balance, p2LockedBalance, p1Balance, p1LockedBalance) {
    let data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "participant1", "type": "address" }, { "name": "participant1_transferred_amount", "type": "uint256" }, { "name": "participant1_locked_amount", "type": "uint256" }, { "name": "participant1_lock_id", "type": "uint256" }, { "name": "participant2", "type": "address" }, { "name": "participant2_transferred_amount", "type": "uint256" }, { "name": "participant2_locked_amount", "type": "uint256" }, { "name": "participant2_lock_id", "type": "uint256" } ], "name": "settleChannel", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, [p1, web3.utils.toWei(p2Balance, 'ether'), web3.utils.toWei(p2LockedBalance, 'ether'), 1, p2, web3.utils.toWei(p1Balance, 'ether'), web3.utils.toWei(p1LockedBalance, 'ether'), 1]);

    let receipt = await sendSignedTx(p1, paymentContract, data, '0', p1PrivateKey);
    if (receipt && receipt.status) {
        console.log('p1 settle channel success', receipt);
    } else {
        console.log('p1 settle channel failed',receipt);
        return;
    }
}

async function testUnlock(lockIdentifier) {
    let data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "participant1", "type": "address" }, { "name": "participant2", "type": "address" }, { "name": "lockIdentifier", "type": "bytes32" } ], "name": "unlock", "outputs": [], "payable": false, "stateMutability": "nonpayable", "type": "function" }, [p1, p2, lockIdentifier]);

    let receipt = await sendSignedTx(p1, paymentContract, data, '0', p1PrivateKey);

    console.log("unlock receipt", receipt);
}

web3.eth.getBalance(p1).then(console.log);


//testCooperativeSettle('0.02', '0.08');

//testCloseChannelWithNonlock();

//testSettleChannelWithNonlock();

//testCloseChannelWithLock('0.05', '0.01', '0.02', '0.06');

//testSettleChannelWithLock('0.02', '0.06', '0.05', '0.01');

//testUnlock('0x30c84fef13bda51b34671f05bfc5b7b108913b729dc6e4a49a2d430cc03ef47a');






//let testHash = web3.utils.soliditySha3("0xAdEdDa3175460E11679fA7f24c75071FEA34422b", "0xac79fc1780cd5206c112b1e76d23deb12be3a27a6742b69c5f241ede6f8fd02d", "0xa08105d7650Fe007978a291CcFECbB321fC21ffe", 100, "0x430195EBc99c0e2Fe3caA7B7dC8De8491Cf04fA9", 100);
 
// let solidityHash = web3.utils.soliditySha3("0xAdEdDa3175460E11679fA7f24c75071FEA34422b", 100);
// let shaHash = web3.utils.sha3("0xAdEdDa3175460E11679fA7f24c75071FEA34422b0000000000000000000000000000000000000000000000000000000000000064");
// //ac79fc1780cd5206c112b1e76d23deb12be3a27a6742b69c5f241ede6f8fd02d
// console.log("solidityHash", solidityHash);
// console.log("shaHash", shaHash);