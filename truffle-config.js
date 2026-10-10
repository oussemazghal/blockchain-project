// Ganache en mémoire pour `npm test` (créé une seule fois, à la demande)
let testProvider;
function getTestProvider() {
  if (!testProvider) {
    testProvider = require("ganache").provider({
      chain: { chainId: 1337, networkId: 1337 },
      wallet: { totalAccounts: 10, defaultBalance: 1000 },
      logging: { quiet: true },
    });
  }
  return testProvider;
}

module.exports = {
  networks: {
    // Ganache (application graphique ou `npm run ganache`) : port 7545, chain ID 1337
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
    },

    // Tests : Ganache lancé en mémoire, séparé de celui de la démo.
    // Les tests avancent l'horloge de la blockchain (fin des enchères) :
    // on évite ainsi de décaler l'heure du Ganache utilisé par l'interface.
    test: {
      provider: getTestProvider,
      network_id: 1337,
    },
  },

  // Après `truffle migrate`, l'ABI et l'adresse du contrat sont aussi copiées
  // vers frontend/src/contract/Auction.json (voir migrations/1_deploy_auction.js).
  contracts_build_directory: "./build/contracts",

  compilers: {
    solc: {
      // Compilateur installé via npm (pas de téléchargement nécessaire)
      version: "./node_modules/solc",
      settings: {
        optimizer: { enabled: true, runs: 200 },
        // Ganache 7 ne supporte pas l'opcode PUSH0 (Shanghai) : on cible "paris"
        evmVersion: "paris",
      },
    },
  },
};
