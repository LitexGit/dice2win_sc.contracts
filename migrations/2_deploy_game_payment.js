var Dice_SC = artifacts.require("./Dice_SC.sol");
var Payment_ETH = artifacts.require("./Payment_ETH.sol");

module.exports = function(deployer) {
  deployer.deploy(Dice_SC, 6);
  // deployer.deploy(Dice_SC, 6).then(function () {
  //     deployer.deploy(Payment_ETH, Dice_SC.address, 8, 10);
  // });
};
