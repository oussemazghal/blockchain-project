import artifact from "./contract/Auction.json";

// Adresse RPC de Ganache (application graphique : port 7545 par défaut)
export const RPC_URL = "http://127.0.0.1:7545";

// Chain ID de Ganache (1337 par défaut, application graphique comme CLI)
export const CHAIN_ID = artifact.chainId || 1337;

// Adresse et ABI du contrat, écrites automatiquement par `truffle migrate`
export const CONTRACT_ADDRESS = artifact.address;
export const CONTRACT_ABI = artifact.abi;
