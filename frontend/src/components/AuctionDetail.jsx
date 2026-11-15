import { useEffect, useState } from "react";
import { formatEther, parseEther } from "ethers";
import StatusBadge from "./StatusBadge.jsx";
import ImageVerifier from "./ImageVerifier.jsx";
import SellerInfo from "./SellerInfo.jsx";
import AnnouncementSigner from "./AnnouncementSigner.jsx";
import CopyButton from "./CopyButton.jsx";
import Icon from "./Icon.jsx";
import ItemImage from "./ItemImage.jsx";
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

export default function AuctionDetail({
  auction: a,
  now,
  account,
  canWrite,
  busy,
  runTx,
  onBack,
  onConnect,
}) {
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const st = status(a, now);
  const hasBid = a.highestBidder !== ZERO_ADDRESS;
  const isSeller = sameAddress(a.seller, account);
  const isLeader = hasBid && sameAddress(a.highestBidder, account);
  const minNext = hasBid ? a.highestBid : a.minPrice;
  const suggestedBid = hasBid ? a.highestBid + parseEther("0.01") : a.minPrice;

  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(false);
    readContract
      .queryFilter(readContract.filters.BidPlaced(a.id), 0)
      .then(async (events) => {
        const rows = await Promise.all(
          events.map(async (event) => {
            const block = await event.getBlock();
            return {
              bidder: event.args.bidder,
              amount: event.args.amount,
              time: block.timestamp,
              hash: event.transactionHash,
            };
          }),
        );
        if (!cancelled) setHistory(rows.reverse());
      })
      .catch(() => {
        if (!cancelled) {
          setHistory([]);
          setHistoryError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [a.id, a.highestBid]);

  async function submitBid(event) {
    event.preventDefault();
    setFormError("");
    let value;
    try {
      value = parseEther(amount.replace(",", "."));
    } catch {
      return setFormError("Montant invalide.");
    }
    if (!hasBid && value < a.minPrice)
      return setFormError(
        `L’offre doit être au moins égale au prix minimal (${formatEth(a.minPrice)}).`,
      );
    if (hasBid && value <= a.highestBid)
      return setFormError(
        `L’offre doit dépasser la meilleure offre (${formatEth(a.highestBid)}).`,
      );
    const receipt = await runTx(
      "Envoi de l’offre.",
      `Offre de ${formatEth(value)} enregistrée.`,
      (contract) => contract.bid(a.id, { value }),
    );
    if (receipt) setAmount("");
  }

  function closeAuction() {
    runTx("Clôture de l’enchère.", "Enchère clôturée.", (contract) =>
      contract.endAuction(a.id),
    );
  }

  return (
    <section>
      <button className="link-back" onClick={onBack}>
        <Icon name="arrow" size={15} /> Retour au catalogue
      </button>
      <div className="detail">
        <div>
          <div className="card detail-gallery">
            {a.imageURI ? (
              <ImageVerifier imageURI={a.imageURI} imageHash={a.imageHash} />
            ) : (
              <ItemImage alt={a.itemName} />
            )}
          </div>
          <div className="card">
            <div className="detail-subhead">
              <Icon name="user" />
              <h2>Une rencontre avec le vendeur</h2>
            </div>
            <SellerInfo address={a.seller} isYou={isSeller} />
          </div>
          {isSeller && <AnnouncementSigner auction={a} canWrite={canWrite} />}
          <div className="card">
            <div className="detail-subhead">
              <Icon name="gavel" />
              <h2>L’histoire des offres</h2>
              <span className="chip-count">{history.length}</span>
            </div>
            {historyLoading ? (
              <p className="muted">Lecture des offres enregistrées…</p>
            ) : historyError ? (
              <p className="notice notice-warn">
                L’historique n’a pas pu être chargé. Rechargez la page pour
                réessayer.
              </p>
            ) : !history.length ? (
              <p className="muted">
                L’histoire attend sa première offre. À vous d’en écrire le
                début.
              </p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Enchérisseur</th>
                      <th className="num">Offre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((offer, index) => (
                      <tr key={offer.hash + index}>
                        <td>{formatDate(offer.time)}</td>
                        <td title={offer.bidder}>
                          {shortAddress(offer.bidder)}{" "}
                          {sameAddress(offer.bidder, account) && (
                            <span className="tag">vous</span>
                          )}
                        </td>
                        <td className="num">
                          <strong>{formatEth(offer.amount)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <aside className="card detail-side">
          <div className="card-top">
            <span className="auction-id">ENCHÈRE #{a.id}</span>
            <StatusBadge auction={a} now={now} />
          </div>
          <h1>{a.itemName}</h1>
          {a.description && <p className="desc-lg">{a.description}</p>}
          <span className="stat-label">
            {hasBid ? "Meilleure offre" : "Mise à prix"}
          </span>
          <strong className="bid-price">
            {formatEth(hasBid ? a.highestBid : a.minPrice)}
          </strong>
          <div className="bid-conditions">
            <div>
              <span>
                <Icon name="clock" size={13} />{" "}
                {a.ended ? "Clôturée" : "Temps restant"}
              </span>
              <strong>
                {a.ended
                  ? formatDate(a.endTime)
                  : formatRemaining(a.endTime - now)}
              </strong>
            </div>
            <div>
              <span>Prix minimal</span>
              <strong>{formatEth(a.minPrice)}</strong>
            </div>
            <div>
              <span>{a.ended ? "Gagnant" : "Meilleur enchérisseur"}</span>
              <strong title={a.highestBidder}>
                {hasBid ? shortAddress(a.highestBidder) : "Aucune offre"}
                {isLeader ? " · vous" : ""}
              </strong>
            </div>
          </div>
          {st === "en-cours" &&
            (isSeller ? (
              <div className="notice notice-ok">
                <Icon name="gavel" size={18} />
                <span>
                  C’est votre objet. Les enchérisseurs ont la main : vous ne
                  pouvez pas enchérir sur votre propre annonce.
                </span>
              </div>
            ) : (
              <form onSubmit={submitBid} className="form">
                <label>
                  Votre offre (ETH)
                  <input
                    inputMode="decimal"
                    placeholder={
                      hasBid
                        ? `Plus de ${formatEther(minNext)}`
                        : `À partir de ${formatEther(minNext)}`
                    }
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setFormError("");
                    }}
                    disabled={!canWrite || busy}
                  />
                </label>
                <div className="quick-bids">
                  <button
                    type="button"
                    className="btn btn-small"
                    disabled={!canWrite || busy}
                    onClick={() => {
                      setAmount(formatEther(suggestedBid));
                      setFormError("");
                    }}
                  >
                    {formatEth(suggestedBid)}
                  </button>
                  <button
                    type="button"
                    className="btn btn-small"
                    disabled={!canWrite || busy}
                    onClick={() => {
                      setAmount(formatEther(suggestedBid + parseEther("0.1")));
                      setFormError("");
                    }}
                  >
                    + 0,1 ETH
                  </button>
                </div>
                {formError && (
                  <p className="form-error" role="alert">
                    {formError}
                  </p>
                )}
                <button
                  className="btn btn-primary btn-block"
                  disabled={!canWrite || busy || !amount}
                >
                  {busy ? "Transaction en cours…" : "Placer l’offre"}
                  <Icon name="arrow" size={17} />
                </button>
                <p className="hint">
                  Si une autre offre dépasse la vôtre, vos fonds restent
                  disponibles dans « Mon compte ».
                </p>
              </form>
            ))}
          {st === "a-cloturer" && (
            <>
              <h2>Le temps des offres est terminé.</h2>
              <p className="muted">
                {hasBid
                  ? "La meilleure offre est connue. Clôturez l’enchère pour verser le montant au vendeur."
                  : "Aucune offre n’a été proposée. Vous pouvez clôturer sans transfert de fonds."}
              </p>
              <button
                className="btn btn-primary btn-block"
                onClick={closeAuction}
                disabled={!canWrite || busy}
              >
                {busy ? "Clôture en cours…" : "Clôturer l’enchère"}
                <Icon name="check" size={17} />
              </button>
            </>
          )}
          {st === "terminee" && (
            <div className="notice notice-ok">
              <Icon name="check" size={20} />
              <span>
                {hasBid
                  ? isLeader
                    ? "Félicitations, cette pièce commence une nouvelle histoire avec vous !"
                    : `Enchère remportée pour ${formatEth(a.highestBid)}. Le résultat est enregistré sur la blockchain.`
                  : "L’enchère est terminée sans offre. Aucun fonds n’a été transféré."}
              </span>
            </div>
          )}
          {!canWrite && st !== "terminee" && (
            <button className="text-button wallet-prompt" onClick={onConnect}>
              Connecter mon portefeuille <Icon name="arrow" size={15} />
            </button>
          )}
          <p className="detail-safe">
            <Icon name="shield" size={13} /> Chaque transaction se confirme dans
            MetaMask.
          </p>
          <div className="detail-share">
            <span className="hint">Une pièce à partager ?</span>
            <CopyButton
              text={`${window.location.origin}${window.location.pathname}#/enchere/${a.id}`}
              label="Copier le lien"
            />
          </div>
        </aside>
      </div>
    </section>
  );
}
