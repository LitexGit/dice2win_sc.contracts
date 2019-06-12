### Specification

 See state channel message [protocol](https://github.com/litexio/scnode/blob/master/README.md#post_office-state-channel-message-protocol) here

### Run test

1. install [truffle](https://www.trufflesuite.com/docs/truffle/getting-started/installation) 
```
npm install -g truffle
```
2. install node dependencies
```
npm install openzeppelin-test-helpers ethereumjs-util bip39 ethereumjs-wallet
```

3. replace mnemonic of your own ganache to test/utils/keys.js
```
const mnemonic = "member guess canvas moment boring tragic find thumb cart identify above dutch"; // put your ganache mnemonic here.

const bip39 = require("bip39");
```

4. start [ganache](https://www.trufflesuite.com/ganache)

5. run test cases
```
truffle test
```

### Deployed testnet contracts

1. rinkeby 

```
Dice_SC:     0x2ec9B713cCa3f42fd7E263D91B46e86E6fe7ea4B
Payment_ETH: 0x4B70A4d4d885cb397E2bD5b0A77DA9bD3EEb033e
```

