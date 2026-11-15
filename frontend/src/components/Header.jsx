import { formatEth, shortAddress } from "../lib/blockchain.js";
import Icon from "./Icon.jsx";

const TABS = [
  { id: "list", label: "Explorer" },
  { id: "create", label: "Vendre un objet" },
  { id: "verify", label: "Vérifier une annonce" },
  { id: "account", label: "Mon compte" },
];

export function Brand({ onClick }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Enchères — accueil">
      <span className="brand-mark">
        <Icon name="gavel" size={23} />
      </span>
      <span className="brand-word">
        enchères<span>.</span>
        <small>LES OBJETS ONT UNE HISTOIRE</small>
      </span>
    </button>
  );
}

export default function Header({
  page,
  onNavigate,
  wallet,
  onConnect,
  onGuide,
}) {
  return (
    <>
      <div className="announcement-bar">
        <div className="container announcement-inner">
          <span>
            <span className="dot dot-ok" /> Réseau local{" "}
            <span className="announcement-divider">/</span> ETH de test
          </span>
          <button onClick={onGuide}>
            Les enchères, en toute transparence <Icon name="arrow" size={13} />
          </button>
        </div>
      </div>
      <header className="header">
        <div className="container header-inner">
          <Brand onClick={() => onNavigate("list")} />
          <nav className="tabs" aria-label="Navigation principale">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`tab ${page === tab.id ? "active" : ""}`}
                aria-current={page === tab.id ? "page" : undefined}
                onClick={() => onNavigate(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <button
            className={`btn wallet-button ${wallet.account ? "wallet-connected" : "btn-primary"}`}
            onClick={onConnect}
            disabled={wallet.connecting}
            aria-label={
              wallet.account
                ? "Ouvrir mon portefeuille"
                : "Connecter le portefeuille"
            }
          >
            <Icon name="wallet" size={18} />
            {wallet.account ? (
              <>
                <span
                  className={`dot ${wallet.wrongNetwork ? "dot-warn" : "dot-ok"}`}
                />
                <span className="wallet-addr">
                  {shortAddress(wallet.account)}
                </span>
                {wallet.balance !== null && (
                  <span className="wallet-balance">
                    {formatEth(wallet.balance, 2)}
                  </span>
                )}
              </>
            ) : (
              <span>
                {wallet.connecting ? "Connexion…" : "Connecter le portefeuille"}
              </span>
            )}
          </button>
        </div>
      </header>
    </>
  );
}
