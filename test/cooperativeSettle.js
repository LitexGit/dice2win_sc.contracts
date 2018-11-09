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

    it("test open channel", async() => {
        //console.log(paymentContract.address);
        let result = await paymentContract.openChannel(participant1, participant2, 9);
        //console.log(result);
        let logs = result.logs;
        assert.equal(logs[0].event, "ChannelOpened");
        channelIdentifier = logs[0].args.channelIdentifier;
        console.log("channelIdentifier", channelIdentifier);
    })

    it("test deposit", async() => {
        let result = await paymentContract.setTotalDeposit(participant1, participant2, {from: participant1, value: web3.toWei(5, 'ether')});
        assert.equal(result.logs[0].event, "ChannelNewDeposit");
        //console.log(result.logs[0].args);

        result = await paymentContract.setTotalDeposit(participant2, participant1, {from: participant2, value: web3.toWei(5, 'ether')});
        assert.equal(result.logs[0].event, "ChannelNewDeposit");
        //console.log(result.logs[0].args);
    })

    it("test cooperative settle", async() => {
        let p1Balance = web3.toWei(2, 'ether');
        let p2Balance = web3.toWei(8, 'ether');
        // let message = paymentContract.address + channelIdentifier + participant1 + web3.toHex(p1Balance) + participant2 + web3.toHex(p2Balance);
        let message = paymentContract.address + channelIdentifier.substr(2) + participant1.substr(2) + web3.toHex(p1Balance).substr(2) + participant2.substr(2) + web3.toHex(p2Balance).substr(2);
        console.log("message", message);
        let messageHash = web3.sha3(message, {encoding: 'hex'});
        messageHash = new Buffer(messageHash.replace("0x", ""), "hex")
        let p1Signature = ethUtil.ecsign(messageHash, p1PrivateKey);
        let p2Signature = ethUtil.ecsign(messageHash, p2PrivateKey);
        console.log(p1Signature);

        p1Signature = ethUtil.toRpcSig(p1Signature.v, p1Signature.r, p1Signature.s).toString("hex");
        p2Signature = ethUtil.toRpcSig(p2Signature.v, p2Signature.r, p2Signature.s).toString("hex");

        console.log(p1Signature);
        console.log(p1Signature.length);
        console.log(p2Signature);
        console.log(p2Signature.length);
        //return;
        let result = await paymentContract.cooperativeSettle(participant1, p1Balance, participant2, p2Balance, p1Signature, p2Signature);

        console.log("cooperative settle result", result);
        assert.equal(result.logs[0].event, "CooperativeSettled");
    })
})