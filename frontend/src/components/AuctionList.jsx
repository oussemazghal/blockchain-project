import { useState } from "react";
import StatusBadge from "./StatusBadge.jsx";
import Icon from "./Icon.jsx";
import ItemImage from "./ItemImage.jsx";
import { selectAuctions } from "../lib/catalog.js";
import {
  formatEth,
  formatRemaining,
  sameAddress,
  shortAddress,
  status,
  ZERO_ADDRESS,
} from "../lib/blockchain.js";

const FILTERS = [
  { id: "all", label: "Toutes les enchères" },
  { id: "en-cours", label: "En cours" },
  { id: "a-cloturer", label: "À clôturer" },
  { id: "terminee", label: "Terminées" },
];

export default function AuctionList({
  auctions,
  loading,
  now,
  account,
  onOpen,
  onCreate,
  onGuide,
  onVerify,
}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [view, setView] = useState("grid");
  const shown = selectAuctions(auctions, { filter, query, sort, now });
  const count = (id) =>
    auctions.filter((a) => id === "all" || status(a, now) === id).length;

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> LES ENCHÈRES, EN TOUTE CONFIANCE
          </p>
          <h1 id="hero-title">
            À chaque objet,
            <br />
            une <em>nouvelle histoire.</em>
          </h1>
          <p className="hero-description">
            Des pièces à découvrir. Des offres transparentes.
            <br className="desktop-break" /> Et le plaisir de leur donner une
            seconde vie.
          </p>
          <div className="hero-actions">
            <button
              className="btn btn-primary"
              onClick={() =>
                document
                  .getElementById("catalogue")
                  .scrollIntoView({
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "instant"
                      : "smooth",
                    block: "start",
                  })
              }
            >
              Explorer les enchères <Icon name="arrow" size={18} />
            </button>
            <button className="text-button" onClick={onGuide}>
              <span className="play-circle">
                <Icon name="play" size={12} />
              </span>{" "}
              Comment ça marche
            </button>
          </div>
          <div className="hero-proof">
            <span className="proof-symbol">
              <Icon name="shield" size={17} />
            </span>
            <span>La transparence fait toute la différence.</span>
          </div>
        </div>
        <div className="hero-art">
          <img
            src="/images/editorial/watch.jpg"
            alt="Montre ancienne en acier, illustration de l’univers des objets de collection"
            fetchpriority="high"
          />
          <span className="hero-art-label">
            LES BELLES CHOSES
            <br />
            TRAVERSENT LE TEMPS.
          </span>
          <div className="photo-proof">
            <span>
              <Icon name="shield" size={23} />
            </span>
            <div>
              <strong>Des photos vérifiables</strong>
              <small>Une empreinte inscrite sur la blockchain</small>
            </div>
            <Icon name="check" size={16} />
          </div>
          <span className="hero-art-index">
            OBJETS SINGULIERS — NOUVELLES HISTOIRES
          </span>
        </div>
      </section>

      <div className="trust-strip">
        <div data-reveal>
          <Icon name="shield" />
          <span>
            <strong>Photos vérifiables</strong>
            <small>L’intégrité de l’image, à portée de clic</small>
          </span>
        </div>
        <div data-reveal style={{ "--reveal-delay": "65ms" }}>
          <Icon name="gavel" />
          <span>
            <strong>Offres transparentes</strong>
            <small>Un historique visible par tous</small>
          </span>
        </div>
        <div data-reveal style={{ "--reveal-delay": "130ms" }}>
          <Icon name="wallet" />
          <span>
            <strong>Vous gardez la main</strong>
            <small>Chaque transaction se confirme avec vous</small>
          </span>
        </div>
      </div>

      <section
        className="catalogue"
        id="catalogue"
        aria-labelledby="catalogue-title"
      >
        <div className="section-head" data-reveal>
          <div>
            <p className="eyebrow">LE CATALOGUE</p>
            <h2 id="catalogue-title">
              Votre prochaine trouvaille<span>.</span>
            </h2>
            <p className="muted">
              {loading
                ? "À la recherche des dernières pièces…"
                : `${auctions.length} objet${auctions.length > 1 ? "s" : ""} à découvrir, autant d’histoires à continuer.`}
            </p>
          </div>
          <button className="btn btn-outline" onClick={onCreate}>
            <Icon name="plus" size={17} /> Mettre un objet en vente
          </button>
        </div>
        <div className="catalogue-toolbar">
          <label className="search-field">
            <Icon name="search" size={19} />
            <span className="visually-hidden">Rechercher un objet</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une pièce, une envie…"
            />
          </label>
          <label className="sort-field">
            <span>Trier par</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Trier les enchères"
            >
              <option value="recent">Plus récentes</option>
              <option value="ending">Bientôt terminées</option>
              <option value="price">Prix croissant</option>
            </select>
            <Icon name="down" size={14} />
          </label>
        </div>
        <div className="catalogue-controls">
          <div className="filters" aria-label="Filtrer les enchères">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`chip ${filter === f.id ? "active" : ""}`}
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                <span className="chip-count">{count(f.id)}</span>
              </button>
            ))}
          </div>
          <div className="view-switch" aria-label="Affichage du catalogue">
            <button
              className={`icon-button ${view === "grid" ? "active" : ""}`}
              aria-label="Afficher en grille"
              aria-pressed={view === "grid"}
              onClick={() => setView("grid")}
            >
              <Icon name="grid" size={17} />
            </button>
            <button
              className={`icon-button ${view === "list" ? "active" : ""}`}
              aria-label="Afficher en liste"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <Icon name="list" size={19} />
            </button>
          </div>
        </div>
        <div
          className="catalogue-results"
          key={`${filter}:${sort}:${view}`}
          aria-live="polite"
          aria-busy={loading}
        >
          {loading ? (
            <div className="skeleton-grid" aria-label="Chargement des enchères">
              {[0, 1, 2].map((i) => (
                <div className="skeleton-card" key={i}>
                  <div />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : !shown.length ? (
            <div className="catalogue-empty" data-reveal>
              <span className="empty-emblem">
                <Icon name={auctions.length ? "search" : "gavel"} size={29} />
              </span>
              <div>
                <p className="eyebrow">
                  {auctions.length
                    ? "ON CONTINUE À CHERCHER ?"
                    : "LE DÉBUT D’UNE BELLE HISTOIRE"}
                </p>
                <h3>
                  {auctions.length
                    ? "Cette pièce se fait encore désirer."
                    : "Et si la première pièce était la vôtre ?"}
                </h3>
                <p>
                  {auctions.length
                    ? "Aucun objet ne correspond à ces critères. Essayez un autre mot ou explorez toutes les enchères."
                    : "Le catalogue attend ses premières découvertes. Proposez un objet, fixez vos conditions et laissez les offres commencer."}
                </p>
                <button
                  className="text-button"
                  onClick={
                    auctions.length
                      ? () => {
                          setFilter("all");
                          setQuery("");
                        }
                      : onCreate
                  }
                >
                  {auctions.length
                    ? "Réinitialiser les filtres"
                    : "Créer la première enchère"}
                  <Icon name="arrow" size={17} />
                </button>
              </div>
              <span className="empty-decoration" aria-hidden="true">
                01
              </span>
            </div>
          ) : (
            <div
              className={`auction-grid ${view === "list" ? "auction-view-list" : ""}`}
            >
              {shown.map((a, index) => (
                <AuctionCard
                  key={a.id}
                  auction={a}
                  now={now}
                  account={account}
                  onOpen={onOpen}
                  delay={(index % 3) * 55}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="how-section" aria-labelledby="how-title">
        <div className="how-intro" data-reveal>
          <p className="eyebrow">SIMPLE. OUVERT. VÉRIFIABLE.</p>
          <h2 id="how-title">
            Le plaisir de chiner.
            <br />
            <em>La confiance en plus.</em>
          </h2>
          <button className="text-button" onClick={onGuide}>
            Découvrir le fonctionnement <Icon name="arrow" size={17} />
          </button>
        </div>
        <div className="how-cards">
          <article data-reveal>
            <span className="step-number">01 /</span>
            <Icon name="wallet" size={24} />
            <h3>Connectez-vous</h3>
            <p>
              Votre portefeuille, votre identité. Vous gardez le contrôle de
              chaque transaction.
            </p>
          </article>
          <article data-reveal style={{ "--reveal-delay": "65ms" }}>
            <span className="step-number">02 /</span>
            <Icon name="gavel" size={24} />
            <h3>Faites votre offre</h3>
            <p>
              Découvrez un objet, consultez son historique et entrez dans
              l’enchère.
            </p>
          </article>
          <article data-reveal style={{ "--reveal-delay": "130ms" }}>
            <span className="step-number">03 /</span>
            <Icon name="shield" size={24} />
            <h3>Vérifiez par vous-même</h3>
            <p>
              Une photo ou une annonce signée ? La preuve se consulte en
              quelques clics.
            </p>
            <button className="text-button" onClick={onVerify}>
              Vérifier une annonce <Icon name="arrow" size={15} />
            </button>
          </article>
        </div>
      </section>
    </>
  );
}

function AuctionCard({ auction: a, now, account, onOpen, delay }) {
  const hasBid = a.highestBidder !== ZERO_ADDRESS;
  const mine = sameAddress(a.seller, account);
  const leading = hasBid && sameAddress(a.highestBidder, account);
  return (
    <button
      className="auction-card"
      data-reveal
      style={{ "--reveal-delay": `${delay}ms` }}
      onClick={() => onOpen(a.id)}
      aria-label={`Voir l’enchère : ${a.itemName}`}
    >
      <div className="auction-media">
        <ItemImage src={a.imageURI} alt={a.itemName} />
        <span className="media-badge">
          <StatusBadge auction={a} now={now} />
        </span>
        <span className="media-open">
          <Icon name="diagonal" size={19} />
        </span>
      </div>
      <div className="auction-card-body">
        <div className="card-top">
          <span className="auction-id">
            PIÈCE Nº {String(a.id + 1).padStart(3, "0")}
          </span>
          <span className="seller-avatar" title={a.seller}>
            {a.seller.slice(2, 4).toUpperCase()}
          </span>
        </div>
        <h3>{a.itemName}</h3>
        <p className="desc">
          {a.description ||
            "Une pièce à découvrir et une histoire à poursuivre."}
        </p>
        <div className="auction-card-bottom">
          <div>
            <span className="stat-label">
              {hasBid ? "Meilleure offre" : "Mise à prix"}
            </span>
            <strong className="auction-price">
              {formatEth(hasBid ? a.highestBid : a.minPrice)}
            </strong>
          </div>
          <div className="auction-timer">
            <Icon name="clock" size={14} />
            <span>
              {a.ended
                ? hasBid
                  ? shortAddress(a.highestBidder)
                  : "Sans offre"
                : formatRemaining(a.endTime - now)}
            </span>
          </div>
        </div>
        {(mine || leading) && (
          <div className="card-tags">
            {mine && <span className="tag">Votre enchère</span>}
            {leading && <span className="tag tag-ok">Vous êtes en tête</span>}
          </div>
        )}
      </div>
    </button>
  );
}
