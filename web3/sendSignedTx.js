const Tx = require('ethereumjs-tx')

const Web3 = require('web3');

var web3 = new Web3('http://54.250.21.165:8545');  //rinkeby
//const web3 = new Web3('ws://54.249.21.74:8546'); //mainnet
//const web3 = new Web3('http://54.249.21.74:8545'); //mainnet

async function sendSignedTx(from, to, data, value, privateKey) {
    var nonce = await web3.eth.getTransactionCount(from);

    var txData = {
        nonce: web3.utils.toHex(nonce),
        gasLimit: web3.utils.toHex(5000000),
        gasPrice: web3.utils.toHex(10e9), // 10 Gwei
        from: from,
        to: to,
        data: data,
        value: web3.utils.toHex(web3.utils.toWei(value, 'ether')) 
    }

    const transaction = new Tx(txData)
    transaction.sign(privateKey)
    const serializedTx = transaction.serialize().toString('hex')
    let res = await web3.eth.sendSignedTransaction('0x' + serializedTx)

    if (res && res.status) {
        return res;
    } else {
        return "0x0";
    }
}

module.exports = {
    sendSignedTx,
}