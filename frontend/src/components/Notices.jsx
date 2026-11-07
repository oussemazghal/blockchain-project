import { RPC_URL } from "../config.js";

// Bandeaux d'avertissement : MetaMask absent, mauvais réseau, contrat non déployé…
export default function Notices({ wallet, deployed }) {
  return (
    <div className="notices">
      {deployed === null && (
        <div className="notice notice-error">
          <strong>Ganache est injoignable</strong> à l'adresse {RPC_URL}. Lancez Ganache
          (application ou <code>npm run ganache</code>) puis rechargez la page.
        </div>
      )}
      {deployed === false && (
        <div className="notice notice-error">
          <strong>Contrat introuvable sur ce réseau.</strong> Exécutez{" "}
          <code>npx truffle migrate --reset</code> puis rechargez la page.
        </div>
      )}
      {!wallet.metaMaskInstalled && (
        <div className="notice notice-warn">
          <strong>MetaMask n'est pas installé.</strong> Vous pouvez consulter les enchères, mais
          il faut l'extension MetaMask pour créer une enchère ou enchérir.
        </div>
      )}
      {wallet.wrongNetwork && (
        <div className="notice notice-warn">
          <strong>Mauvais réseau dans MetaMask.</strong> Sélectionnez le réseau Ganache local.{" "}
          <button className="btn btn-small" onClick={wallet.switchNetwork}>
            Basculer sur Ganache
          </button>
        </div>
      )}
    </div>
  );
}
