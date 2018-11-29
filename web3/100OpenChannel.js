var Web3 = require('web3');
var web3 = new Web3('http://39.96.8.192:8545');
const fs = require('fs');
const {sendSignedTx} = require('./sendSignedTx');
const Tx = require('ethereumjs-tx')


web3.eth.isSyncing().then(console.log);

const paymentContract = "0x4B70A4d4d885cb397E2bD5b0A77DA9bD3EEb033e";

const window = 3;
const addressFile = '/Users/vincent/Develop/dice2win_blockchain_sc/web3/100PeopleKill.json';
const refugees = JSON.parse(fs.readFileSync(addressFile));

let serverAddress = "0x633177eeE5dB5a2c504e0AE6044d20a9287909f9";
let serverPrivateKey = "4E9866ADC11E202E6B47CC087B3776B1F460CECD53086007538FB2D207FE54A6";

const billionaire = '0xa08105d7650fe007978a291ccfecbb321fc21ffe'
const privKey = Buffer.from('6A22D7D5D87EFC4A1375203B7E54FBCF35FAA84975891C5E3D12BE86C579A6E5', 'hex');

async function openChannel(p1, p2, window, amount, privateKey, nonce) {
    let data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "participant", "type": "address" }, { "name": "partner", "type": "address" }, { "name": "settle_window", "type": "uint256" } ], "name": "openChannel", "outputs": [], "payable": true, "stateMutability": "payable", "type": "function" }, [p1, p2, window]);

    let receipt = await sendSignedTx(p1, paymentContract, data, amount, privateKey);

    if (true) {
        data = web3.eth.abi.encodeFunctionCall({ "constant": false, "inputs": [ { "name": "participant", "type": "address" }, { "name": "partner", "type": "address" } ], "name": "setTotalDeposit", "outputs": [], "payable": true, "stateMutability": "payable", "type": "function" }, [serverAddress, p1]);

        let txData = {
            nonce: nonce,
            gasLimit: web3.utils.toHex(5000000),
            gasPrice: web3.utils.toHex(2e9), // 5 Gwei
            from: billionaire,
            to: paymentContract,
            data: data,
            value: web3.utils.toHex(web3.utils.toWei('1', 'ether')) 
        }
    
        const transaction = new Tx(txData)
        transaction.sign(privKey)
        const serializedTx = transaction.serialize().toString('hex')
        receipt = await web3.eth.sendSignedTransaction('0x' + serializedTx)

        //receipt = await sendSignedTx(billionaire, paymentContract, data, '1', privKey);
        console.log(receipt);

        if (receipt && receipt.status) {
            return 'o98k';
        }
        
        return 'deposit failed';
    }

    return 'open failed';

    //console.log(receipt);
}

async function main() {
    let nonce = await web3.eth.getTransactionCount(billionaire);

    for (let idx = 4; idx < 100; idx++) {
        let p = refugees[idx][0];
        let bb = await web3.eth.getBalance(p);
        console.log(bb);
        let privateKey = refugees[idx][1];
        privateKey = new Buffer(privateKey, 'hex');
        openChannel(p, serverAddress, window, '1', privateKey, nonce).then(console.log);
        nonce++;
    }
}

main();

