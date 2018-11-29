var Web3 = require('web3');
//var web3 = new Web3('http://13.112.69.103:8545');
var web3 = new Web3('http://39.96.8.192:8545');
const Tx = require('ethereumjs-tx')
const fs = require('fs');

web3.eth.isSyncing().then(console.log);

const billionaire = '0xa08105d7650fe007978a291ccfecbb321fc21ffe'
const privKey = '6A22D7D5D87EFC4A1375203B7E54FBCF35FAA84975891C5E3D12BE86C579A6E5'
const privateKey = new Buffer(privKey, 'hex');
var nonce;

let addressFile = '/Users/vincent/Develop/dice2win_blockchain_sc/web3/100PeopleKill.json';

let refugees = JSON.parse(fs.readFileSync(addressFile));
//console.log(refugees);

async function giveMoney(from, to) {    
    console.log("nonce", nonce);
    var txData = {
        nonce: web3.utils.toHex(nonce),
        gasLimit: web3.utils.toHex(25000),
        gasPrice: web3.utils.toHex(8e9), // 8 Gwei
        to: to,
        from: from,
        value: web3.utils.toHex(web3.utils.toWei('1.1', 'ether'))
    }
    const transaction = new Tx(txData)
    transaction.sign(privateKey)
    const serializedTx = transaction.serialize().toString('hex')
    let res = await web3.eth.sendSignedTransaction('0x' + serializedTx)
    //console.log("res", res);
    return res;
}

async function main() {
    nonce = await web3.eth.getTransactionCount(billionaire);

    for (let idx = 0; idx < refugees.length; idx++) {
        let account = refugees[idx][0];
        giveMoney(billionaire, account).then(console.log);
        nonce++;
    }
}

async function getBalance() {
    let failCount = 0;
    for (let idx = 0; idx < refugees.length; idx++) {
        let account = refugees[idx][0];
        let balance = await web3.eth.getBalance(account);
        console.log(idx, balance);
        if (balance == 0) {
            failCount++;
        }
    }
    console.log(failCount);
}

//main();

getBalance();


