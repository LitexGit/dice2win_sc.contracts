'use strict';
console.log('Generator Start..............');
const num = 100;
const secp256k1 = require("secp256k1/elliptic");
const createKeccakHash = require("keccak");
const crypto = require('crypto');
const fs = require('fs');
const ethers = require('ethers');

const Web3 = require('web3');
const web3 = new Web3('http://39.96.8.192:8545');

// 地址转换
function toChecksumAddress(address) {
    address = address.toLowerCase().replace('0x', ''); 
    var hash = createKeccakHash('keccak256').update(address).digest('hex'); 
    var ret = '0x'; 
    for (var i = 0; i < address.length; i++) {   
        if (parseInt(hash[i], 16) >= 8) {     
            ret += address[i].toUpperCase();   
        } else {     
            ret += address[i];   
        } 
    } 
    return ret;
}

let addressData = new Array();

for (var i = 0; i < num; i++) {
    // 生成私钥
    let privateKey = crypto.randomBytes(32);
    // 生成公钥
    const publicKey = secp256k1.publicKeyCreate(privateKey, false).slice(1);
    // 生成地址
    const address = createKeccakHash("keccak256").update(publicKey).digest().slice(-20);
    const normAddress = toChecksumAddress(address.toString('hex'));
    // 查看结果
    console.log(privateKey.toString('hex'));
    console.log(normAddress);

    privateKey = privateKey.toString('hex');

    let keyStore = web3.eth.accounts.encrypt(privateKey, '88888888');

    let addressKey = new Array();
    addressKey[0] = normAddress;
    addressKey[1] = privateKey;
    addressKey[2] = keyStore;

    addressData[i] = addressKey;
}

//let testData = [['a', 'b'], ['c', 'd']];

let testFile = '/Users/vincent/Develop/dice2win_blockchain_sc/web3/100PeopleKill.json';

fs.writeFileSync(testFile, JSON.stringify(addressData));

// let res = JSON.parse(fs.readFileSync(testFile));
// console.log(res);