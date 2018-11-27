const Web3 = require('web3');
const BN = require('bn.js');
let web3 = new Web3('ws://52.69.91.220:8546');


function diceResult(reveal, blockHash, modulo) {
    let entropy = web3.utils.soliditySha3(reveal, blockHash);
    let moduloBN;
    if (modulo == 2) {
      moduloBN = new BN('10', 2);
    } else if (modulo == 6) {
      moduloBN = new BN('110', 2);
    } else if (modulo == 36) {
      moduloBN = new BN('100100', 2);
    } else if (modulo == 100) {
      moduloBN = new BN('1100100', 2);
    }
    let diceBN = web3.utils.toBN(entropy).umod(moduloBN);
    let dice = diceBN.toNumber();
    let result = getBetResult(dice, modulo);
    return result;
  }

function getBetResult(moduloResult, modulo) {
    switch (modulo) {
        case 2:
            return moduloResult;
        case 6:    
            return moduloResult + 1;
        case 36:
            moduloResult++;
            let firstDice = Math.ceil(moduloResult/6);
            let secondDice = moduloResult - (firstDice - 1)*6
            return [firstDice, secondDice];
        case 100:
            return moduloResult + 1;
    }
}

let test = diceResult('0xf014df40d15a73d236452685b7e375161c73d5acd9062149726a495e13d3fd89', '0x89c7f0c812feca9b29500e806d4942eec0b618f1104089112a569653ddf77508', 6)
console.log(test);