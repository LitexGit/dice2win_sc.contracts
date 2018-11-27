const Web3 = require('web3');
const BN = require('bn.js');

var web3 = new Web3('http://54.250.21.165:8545');  //rinkeby

var csprng = require("sodium").Random;

//console.log(typeof(csprng.randombytes_buf));

var bytes = csprng.rand(64);
console.log(bytes);
console.log(web3.utils.toHex(bytes));


function testRandom() {
    let r1 = web3.utils.randomHex(32);
    //console.log(r1);
    //let r2 = web3.utils.randomHex(32);
    //r2 = web3.utils.soliditySha3(r2, 'vbhqaohgboqjngf0q2ygoqw2hng');
    //console.log(r2);

    let r2 = '';
    for (let j = 0; j < 8; j++) {
        let rand = csprng.rand();
        rand = web3.utils.toHex(rand);
        r2 = r2 + rand.substr(2);
    }
    console.log(r2.length);
    r2 = '0x' + r2;
    console.log(r2);

    let r = web3.utils.soliditySha3(r1, r2);
    let moduloBN = new BN('10', 2);
    let diceBN = web3.utils.toBN(r).umod(moduloBN);
    let dice = diceBN.toNumber();
    return dice;
}

function main() {
    let count0 = 0;
    let count1 = 0;
    for(let i = 0; i < 10000; i++) {
        let r = testRandom();
        console.log(r);
        if ( r == 0) {
            count0++;
        } else if (r == 1) {
            count1++;
        }
    }
    console.log('0', count0);
    console.log('1', count1);
}

async function blockHashRandom() {
    let count0 = 0;
    let count1 = 0;
    //console.log(testRandom());
    for (let index = 2; index < 10003; index++) {
        let block = await web3.eth.getBlock(index);
        let r = block.hash;
        let moduloBN = new BN('10', 2);
        let diceBN = web3.utils.toBN(r).umod(moduloBN);
        let dice = diceBN.toNumber();
        console.log(dice);
        if (dice == 1) {
            count1++;
        } else if (dice == 0) {
            count0++
        }
    }
    console.log("0", count0);
    console.log("1", count1);
}

//main();