
const num = 100;
const secp256k1 = require("secp256k1/elliptic");
const createKeccakHash = require("keccak");
const crypto = require('crypto');
const fs = require('fs');
const ethers = require('ethers');

const Web3 = require('web3');
const web3 = new Web3('http://39.96.8.192:8545');

let addressFile = '/Users/vincent/Develop/dice2win_blockchain_sc/web3/100PeopleKill.json';
let refugees = JSON.parse(fs.readFileSync(addressFile));

let testFile = '/Users/vincent/Develop/dice2win_blockchain_sc/web3/100PeopleKillNew.json';

let addressData = new Array();
async function main() {
    for (let idx = 0; idx < refugees.length; idx++) {
        let privateKey = refugees[idx][1];
        let wallet = new ethers.Wallet(privateKey);
        let keyStore = await wallet.encrypt('88888888');
        console.log(idx);
        console.log(keyStore);

        let address = new Array();
        address[0] = refugees[idx][0];
        address[1] = refugees[idx][1];
        address[2] = keyStore;

        addressData[idx] = address;
    }

    fs.writeFileSync(testFile, JSON.stringify(addressData));
}

main();