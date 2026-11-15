import { useEffect, useId, useRef, useState } from "react";
import { CHAIN_ID, RPC_URL } from "../config.js";
import { errorMessage, formatEth, shortAddress } from "../lib/blockchain.js";
import Icon from "./Icon.jsx";

export default function ExperienceDialog({
  kind,
  wallet,
  onClose,
  onConnect,
  onSwitch,
  onCreate,
}) {
  const dialog = useRef(null);
  const titleId = useId();
  const [actionError, setActionError] = useState("");
  const [working, setWorking] = useState(false);
  async function runAction(action) {
    setActionError("");
    setWorking(true);
    try {
      await action();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setWorking(false);
    }
  }
  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const isWallet = kind === "wallet";
  return (
    <dialog
      ref={dialog}
      className="experience-dialog"
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="dialog-content">
        <button
          className="icon-button dialog-close"
          onClick={onClose}
          aria-label="Fermer la fenêtre"
        >
          <Icon name="close" />
        </button>
        <span className="feature-icon">
          <Icon name={isWallet ? "wallet" : "gavel"} size={25} />
        </span>
        <p className="eyebrow">
          {isWallet ? "VOTRE PORTEFEUILLE" : "COMMENT ÇA MARCHE"}
        </p>
        <h2 id={titleId}>
          {isWallet
            ? wallet.account
              ? "Vous êtes chez vous."
              : "Entrez dans l’enchère."
            : "Un objet. Une offre. Une nouvelle histoire."}
        </h2>
        {isWallet ? (
          <>
            <p className="muted">
              {wallet.account
                ? "Retrouvez votre compte et le réseau utilisé pour vos enchères."
                : "MetaMask vous permet de créer des enchères, de faire une offre et de signer vos annonces."}
            </p>
            {wallet.account && (
              <div className="wallet-summary">
                <span className="avatar">
                  <Icon name="user" />
                </span>
                <div>
                  <strong title={wallet.account}>
                    {shortAddress(wallet.account)}
                  </strong>
                  <span>
                    {wallet.balance === null
                      ? "Solde en cours de lecture…"
                      : formatEth(wallet.balance, 3)}
                  </span>
                </div>
                <span className="connection-label">
                  <span
                    className={`dot ${wallet.wrongNetwork ? "dot-warn" : "dot-ok"}`}
                  />
                  {wallet.wrongNetwork ? "Autre réseau" : "Connecté"}
                </span>
              </div>
            )}
            <dl className="network-details">
              <div>
                <dt>Réseau</dt>
                <dd>Ganache local · ETH de test</dd>
              </div>
              <div>
                <dt>Chain ID</dt>
                <dd>{CHAIN_ID}</dd>
              </div>
              <div>
                <dt>Adresse RPC</dt>
                <dd>
                  <code>{RPC_URL}</code>
                </dd>
              </div>
            </dl>
            {actionError && (
              <p className="form-error" role="alert">
                {actionError}
              </p>
            )}
            {!wallet.metaMaskInstalled ? (
              <>
                <p className="notice notice-warn">
                  MetaMask n’est pas disponible dans ce navigateur. Installez
                  l’extension ou ouvrez cette page dans votre navigateur
                  habituel.
                </p>
                <a
                  className="btn btn-primary btn-block"
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Découvrir MetaMask <Icon name="diagonal" size={17} />
                </a>
              </>
            ) : wallet.wrongNetwork ? (
              <button
                className="btn btn-primary btn-block"
                disabled={working}
                onClick={() => runAction(onSwitch)}
              >
                {working ? "Changement de réseau…" : "Basculer sur Ganache"}
                <Icon name="arrow" size={18} />
              </button>
            ) : !wallet.account ? (
              <button
                className="btn btn-primary btn-block"
                onClick={() => runAction(onConnect)}
                disabled={wallet.connecting || working}
              >
                {wallet.connecting || working
                  ? "Connexion en cours…"
                  : "Connecter MetaMask"}
                <Icon name="arrow" size={18} />
              </button>
            ) : (
              <button className="btn btn-primary btn-block" onClick={onClose}>
                Continuer à explorer <Icon name="arrow" size={18} />
              </button>
            )}
            <p className="dialog-footnote">
              <Icon name="shield" size={14} /> Vos clés restent dans votre
              portefeuille.
            </p>
          </>
        ) : (
          <>
            <p className="muted">
              Le plaisir de chiner, avec des offres et des transactions que vous
              pouvez vérifier.
            </p>
            <ol className="guide-steps">
              <li>
                <span>01</span>
                <div>
                  <h3>Connectez votre portefeuille</h3>
                  <p>
                    Choisissez votre compte MetaMask sur le réseau Ganache
                    local.
                  </p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>Trouvez la pièce qui vous ressemble</h3>
                  <p>
                    Consultez les photos, le vendeur et l’historique, puis
                    proposez votre offre.
                  </p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>Laissez l’enchère se terminer</h3>
                  <p>
                    À la clôture, le vendeur reçoit la meilleure offre. Si vous
                    êtes dépassé, retirez vos fonds depuis votre compte.
                  </p>
                </div>
              </li>
            </ol>
            <button className="btn btn-primary btn-block" onClick={onCreate}>
              Mettre un objet aux enchères <Icon name="arrow" size={18} />
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
