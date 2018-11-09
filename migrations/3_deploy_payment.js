var Dice_SC = artifacts.require("Dice_SC");
var Payment_ETH = artifacts.require("./Payment_ETH.sol");

module.exports = async function(deployer) {
    let instance = Dice_SC.deployed();
    deployer.deploy(Payment_ETH, instance.address, 8, 10);
};
