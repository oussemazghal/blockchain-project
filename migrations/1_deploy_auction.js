const fs = require("fs");
const path = require("path");

const Auction = artifacts.require("Auction");

module.exports = async function (deployer, network) {
  await deployer.deploy(Auction);
  const auction = await Auction.deployed();

  // `truffle test` relance aussi les migrations : dans ce cas on ne touche pas au front-end.
  if (process.argv.includes("test")) return;

  // Copie de l'ABI et de l'adresse du contrat déployé vers le front-end React.
  const chainId = await web3.eth.getChainId();
  const out = {
    address: auction.address,
    chainId: Number(chainId),
    network,
    deployedAt: new Date().toISOString(),
    abi: Auction.abi,
  };
  const target = path.join(__dirname, "..", "frontend", "src", "contract", "Auction.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(out, null, 2));
  console.log(`   > ABI et adresse copiées dans frontend/src/contract/Auction.json`);
};
