const Payment_ETH = artifacts.require("Payment_ETH");
const Dice_SC = artifacts.require("Dice_SC");
const ethUtil = require('ethereumjs-util');

contract("cooperativeSettle", async(accounts) => {
    let paymentContract; 
    let participant1;
    let participant2;
    let p1PrivateKey;
    let p2PrivateKey;
    let channelIdentifier;

    before(async() => {
        paymentContract = await Payment_ETH.deployed();
        participant1 = accounts[1];
        participant2 = accounts[2];
        p1PrivateKey = new Buffer('2fc8c9e1f94711b52b98edab123503519b6a8a982d38d0063857558db4046d89', 'hex');
        p2PrivateKey = new Buffer('d01a9956202e7b447ba7e00fe1b5ca8b3f777288da6c77831342dbd2cb022f8f', 'hex');

             
    })

    it("test web3 0.2 sha3", async() => {
        let p1Balance = 100;
        let p2Balance = 100;

        p1Balance = web3.toHex(p1Balance).substr(2);
        p2Balance = web3.toHex(p2Balance).substr(2);
        console.log("p1Balance", p1Balance);
        //let message = "0xAdEdDa3175460E11679fA7f24c75071FEA34422b" + "ac79fc1780cd5206c112b1e76d23deb12be3a27a6742b69c5f241ede6f8fd02d" + "a08105d7650Fe007978a291CcFECbB321fC21ffe" + p1Balance + "430195EBc99c0e2Fe3caA7B7dC8De8491Cf04fA9" + p2Balance;

        let message = "0xAdEdDa3175460E11679fA7f24c75071FEA34422b" + web3.toHex(100).substr(2);
        console.log("message", message);
        let messageHash = web3.sha3(message, {encoding: 'hex'});
        console.log("messageHash", messageHash);
    })

    // it("test open channel", async() => {
    //     //console.log(paymentContract.address);
    //     let result = await paymentContract.openChannel(participant1, participant2, 9, {from: participant1, value: web3.toWei(5, 'ether')});
    //     //console.log(result);
    //     let logs = result.logs;
    //     assert.equal(logs[0].event, "ChannelOpened");
    //     channelIdentifier = logs[0].args.channelIdentifier;
    //     console.log("channelIdentifier", channelIdentifier);
    // })

    // it("test deposit", async() => {
    //     let result = await paymentContract.setTotalDeposit(participant2, participant1, {from: participant2, value: web3.toWei(5, 'ether')});
    //     assert.equal(result.logs[0].event, "ChannelNewDeposit");
    //     //console.log(result.logs[0].args);
    // })

    // it("test cooperative settle", async() => {
    //     let p1Balance = web3.toWei(2, 'ether');
    //     let p2Balance = web3.toWei(8, 'ether');
    //     return;
    //     let message = paymentContract.address + channelIdentifier.substr(2) + participant1.substr(2) + web3.toHex(p1Balance).substr(2) + participant2.substr(2) + web3.toHex(p2Balance).substr(2);
    //     console.log("message", message);
    //     let messageHash = web3.sha3(message, {encoding: 'hex'});
    //     messageHash = new Buffer(messageHash.replace("0x", ""), "hex")
    //     let p1Signature = ethUtil.ecsign(messageHash, p1PrivateKey);
    //     let p2Signature = ethUtil.ecsign(messageHash, p2PrivateKey);
    //     console.log(p1Signature);

    //     p1Signature = ethUtil.toRpcSig(p1Signature.v, p1Signature.r, p1Signature.s).toString("hex");
    //     p2Signature = ethUtil.toRpcSig(p2Signature.v, p2Signature.r, p2Signature.s).toString("hex");

    //     console.log(p1Signature);
    //     console.log(p1Signature.length);
    //     console.log(p2Signature);
    //     console.log(p2Signature.length);
    //     //return;
    //     let result = await paymentContract.cooperativeSettle(participant1, p1Balance, participant2, p2Balance, p1Signature, p2Signature);

    //     console.log("cooperative settle result", result);
    //     assert.equal(result.logs[0].event, "CooperativeSettled");
    // })
})