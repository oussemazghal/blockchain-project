// Fonctions de « confiance » : empreinte des photos et annonces signées.
import { getAddress, sha256, verifyMessage } from "ethers";
import { CHAIN_ID, CONTRACT_ADDRESS } from "../config.js";

export const ZERO_HASH = "0x" + "00".repeat(32);

// ---------- Empreinte SHA-256 des photos ----------
// L'empreinte est calculée sur le contenu exact du fichier. Elle est identique à
// celle donnée par la commande `sha256sum photo.jpg` (Linux) ou
// `Get-FileHash photo.jpg` (Windows), ce qui permet une vérification indépendante.

export async function hashFile(file) {
  const buffer = await file.arrayBuffer();
  return sha256(new Uint8Array(buffer));
}

// Télécharge l'image depuis son lien et calcule son empreinte.
// Renvoie null si le site qui héberge l'image refuse la lecture (règles CORS).
export async function hashImageAtUrl(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return sha256(new Uint8Array(buffer));
  } catch {
    return null;
  }
}

export function shortHash(hash) {
  return hash ? `${hash.slice(0, 10)}…${hash.slice(-8)}` : "—";
}

// ---------- Annonces signées ----------
// Le vendeur signe (gratuitement, sans transaction) un texte qui décrit son enchère.
// Il publie ce texte et la signature ailleurs (réseau social, site…). Toute personne
// peut ensuite vérifier dans l'application que la signature provient bien de
// l'adresse qui a créé l'enchère, et que le texte n'a pas été modifié.

const SEPARATOR = "-----";
const SIGNATURE_PREFIX = "Signature :";

// Normalise le texte (espaces en fin de ligne, retours chariot Windows…) pour qu'un
// copier-coller depuis un autre site ne casse pas la vérification.
function normalize(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .trim();
}

export function buildAnnouncement(auction, formattedMinPrice) {
  return normalize(
    [
      "Annonce d'enchère vérifiable",
      `Enchère n° ${auction.id} : ${auction.itemName}`,
      `Prix minimal : ${formattedMinPrice}`,
      `Contrat : ${CONTRACT_ADDRESS}`,
      `Réseau (chain ID) : ${CHAIN_ID}`,
      `Vendeur : ${auction.seller}`,
      `Signée le : ${new Date().toLocaleString("fr-FR")}`,
    ].join("\n")
  );
}

export function formatSignedAnnouncement(message, signature) {
  return `${message}\n${SEPARATOR}\n${SIGNATURE_PREFIX} ${signature}`;
}

// Découpe le texte collé en { message, signature, auctionId, contract, itemName }
export function parseSignedAnnouncement(text) {
  const clean = normalize(text);
  const marker = `\n${SEPARATOR}\n${SIGNATURE_PREFIX}`;
  const idx = clean.lastIndexOf(marker);
  if (idx === -1) return null;

  const message = clean.slice(0, idx);
  const signature = clean.slice(idx + marker.length).trim().split(/\s/)[0];
  if (!/^0x[0-9a-fA-F]{130}$/.test(signature)) return null;

  const idMatch = message.match(/Enchère n° (\d+) : (.*)/);
  const contractMatch = message.match(/Contrat : (0x[0-9a-fA-F]{40})/);
  return {
    message,
    signature,
    auctionId: idMatch ? Number(idMatch[1]) : null,
    itemName: idMatch ? idMatch[2].trim() : null,
    contract: contractMatch ? contractMatch[1] : null,
  };
}

// Retrouve l'adresse qui a signé le message (ou null si la signature est invalide)
export function recoverSigner(message, signature) {
  try {
    return getAddress(verifyMessage(message, signature));
  } catch {
    return null;
  }
}
