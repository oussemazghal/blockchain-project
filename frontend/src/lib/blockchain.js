import { BrowserProvider, Contract, JsonRpcProvider, formatEther } from "ethers";
import { CHAIN_ID, CONTRACT_ABI, CONTRACT_ADDRESS, RPC_URL } from "../config.js";

// ---------- lecture (sans portefeuille) ----------
// Les lectures passent directement par Ganache : un visiteur sans MetaMask
// peut consulter les enchères.
export const readProvider = new JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });
readProvider.pollingInterval = 1000;

export const readContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);

export async function contractIsDeployed() {
  try {
    const code = await readProvider.getCode(CONTRACT_ADDRESS);
    return code && code !== "0x";
  } catch {
    return null; // Ganache injoignable
  }
}

// ---------- horloge de la blockchain locale ----------
// Ganache ne produit un bloc que lorsqu'une transaction arrive, et MetaMask simule
// chaque transaction (estimation du gas) avec l'horodatage du DERNIER bloc.
// Si rien ne s'est passé depuis la fin d'une enchère, la simulation la croit
// encore en cours et refuse la clôture. On demande donc à Ganache de miner un
// bloc vide pour mettre son horloge à jour. Inutile sur un vrai réseau, où des
// blocs sont produits en continu.
export async function syncLocalChainTime() {
  try {
    const block = await readProvider.send("eth_getBlockByNumber", ["latest", false]);
    const lag = Math.floor(Date.now() / 1000) - parseInt(block.timestamp, 16);
    if (lag > 1) await readProvider.send("evm_mine", []);
  } catch {
    // evm_mine n'existe que sur les réseaux de développement : on ignore l'erreur
  }
}

// ---------- écriture (MetaMask) ----------
export function hasMetaMask() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export function getBrowserProvider() {
  return new BrowserProvider(window.ethereum);
}

export async function getWriteContract() {
  const signer = await getBrowserProvider().getSigner();
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

const CHAIN_HEX = "0x" + CHAIN_ID.toString(16);

// Demande à MetaMask de basculer sur le réseau Ganache (et l'ajoute s'il est inconnu)
export async function switchToGanache() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_HEX }],
    });
  } catch (err) {
    if (err?.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_HEX,
            chainName: "Ganache (local)",
            rpcUrls: [RPC_URL],
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

// ---------- conversion des données ----------
export function toAuction(id, raw) {
  return {
    id,
    seller: raw.seller,
    itemName: raw.itemName,
    description: raw.description,
    imageURI: raw.imageURI,
    imageHash: raw.imageHash,
    minPrice: raw.minPrice,
    endTime: Number(raw.endTime),
    highestBidder: raw.highestBidder,
    highestBid: raw.highestBid,
    ended: raw.ended,
  };
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function sameAddress(a, b) {
  return Boolean(a && b) && a.toLowerCase() === b.toLowerCase();
}

export function shortAddress(addr) {
  if (!addr || addr === ZERO_ADDRESS) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatEth(wei, digits = 4) {
  const n = Number(formatEther(wei));
  return `${n.toLocaleString("fr-FR", { maximumFractionDigits: digits })} ETH`;
}

export function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function status(auction, now = nowSeconds()) {
  if (auction.ended) return "terminee";
  if (now >= auction.endTime) return "a-cloturer";
  return "en-cours";
}

export function formatRemaining(seconds) {
  if (seconds <= 0) return "Délai écoulé";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d} j ${h} h ${m} min`;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  return `${m} min ${String(s).padStart(2, "0")} s`;
}

export function formatDate(timestamp) {
  return new Date(timestamp * 1000).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// ---------- messages d'erreur lisibles ----------
const CONTRACT_MESSAGES = {
  "Enchere inexistante": "Cette enchère n'existe pas.",
  "Nom de l'article obligatoire": "Le nom de l'article est obligatoire.",
  "Le prix minimal doit etre > 0": "Le prix minimal doit être supérieur à 0.",
  "La duree doit etre > 0": "La durée doit être supérieure à 0.",
  "Enchere terminee": "L'enchère est terminée : plus aucune offre n'est acceptée.",
  "Le vendeur ne peut pas encherir": "Le vendeur ne peut pas enchérir sur sa propre enchère.",
  "Offre inferieure au prix minimal": "L'offre est inférieure au prix minimal.",
  "Offre trop basse": "L'offre doit être strictement supérieure à la meilleure offre.",
  "Aucun fonds a retirer": "Vous n'avez aucun fonds à retirer.",
  "Echec du transfert": "Le transfert d'ETH a échoué.",
  "Enchere encore en cours": "L'enchère est encore en cours : la clôture n'est possible qu'après la date de fin.",
  "Enchere deja cloturee": "Cette enchère a déjà été clôturée.",
  "Image et empreinte vont ensemble": "La photo et son empreinte doivent être fournies ensemble.",
  "Nom du profil obligatoire": "Le nom du profil est obligatoire.",
  "Profil trop long": "Profil trop long (64 caractères pour le nom, 200 pour le lien).",
};

export function errorMessage(err) {
  if (err?.code === "ACTION_REJECTED" || err?.info?.error?.code === 4001 || err?.code === 4001) {
    return "Transaction refusée dans MetaMask.";
  }
  const candidates = [
    err?.reason,
    err?.revert?.args?.[0],
    err?.info?.error?.data?.message,
    err?.info?.error?.message,
    err?.error?.message,
    err?.shortMessage,
    err?.message,
  ].filter(Boolean);

  for (const text of candidates) {
    for (const [key, friendly] of Object.entries(CONTRACT_MESSAGES)) {
      if (text.includes(key)) return friendly;
    }
  }
  if (candidates.some((t) => /insufficient funds/i.test(t))) {
    return "Solde insuffisant pour cette transaction.";
  }
  if (candidates.some((t) => /nonce/i.test(t))) {
    return "Problème de nonce : dans MetaMask, effacez les données d'activité du compte (Paramètres → Avancé) puis réessayez.";
  }
  return candidates[0] || "Une erreur inconnue est survenue.";
}
