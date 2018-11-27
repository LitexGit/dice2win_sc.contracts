const Web3 = require('web3');

//var web3 = new Web3('ws://54.250.21.165:8546');  //rinkeby
var web3 = new Web3('ws://39.96.8.192:8546');  //rinkeby

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
        console.log(blockHeader.number);
    }).on('error', console.error);
}

//web3.eth.isSyncing().then(console.log);

subscribeNewBlock();