const Web3 = require('web3');

//var web3 = new Web3('ws://54.250.21.165:8546');  //rinkeby
var web3 = new Web3('ws://39.96.8.192:8546');  //rinkeby

const contract = '0x4B70A4d4d885cb397E2bD5b0A77DA9bD3EEb033e';
const openChannelTopic = '0xf43f324498a3f4dd1b8ffef6d6af08dc193c1707f7f669feacf8ff4e50fbdd3a';
const depositTopic = '0x113a0fdf149217a625d03ac9f8bced2df681175da3116443b5b79ebb4bff647d';
const cooperativeSettleTopic = '0x80d535f65eaeecda87c8d9ab95f90c7eae1215a773770f6f6860de554f855e44';
const settleTopic = '0x35cfe29560dd5d435f75b2510c0c33105026bcc8f028eba06edb142ebd1dfef7';
const unlockSentTopic = '0x088f29dc1537a391127b5577fa9923ab8a3738bf3f4160d5c0ca098acec24a3e';
const unlockReturnTopic = '0x06fcb8f03d7121545713132681b1bf54af1ff9fcab01f34b23a6745f5ddbbce5';

let gambler = '0x430195EBc99c0e2Fe3caA7B7dC8De8491Cf04fA9';
let gamblers = new Array();
gamblers.push(gambler.toLowerCase());
gambler = '0xa08105d7650Fe007978a291CcFECbB321fC21ffe';
gamblers.push(gambler.toLowerCase());

async function getRelatedTransferFromBlock(block) {
    let transfers = new Array();

    block = await web3.eth.getBlock(block);
    for (const txHash of block.transactions) {
        let receipt = await web3.eth.getTransactionReceipt(txHash);
        if (receipt) {
            //filter related transfer
            let kind = 0;
            if ((gamblers.indexOf(receipt.from.toLowerCase())!=-1) && receipt.to && (contract.toLowerCase() != receipt.to.toLowerCase())) {
                receipt.status ? kind = 1 : kind = -1; //normal transfer tx of send
            }
            if (receipt.to && gamblers.indexOf(receipt.to.toLowerCase())!=-1) {
                receipt.status ? kind = 2 : kind = -2; //normal transfer tx of receive
            }

            if (kind) {
                let tx = await web3.eth.getTransaction(txHash);
                if (tx.value != 0) {         
                    transfers.push({txHash:txHash, from:receipt.from, to:receipt.to, value:tx.value, kind:kind});
                }
            }

            //filter internal transactions of our contract
            if (receipt.to && receipt.to.toLowerCase() == contract.toLowerCase()) {
                console.log(receipt);
                let invitationFee = 0;
                let winAmount = 0;
                let gamblerAddress;
                for (const log of receipt.logs) {
                    if(log.topics[0] == openChannelTopic) {
                        let beneficiary = '0x'+log.topics[1].slice(26, log.topics[1].length);              

                        if (gamblers.indexOf(beneficiary.toLowerCase())!=-1) {
                            let value = web3.utils.hexToNumberString(log.data.slice(-64));  
                            kind = 3; //open channel tx
                            transfers.push({txHash:txHash, from:receipt.from, to:contract, value:value, kind:kind});
                        } 
                    } 

                    if(log.topics[0] == depositTopic) {
                        let beneficiary = '0x'+log.topics[2].slice(26, log.topics[2].length);              

                        if (gamblers.indexOf(beneficiary.toLowerCase())!=-1) {
                            console.log('data', log.data, log.data.slice(2, 66));
                            let value = web3.utils.hexToNumberString(log.data.slice(2, 66));  
                            kind = 4; //deposit channel tx
                            transfers.push({txHash:txHash, from:receipt.from, to:contract, value:value, kind:kind});
                        } 
                    } 

                    if(log.topics[0] == cooperativeSettleTopic) {
                        let p1 = '0x'+log.topics[2].slice(26, log.topics[2].length); 
                        let p2 = '0x'+log.topics[3].slice(26, log.topics[3].length);                

                        if (gamblers.indexOf(p1.toLowerCase())!=-1) {
                            let value = web3.utils.hexToNumberString(log.data.slice(2, 66));  
                            kind = 5; //cooperative settle channel tx
                            transfers.push({txHash:txHash, from:contract, to:p1, value:value, kind:kind});
                        } 

                        if (gamblers.indexOf(p2.toLowerCase())!=-1) {
                            let value = web3.utils.hexToNumberString(log.data.slice(-64));  
                            kind = 5; //cooperative settle channel tx
                            transfers.push({txHash:txHash, from:contract, to:p2, value:value, kind:kind});
                        } 
                    } 

                    if(log.topics[0] == settleTopic) {
                        let p1 = '0x'+log.topics[2].slice(26, log.topics[2].length); 
                        let p2 = '0x'+log.topics[3].slice(26, log.topics[3].length);                

                        if (gamblers.indexOf(p1.toLowerCase())!=-1) {
                            let value = web3.utils.hexToNumberString(log.data.slice(66, 130));  
                            kind = 6; //settle channel tx
                            transfers.push({txHash:txHash, from:contract, to:p1, value:value, kind:kind});
                        } 

                        if (gamblers.indexOf(p2.toLowerCase())!=-1) {
                            let value = web3.utils.hexToNumberString(log.data.slice(-64));  
                            kind = 6; //settle channel tx
                            transfers.push({txHash:txHash, from:contract, to:p2, value:value, kind:kind});
                        } 
                    }

                    if(log.topics[0] == unlockSentTopic) {
                        let beneficiary = '0x'+log.topics[2].slice(26, log.topics[2].length);              

                        if (gamblers.indexOf(beneficiary.toLowerCase())!=-1) {
                            let value = web3.utils.hexToNumberString(log.data);  
                            kind = 7; //unlock sent tx
                            transfers.push({txHash:txHash, from:contract, to:beneficiary, value:value, kind:kind});
                        } 
                    } 

                    if(log.topics[0] == unlockReturnTopic) {
                        let beneficiary = '0x'+log.topics[2].slice(26, log.topics[2].length);              

                        if (gamblers.indexOf(beneficiary.toLowerCase())!=-1) {
                            let value = web3.utils.hexToNumberString(log.data);  
                            kind = 8; //unlock return tx
                            transfers.push({txHash:txHash, from:contract, to:beneficiary, value:value, kind:kind});
                        } 
                    } 
                }
            }
        }
    }
    return transfers;
}

//listen on new coming block
async function subscribeNewBlock() {
    let subscription = web3.eth.subscribe('newBlockHeaders', function(error, result){
        if(!error){
            //console.log(result);
            return;
        }
        console.error(error);
    });
    
    subscription.on('data', async function(blockHeader){
        let relatedTransfers = await getRelatedTransferFromBlock(blockHeader.hash);
        if (relatedTransfers.length > 0) {
            //todo: write relatedTransfers to db
            console.log('bingo: ', relatedTransfers);
        }
    }).on('error', console.error);
}

web3.eth.isSyncing().then(console.log);

subscribeNewBlock();