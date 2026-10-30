import { formatEth, shortAddress } from "../lib/blockchain.js";

const TABS = [
  { id: "list", label: "Enchères" },
  { id: "create", label: "Créer une enchère" },
  { id: "account", label: "Mon compte" },
  { id: "verify", label: "Vérifier" },
];

export default function Header({ page, onNavigate, wallet }) {
  return (
    <header className="header">
      <div className="container header-inner">
        <button className="brand" onClick={() => onNavigate("list")}>
          <span className="brand-mark" aria-hidden="true">⚖</span>
          <span>
            <strong>Enchères</strong> Blockchain
          </span>
        </button>

        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${page === t.id ? "active" : ""}`}
              onClick={() => onNavigate(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="wallet">
          {wallet.account ? (
            <>
              <span className={`dot ${wallet.wrongNetwork ? "dot-warn" : "dot-ok"}`} />
              <span className="wallet-addr" title={wallet.account}>
                {shortAddress(wallet.account)}
              </span>
              {wallet.balance !== null && (
                <span className="wallet-balance">{formatEth(wallet.balance, 3)}</span>
              )}
            </>
          ) : (
            <button
              className="btn btn-primary"
              onClick={wallet.connect}
              disabled={!wallet.metaMaskInstalled || wallet.connecting}
            >
              {wallet.connecting ? "Connexion…" : "Connecter MetaMask"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
