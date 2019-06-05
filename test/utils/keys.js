const mnemonic = "member guess canvas moment boring tragic find thumb cart identify above dutch"; // put your ganache mnemonic here.

const bip39 = require("bip39");
const hdkey = require("ethereumjs-wallet/hdkey");
const wallet = require("ethereumjs-wallet");

// console.log(getAccountPrivateKey(0));

async function getAccountPrivateKey(index) {
  const seed = await bip39.mnemonicToSeed(mnemonic); // mnemonic is the string containing the words
  // console.log("seed", seed);
  const hdk = hdkey.fromMasterSeed(seed);
  const addr_node = hdk.derivePath("m/44'/60'/0'/0/" + index); //m/44'/60'/0'/0/0 is derivation path for the first account. m/44'/60'/0'/0/1 is the derivation path for the second account and so on
  const addr = addr_node.getWallet().getAddressString(); //check that this is the same with the address that ganache list for the first account to make sure the derivation is correct
  const private_key = addr_node
    .getWallet()
    .getPrivateKey()
    .toString("hex");
  // console.log(private_key);
  return private_key;
}

async function getPrivateKeys() {
  const privateKeys = [];
  for (let i = 0; i < 10; i++) {
    privateKeys.push(Buffer.from(await getAccountPrivateKey(i), "hex"));
  }

  return privateKeys;
}

module.exports = {
  getPrivateKeys
};
