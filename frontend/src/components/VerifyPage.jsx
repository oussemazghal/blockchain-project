import { useState } from "react";
import { CONTRACT_ADDRESS } from "../config.js";
import { readContract, sameAddress, shortAddress, toAuction } from "../lib/blockchain.js";
import { parseSignedAnnouncement, recoverSigner } from "../lib/trust.js";
import SellerInfo from "./SellerInfo.jsx";

// Vérifie une annonce signée publiée par un vendeur (sur un réseau social, un site…)
export default function VerifyPage({ onOpen }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);

  async function verify(e) {
    e.preventDefault();
    setChecking(true);
    setResult(await check(text));
    setChecking(false);
  }

  return (
    <section className="narrow">
      <h1>Vérifier une annonce</h1>
      <p className="muted">
        Collez ci-dessous une annonce signée par un vendeur, telle qu'elle a été publiée (texte et ligne
        « Signature »). L'application retrouve l'adresse qui l'a signée et la compare au vendeur de
        l'enchère enregistré dans le smart contract.
      </p>

      <form className="card form" onSubmit={verify}>
        <label>
          Annonce signée
          <textarea
            rows={10}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setResult(null);
            }}
            placeholder={"Annonce d'enchère vérifiable\nEnchère n° …\n…\n-----\nSignature : 0x…"}
          />
        </label>
        <button className="btn btn-primary btn-block" disabled={!text.trim() || checking}>
          {checking ? "Vérification…" : "Vérifier"}
        </button>
      </form>

      {result && <VerifyResult result={result} onOpen={onOpen} />}
    </section>
  );
}

async function check(text) {
  const parsed = parseSignedAnnouncement(text);
  if (!parsed) {
    return { ok: false, title: "Format non reconnu", detail: "Le texte doit se terminer par une ligne « ----- » puis « Signature : 0x… »." };
  }
  if (!parsed.contract || !sameAddress(parsed.contract, CONTRACT_ADDRESS)) {
    return { ok: false, title: "Autre contrat", detail: "Cette annonce concerne un autre contrat d'enchères que celui de cette application." };
  }
  if (parsed.auctionId === null) {
    return { ok: false, title: "Format non reconnu", detail: "Numéro d'enchère introuvable dans le texte." };
  }

  let auction;
  try {
    auction = toAuction(parsed.auctionId, await readContract.getAuction(parsed.auctionId));
  } catch {
    return { ok: false, title: "Enchère inexistante", detail: `L'enchère n° ${parsed.auctionId} n'existe pas dans le contrat.` };
  }

  const signer = recoverSigner(parsed.message, parsed.signature);
  if (!signer) {
    return { ok: false, title: "Signature invalide", detail: "La signature n'a pas pu être lue." };
  }
  if (!sameAddress(signer, auction.seller)) {
    return {
      ok: false,
      title: "Annonce NON authentique",
      detail:
        `Cette annonce n'a pas été signée par le vendeur de l'enchère n° ${auction.id} (${shortAddress(auction.seller)}). ` +
        "Soit le texte a été modifié après la signature, soit quelqu'un d'autre l'a signée.",
      signer,
      auction,
    };
  }
  const nameMatches = parsed.itemName === auction.itemName;
  return {
    ok: true,
    title: "Annonce authentique",
    detail: `Signée par l'adresse qui a créé l'enchère n° ${auction.id}, et le texte n'a pas été modifié.`,
    warning: nameMatches ? null : `Le nom de l'article dans l'annonce (« ${parsed.itemName} ») diffère de celui de l'enchère (« ${auction.itemName} »).`,
    signer,
    auction,
  };
}

function VerifyResult({ result, onOpen }) {
  return (
    <div className={`card verify-result ${result.ok ? "verify-ok" : "verify-mismatch"}`}>
      <h2>{result.ok ? "✓ " : "✗ "}{result.title}</h2>
      <p>{result.detail}</p>
      {result.warning && <p className="notice notice-warn">{result.warning}</p>}
      {result.signer && (
        <p className="hint">
          Adresse qui a signé : <code>{result.signer}</code>
        </p>
      )}
      {result.ok && result.auction && (
        <>
          <h3>Vendeur</h3>
          <SellerInfo address={result.auction.seller} />
          <button className="btn btn-primary" onClick={() => onOpen(result.auction.id)}>
            Voir l'enchère n° {result.auction.id}
          </button>
        </>
      )}
    </div>
  );
}
