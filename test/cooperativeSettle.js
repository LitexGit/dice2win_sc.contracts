const { expectRevert, time, expectEvent } = require("openzeppelin-test-helpers");
const Payment_ETH = artifacts.require("Payment_ETH");
const Dice_SC = artifacts.require("Dice_SC");
const { myEcsign } = require("./utils/helper");
const { getPrivateKeys } = require("./utils/keys");

const { bytesToHex, toBN, toHex, sha3, toWei, soliditySha3 } = web3.utils;

contract("cooperativeSettle", async accounts => {
  let gameContract;
  let paymentContract;
  let participant1;
  let participant2;
  let p1PrivateKey;
  let p2PrivateKey;
  let channelIdentifier;

  before(async () => {
    gameContract = await Dice_SC.new(6);
    paymentContract = await Payment_ETH.new(gameContract.address, 1, 10);
    participant1 = accounts[1];
    participant2 = accounts[2];
    let privateKeys = await getPrivateKeys();
    p1PrivateKey = privateKeys[1];
    p2PrivateKey = privateKeys[2];
    console.log(participant1, p1PrivateKey.toString("hex"));
    console.log(participant2, p2PrivateKey.toString("hex"));
  });

  it("test open channel", async () => {
    //console.log(paymentContract.address);
    let depositAmount = toWei("5", "ether");
    console.log("depositAmount", depositAmount);
    let result = await paymentContract.openChannel(participant1, participant2, 9, { from: participant1, value: depositAmount });
    //console.log(result);
    let logs = result.logs;
    expectEvent.inLogs(result.logs, "ChannelOpened", { participant1, participant2, amount: depositAmount });

    channelIdentifier = logs[0].args.channelIdentifier;
    console.log("channelIdentifier", channelIdentifier);
  });

  it("test deposit", async () => {
    let depositAmount = toWei("5", "ether");
    let result = await paymentContract.setTotalDeposit(participant2, participant1, { from: participant2, value: depositAmount });

    expectEvent.inLogs(result.logs, "ChannelNewDeposit", { channel_identifier: channelIdentifier, new_deposit: depositAmount });
  });

  it("test cooperative settle", async () => {
    let p1Balance = toWei("2", "ether");
    let p2Balance = toWei("8", "ether");
    // return;
    let messageHash = soliditySha3(
      { v: paymentContract.address, t: "address" },
      { v: channelIdentifier, t: "bytes32" },
      { v: participant1, t: "address" },
      { v: p1Balance, t: "uint256" },
      { v: participant2, t: "address" },
      { v: p2Balance, t: "uint256" }
    );

    let p1Signature = myEcsign(messageHash, p1PrivateKey);
    let p2Signature = myEcsign(messageHash, p2PrivateKey);

    let result = await paymentContract.cooperativeSettle(participant1, p1Balance, participant2, p2Balance, p1Signature, p2Signature);

    expectEvent.inLogs(result.logs, "CooperativeSettled", {
      channelIdentifier,
      participant1_address: participant1,
      participant2_address: participant2,
      participant1_balance: p1Balance,
      participant2_balance: p2Balance
    });
  });

  it("test force close channel without transfer", async () => {
    let depositAmount = toWei("5", "ether");
    let result = await paymentContract.openChannel(participant1, participant2, 9, { from: participant1, value: depositAmount });
    channelIdentifier = result.logs[0].args.channelIdentifier;

    // force-close channel
    let closeResult = await paymentContract.closeChannel(participant2, "0x0", "0x0", "0x0", { from: participant1 });

    for (let i = 0; i < 9; i++) {
      await time.advanceBlock();
    }

    // settle channel
    let settleResult = await paymentContract.settleChannel(participant1, 0, 0, 0, participant2, 0, 0, 0);

    expectEvent.inLogs(settleResult.logs, "ChannelSettled", {
      channelIdentifier,
      participant1,
      participant2,
      transferToParticipant1Amount: depositAmount,
      transferToParticipant2Amount: "0"
    });
  });

  it("test force close channel with transfer", async () => {
    let depositAmount = toWei("5", "ether");
    let result = await paymentContract.openChannel(participant1, participant2, 9, { from: participant1, value: depositAmount });
    channelIdentifier = result.logs[0].args.channelIdentifier;

    // participant2 transfer info
    let p2TransferAmount = 1;
    let p2LockedAmount = 0;
    let p2LockID = 0;
    let p2BalanceHash = soliditySha3({ v: p2TransferAmount, t: "uint256" }, { v: p2LockedAmount, t: "uint256" }, { v: p2LockID, t: "uint256" });
    let p2Nonce = 1;
    let p2MessageHash = soliditySha3(
      { v: paymentContract.address, t: "address" },
      { v: channelIdentifier, t: "bytes32" },
      { v: p2BalanceHash, t: "bytes32" },
      { v: p2Nonce, t: "uint256" }
    );
    let p2Signature = myEcsign(p2MessageHash, p2PrivateKey);

    // participant1 transfer info
    let p1TransferAmount = 10;
    let p1LockedAmount = 0;
    let p1LockID = 0;
    let p1BalanceHash = soliditySha3({ v: p1TransferAmount, t: "uint256" }, { v: p1LockedAmount, t: "uint256" }, { v: p1LockID, t: "uint256" });
    let p1Nonce = 1;
    let p1MessageHash = soliditySha3(
      { v: paymentContract.address, t: "address" },
      { v: channelIdentifier, t: "bytes32" },
      { v: p1BalanceHash, t: "bytes32" },
      { v: p1Nonce, t: "uint256" }
    );
    let p1Signature = myEcsign(p1MessageHash, p1PrivateKey);

    // expected settle result
    let transferToParticipant1Amount = toBN(depositAmount)
      .add(toBN(p2TransferAmount))
      .sub(toBN(p1TransferAmount));
    transferToParticipant1Amount = transferToParticipant1Amount.isNeg() ? toBN(0) : transferToParticipant1Amount;
    let transferToParticipant2Amount = toBN(depositAmount).sub(transferToParticipant1Amount);
    transferToParticipant1Amount = transferToParticipant1Amount.toString();
    transferToParticipant2Amount = transferToParticipant2Amount.toString();

    // participant1 force close channel
    let closeResult = await paymentContract.closeChannel(participant2, p2BalanceHash, p2Nonce, p2Signature, { from: participant1 });

    // participant2 update proof
    let updateProofResult = await paymentContract.nonclosingUpdateBalanceProof(participant1, p1BalanceHash, p1Nonce, p1Signature, {
      from: participant2
    });

    for (let i = 0; i < 9; i++) {
      await time.advanceBlock();
    }

    // settle channel
    let settleResult = await paymentContract.settleChannel(
      participant1,
      p1TransferAmount,
      p1LockedAmount,
      p1LockID,
      participant2,
      p2TransferAmount,
      p2LockedAmount,
      p2LockID
    );

    expectEvent.inLogs(settleResult.logs, "ChannelSettled", {
      channelIdentifier,
      participant1,
      participant2,
      transferToParticipant1Amount,
      transferToParticipant2Amount
    });
  });

  it("test force close channel with lock", async () => {
    let depositAmount = toWei("5", "ether");
    let result = await paymentContract.openChannel(participant1, participant2, 9, { from: participant1, value: depositAmount });
    channelIdentifier = result.logs[0].args.channelIdentifier;

    //participant2 transfer info
    let p2TransferAmount = 1 + "";
    let p2LockedAmount = 5 + "";
    let p2LockID = 1;
    let p2BalanceHash = soliditySha3({ v: p2TransferAmount, t: "uint256" }, { v: p2LockedAmount, t: "uint256" }, { v: p2LockID, t: "uint256" });
    let p2Nonce = 2;
    let p2MessageHash = soliditySha3(
      { v: paymentContract.address, t: "address" },
      { v: channelIdentifier, t: "bytes32" },
      { v: p2BalanceHash, t: "bytes32" },
      { v: p2Nonce, t: "uint256" }
    );
    let p2Signature = myEcsign(p2MessageHash, p2PrivateKey);

    //participant1 transfer info
    let p1TransferAmount = 20 + "";
    let p1LockedAmount = 10 + "";
    let p1LockID = 1;
    let p1BalanceHash = soliditySha3({ v: p1TransferAmount, t: "uint256" }, { v: p1LockedAmount, t: "uint256" }, { v: p1LockID, t: "uint256" });
    let p1Nonce = 2;
    let p1MessageHash = soliditySha3(
      { v: paymentContract.address, t: "address" },
      { v: channelIdentifier, t: "bytes32" },
      { v: p1BalanceHash, t: "bytes32" },
      { v: p1Nonce, t: "uint256" }
    );
    let p1Signature = myEcsign(p1MessageHash, p1PrivateKey);

    // ongoing game info
    let betMask = 1;
    let modulo = 2;
    let initiatorR = "0x0000000000000000000000000000000000000000000000000000000000000001";
    let acceptorR = "0x0000000000000000000000000000000000000000000000000000000000000002";
    let initiatorHashR = soliditySha3({ v: initiatorR, t: "bytes32" });
    let gameHash1 = soliditySha3(
      { v: gameContract.address, t: "address" },
      { v: channelIdentifier, t: "bytes32" },
      { v: p1LockID, t: "uint256" },
      { v: betMask, t: "uint256" },
      { v: modulo, t: "uint256" },
      { v: participant1, t: "address" },
      { v: participant2, t: "address" },
      { v: initiatorHashR, t: "bytes32" }
    );
    let initiatorSignature = bytesToHex(myEcsign(gameHash1, p1PrivateKey));
    let gameHash2 = soliditySha3(
      { v: gameContract.address, t: "address" },
      { v: channelIdentifier, t: "bytes32" },
      { v: p1LockID, t: "uint256" },
      { v: betMask, t: "uint256" },
      { v: modulo, t: "uint256" },
      { v: participant1, t: "address" },
      { v: participant2, t: "address" },
      { v: initiatorHashR, t: "bytes32" },
      { v: initiatorSignature, t: "bytes" },
      { v: acceptorR, t: "bytes32" }
    );
    let acceptorSignature = myEcsign(gameHash2, p2PrivateKey);

    // expected settle result
    let totalAmountBN = toBN(depositAmount)
      .sub(toBN(p2LockedAmount))
      .sub(toBN(p1LockedAmount));
    let transferToParticipant1Amount = totalAmountBN.add(toBN(p2TransferAmount)).sub(toBN(p1TransferAmount));
    transferToParticipant1Amount = transferToParticipant1Amount.isNeg() ? toBN(0) : transferToParticipant1Amount;
    transferToParticipant1Amount = transferToParticipant1Amount.add(toBN(p2LockedAmount));
    let transferToParticipant2Amount = totalAmountBN.sub(transferToParticipant1Amount);
    transferToParticipant1Amount = transferToParticipant1Amount.toString();
    transferToParticipant2Amount = transferToParticipant2Amount.toString();

    // participant1 force close channel
    let closeResult = await paymentContract.closeChannel(participant2, p2BalanceHash, p2Nonce, p2Signature, { from: participant1 });
    // participant1 submit game proof
    let gameResult = await gameContract.initiatorSettle(
      channelIdentifier,
      p1LockID,
      betMask,
      modulo,
      participant1,
      participant2,
      initiatorHashR,
      initiatorSignature,
      acceptorR,
      acceptorSignature,
      initiatorR,
      { from: participant1 }
    );
    // participant2 update transfer proof
    let updateProofResult = await paymentContract.nonclosingUpdateBalanceProof(participant1, p1BalanceHash, p1Nonce, p1Signature, {
      from: participant2
    });
    expectEvent.inLogs(gameResult.logs, "InitiatorSettled", {
      initiator: participant1,
      acceptor: participant2
    });
    let winner = gameResult.logs[0].args.winner;
    console.log("winner is", winner == participant1 ? "user" : "provider");

    for (let i = 0; i < 9; i++) {
      await time.advanceBlock();
    }

    // settle channel
    let settleResult = await paymentContract.settleChannel(
      participant1,
      p1TransferAmount,
      p1LockedAmount,
      p1LockID,
      participant2,
      p2TransferAmount,
      p2LockedAmount,
      p2LockID
    );
    expectEvent.inLogs(settleResult.logs, "ChannelSettled", {
      channelIdentifier,
      participant1,
      participant2,
      transferToParticipant1Amount,
      transferToParticipant2Amount
    });
    let lockIdentifier = settleResult.logs[0].args.lockedIdentifier;
    console.log("lockIdentifier", lockIdentifier);

    // unlock channel
    let unlockResult = await paymentContract.unlock(participant1, participant2, lockIdentifier);
    if (winner === participant1) {
      expectEvent.inLogs(unlockResult.logs, "ChannelLockedSent", {
        beneficiary: winner,
        amount: p2LockedAmount
      });
      expectEvent.inLogs(unlockResult.logs, "ChannelLockedReturn", {
        beneficiary: winner,
        amount: p1LockedAmount
      });
    } else {
      expectEvent.inLogs(unlockResult.logs, "ChannelLockedSent", {
        beneficiary: winner,
        amount: p1LockedAmount
      });
      expectEvent.inLogs(unlockResult.logs, "ChannelLockedReturn", {
        beneficiary: winner,
        amount: p2LockedAmount
      });
    }
  });
});
