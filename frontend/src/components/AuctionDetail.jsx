import { useEffect, useState } from "react";
import { formatEther, parseEther } from "ethers";
import StatusBadge from "./StatusBadge.jsx";
import ImageVerifier from "./ImageVerifier.jsx";
import SellerInfo from "./SellerInfo.jsx";
import AnnouncementSigner from "./AnnouncementSigner.jsx";
import CopyButton from "./CopyButton.jsx";
import {
  formatDate,
  formatEth,
  formatRemaining,
  readContract,
  sameAddress,
  shortAddress,
  status,
  ZERO_ADDRESS,
} from "../lib/blockchain.js";

export default function AuctionDetail({ auction: a, now, account, canWrite, busy, runTx, onBack }) {
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [history, setHistory] = useState([]);

  const st = status(a, now);
  const hasBid = a.highestBidder !== ZERO_ADDRESS;
  const isSeller = sameAddress(a.seller, account);
  const isLeader = hasBid && sameAddress(a.highestBidder, account);

  // Montant minimal accepté pour la prochaine offre
  const minNext = hasBid ? a.highestBid : a.minPrice;

  // Historique des offres reconstruit à partir des événements BidPlaced
  useEffect(() => {
    let cancelled = false;
    readContract
      .queryFilter(readContract.filters.BidPlaced(a.id), 0)
      .then(async (events) => {
        const rows = await Promise.all(
          events.map(async (e) => {
            const block = await e.getBlock();
            return { bidder: e.args.bidder, amount: e.args.amount, time: block.timestamp, hash: e.transactionHash };
          })
        );
        if (!cancelled) setHistory(rows.reverse());
      })
      .catch(() => !cancelled && setHistory([]));
    return () => {
      cancelled = true;
    };
  }, [a.id, a.highestBid]);

  async function submitBid(e) {
    e.preventDefault();
    setFormError("");
    let value;
    try {
      value = parseEther(amount.replace(",", "."));
    } catch {
      return setFormError("Montant invalide.");
    }
    // Contrôles côté interface (le smart contract refait toutes les vérifications)
    if (!hasBid && value < a.minPrice) {
      return setFormError(`L'offre doit être au moins égale au prix minimal (${formatEth(a.minPrice)}).`);
    }
    if (hasBid && value <= a.highestBid) {
      return setFormError(`L'offre doit dépasser la meilleure offre (${formatEth(a.highestBid)}).`);
    }
    const receipt = await runTx(
      "Envoi de l'offre.",
      `Offre de ${formatEth(value)} enregistrée.`,
      (c) => c.bid(a.id, { value })
    );
    if (receipt) setAmount("");
  }

  function closeAuction() {
    runTx("Clôture de l'enchère.", "Enchère clôturée.", (c) => c.endAuction(a.id));
  }

  return (
    <section>
      <button className="link-back" onClick={onBack}>
        ← Retour aux enchères
      </button>

      <div className="detail">
        <div className="card detail-main">
          <div className="card-top">
            <span className="auction-id">Enchère #{a.id}</span>
            <span className="top-actions">
              <CopyButton text={shareLink(a.id)} label="Copier le lien" />
              <StatusBadge auction={a} now={now} />
            </span>
          </div>
          <h1>{a.itemName}</h1>
          {a.description && <p className="desc-lg">{a.description}</p>}
          {a.imageURI && <ImageVerifier imageURI={a.imageURI} imageHash={a.imageHash} />}

          <div className="stats">
            <div className="stat">
              <span className="stat-label">Prix minimal</span>
              <span className="stat-value">{formatEth(a.minPrice)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Meilleure offre</span>
              <span className="stat-value">{hasBid ? formatEth(a.highestBid) : "Aucune"}</span>
            </div>
            <div className="stat">
              <span className="stat-label">{a.ended ? "Fin" : "Temps restant"}</span>
              <span className="stat-value">
                {a.ended ? formatDate(a.endTime) : formatRemaining(a.endTime - now)}
              </span>
            </div>
          </div>

          <dl className="kv kv-wide">
            <dt>Vendeur</dt>
            <dd title={a.seller}>
              {shortAddress(a.seller)} {isSeller && <span className="tag">vous</span>}
            </dd>
            <dt>{a.ended ? "Gagnant" : "Meilleur enchérisseur"}</dt>
            <dd title={a.highestBidder}>
              {hasBid ? shortAddress(a.highestBidder) : "—"} {isLeader && <span className="tag tag-ok">vous</span>}
            </dd>
            <dt>Date de fin</dt>
            <dd>{formatDate(a.endTime)}</dd>
          </dl>
        </div>

        <aside className="card detail-side">
          {st === "en-cours" && (
            <>
              <h2>Enchérir</h2>
              {isSeller ? (
                <p className="muted">Vous êtes le vendeur : vous ne pouvez pas enchérir sur votre propre enchère.</p>
              ) : (
                <form onSubmit={submitBid} className="form">
                  <label>
                    Votre offre (ETH)
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={hasBid ? `plus de ${formatEther(minNext)}` : `au moins ${formatEther(minNext)}`}
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        setFormError("");
                      }}
                      disabled={!canWrite || busy}
                    />
                  </label>
                  {formError && <p className="form-error">{formError}</p>}
                  <button className="btn btn-primary btn-block" disabled={!canWrite || busy || !amount}>
                    {busy ? "Transaction en cours…" : "Placer l'offre"}
                  </button>
                  {!canWrite && <p className="hint">Connectez MetaMask sur le réseau Ganache pour enchérir.</p>}
                  <p className="hint">
                    Si vous êtes dépassé, votre offre vous reste due : récupérez-la dans « Mon compte ».
                  </p>
                </form>
              )}
            </>
          )}

          {st === "a-cloturer" && (
            <>
              <h2>Délai écoulé</h2>
              <p className="muted">
                Plus aucune offre n'est acceptée. N'importe quel participant peut clôturer l'enchère :
                {hasBid
                  ? ` le gagnant sera ${shortAddress(a.highestBidder)} et le vendeur recevra ${formatEth(a.highestBid)}.`
                  : " aucune offre n'a été faite, l'enchère se terminera sans gagnant."}
              </p>
              <button className="btn btn-primary btn-block" onClick={closeAuction} disabled={!canWrite || busy}>
                {busy ? "Transaction en cours…" : "Clôturer l'enchère"}
              </button>
              {!canWrite && <p className="hint">Connectez MetaMask sur le réseau Ganache pour clôturer.</p>}
            </>
          )}

          {st === "terminee" && (
            <>
              <h2>Enchère terminée</h2>
              {hasBid ? (
                <p className="result">
                  Gagnant : <strong>{shortAddress(a.highestBidder)}</strong>
                  <br />
                  Montant versé au vendeur : <strong>{formatEth(a.highestBid)}</strong>
                </p>
              ) : (
                <p className="muted">Aucune offre : pas de gagnant, aucun transfert.</p>
              )}
              {isLeader && <p className="notice notice-ok">Félicitations, vous avez remporté cette enchère !</p>}
            </>
          )}
        </aside>
      </div>

      <div className="card">
        <h2>Vendeur</h2>
        <SellerInfo address={a.seller} isYou={isSeller} />
      </div>

      {isSeller && <AnnouncementSigner auction={a} canWrite={canWrite} />}

      <div className="card">
        <h2>Historique des offres</h2>
        {history.length === 0 ? (
          <p className="muted">Aucune offre pour le moment.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Enchérisseur</th>
                <th className="num">Montant</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={h.hash + i}>
                  <td>{formatDate(h.time)}</td>
                  <td title={h.bidder}>
                    {shortAddress(h.bidder)} {sameAddress(h.bidder, account) && <span className="tag">vous</span>}
                  </td>
                  <td className="num">{formatEth(h.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

// Lien direct vers une enchère, à partager
function shareLink(id) {
  return `${window.location.origin}${window.location.pathname}#/enchere/${id}`;
}
