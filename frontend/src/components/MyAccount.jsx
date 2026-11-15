import { useCallback, useEffect, useState } from "react";
import StatusBadge from "./StatusBadge.jsx";
import { formatEth, readContract, sameAddress } from "../lib/blockchain.js";
import ProfileForm from "./ProfileForm.jsx";
import Icon from "./Icon.jsx";

export default function MyAccount({
  account,
  auctions,
  now,
  canWrite,
  busy,
  runTx,
  onOpen,
  onConnect,
}) {
  const [pending, setPending] = useState(null);

  const loadPending = useCallback(async () => {
    if (!account) return setPending(null);
    try {
      setPending(await readContract.pendingReturns(account));
    } catch {
      setPending(null);
    }
  }, [account]);

  // Recharge le montant à retirer à chaque changement des enchères (nouvelle offre, clôture…)
  useEffect(() => {
    loadPending();
  }, [loadPending, auctions]);

  if (!account) {
    return (
      <section>
        <div className="page-heading">
          <p className="eyebrow">VOTRE ESPACE</p>
          <h1>
            Chaque trouvaille
            <br />
            <em>commence avec vous.</em>
          </h1>
          <p className="muted">
            Vos enchères, vos coups de cœur remportés et vos fonds, réunis au
            même endroit.
          </p>
        </div>
        <div className="card account-empty">
          <span className="empty-emblem">
            <Icon name="wallet" size={30} />
          </span>
          <h2>Votre portefeuille vous ouvre les portes.</h2>
          <p className="muted">
            Connectez MetaMask pour retrouver vos enchères, suivre vos offres et
            récupérer les fonds de vos offres dépassées.
          </p>
          <button className="btn btn-primary" onClick={onConnect}>
            Connecter mon portefeuille <Icon name="arrow" size={17} />
          </button>
        </div>
      </section>
    );
  }

  const created = auctions.filter((a) => sameAddress(a.seller, account));
  const won = auctions.filter(
    (a) => a.ended && sameAddress(a.highestBidder, account),
  );
  const leading = auctions.filter(
    (a) => !a.ended && sameAddress(a.highestBidder, account),
  );

  async function withdraw() {
    const receipt = await runTx(
      "Retrait des fonds.",
      `${formatEth(pending)} retirés vers votre portefeuille.`,
      (c) => c.withdraw(),
    );
    if (receipt) loadPending();
  }

  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">VOTRE ESPACE</p>
        <h1>
          Vos objets. Vos envies.
          <br />
          <em>Vos prochaines histoires.</em>
        </h1>
      </div>
      <div className="account-identity">
        <span className="avatar">
          <Icon name="user" />
        </span>
        <div>
          <span className="stat-label">Votre adresse connectée</span>
          <code className="addr-full">{account}</code>
        </div>
      </div>

      <div className="card withdraw-card">
        <div>
          <span className="stat-label">Fonds à retirer</span>
          <span className="stat-value big">
            {pending === null ? "…" : formatEth(pending)}
          </span>
          <p className="muted">
            Montant de vos offres dépassées. Il reste dans le contrat jusqu'à ce
            que vous le retiriez.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={withdraw}
          disabled={!canWrite || busy || !pending || pending === 0n}
        >
          {busy ? "Transaction en cours…" : "Retirer mes fonds"}
        </button>
      </div>

      <ProfileForm
        account={account}
        canWrite={canWrite}
        busy={busy}
        runTx={runTx}
      />
      <div className="account-activity">
        <MiniList
          title="Enchères où je suis en tête"
          items={leading}
          now={now}
          onOpen={onOpen}
        />
        <MiniList
          title="Enchères remportées"
          items={won}
          now={now}
          onOpen={onOpen}
        />
        <MiniList
          title="Mes enchères (vendeur)"
          items={created}
          now={now}
          onOpen={onOpen}
        />
      </div>
    </section>
  );
}

function MiniList({ title, items, now, onOpen }) {
  return (
    <div className="card">
      <h2>
        {title} <span className="chip-count">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="muted">Aucune.</p>
      ) : (
        <ul className="mini-list">
          {items.map((a) => (
            <li key={a.id}>
              <button onClick={() => onOpen(a.id)}>
                <span>
                  <span className="auction-id">#{a.id}</span> {a.itemName}
                </span>
                <span className="mini-right">
                  {formatEth(a.highestBid > 0n ? a.highestBid : a.minPrice)}
                  <StatusBadge auction={a} now={now} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
