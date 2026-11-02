import { useState } from "react";
import StatusBadge from "./StatusBadge.jsx";
import {
  formatEth,
  formatRemaining,
  sameAddress,
  shortAddress,
  status,
  ZERO_ADDRESS,
} from "../lib/blockchain.js";

const FILTERS = [
  { id: "en-cours", label: "En cours" },
  { id: "a-cloturer", label: "À clôturer" },
  { id: "terminee", label: "Terminées" },
  { id: "all", label: "Toutes" },
];

export default function AuctionList({ auctions, loading, now, account, onOpen, onCreate }) {
  const [filter, setFilter] = useState("all");

  const shown = auctions.filter((a) => filter === "all" || status(a, now) === filter);
  const count = (f) => auctions.filter((a) => f === "all" || status(a, now) === f).length;

  return (
    <section>
      <div className="section-head">
        <div>
          <h1>Enchères</h1>
          <p className="muted">
            Toutes les enchères enregistrées dans le smart contract. Les données se mettent à jour
            automatiquement.
          </p>
        </div>
        <button className="btn btn-primary" onClick={onCreate}>
          + Nouvelle enchère
        </button>
      </div>

      <div className="filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip ${filter === f.id ? "active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label} <span className="chip-count">{count(f.id)}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty">Chargement des enchères…</p>
      ) : shown.length === 0 ? (
        <p className="empty">
          {auctions.length === 0 ? "Aucune enchère pour le moment." : "Aucune enchère dans cette catégorie."}
        </p>
      ) : (
        <div className="grid">
          {shown.map((a) => {
            const hasBid = a.highestBidder !== ZERO_ADDRESS;
            const mine = sameAddress(a.seller, account);
            const leading = hasBid && sameAddress(a.highestBidder, account);
            return (
              <button key={a.id} className="card auction-card" onClick={() => onOpen(a.id)}>
                {a.imageURI && (
                  <img
                    className="thumb"
                    src={a.imageURI}
                    alt=""
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
                <div className="card-top">
                  <span className="auction-id">#{a.id}</span>
                  <StatusBadge auction={a} now={now} />
                </div>
                <h3>{a.itemName}</h3>
                {a.description && <p className="desc">{a.description}</p>}
                <dl className="kv">
                  <dt>{hasBid ? "Meilleure offre" : "Prix minimal"}</dt>
                  <dd className="price">{formatEth(hasBid ? a.highestBid : a.minPrice)}</dd>
                  <dt>{a.ended ? "Gagnant" : "Temps restant"}</dt>
                  <dd>
                    {a.ended
                      ? hasBid
                        ? shortAddress(a.highestBidder)
                        : "Aucun"
                      : formatRemaining(a.endTime - now)}
                  </dd>
                </dl>
                {(mine || leading) && (
                  <div className="card-tags">
                    {mine && <span className="tag">Votre enchère</span>}
                    {leading && <span className="tag tag-ok">Vous êtes en tête</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
