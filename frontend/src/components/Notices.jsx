import { RPC_URL } from "../config.js";
import Icon from "./Icon.jsx";

export default function Notices({ wallet, deployed, onConnect, onSwitch }) {
  return (
    <div className="notices" aria-live="polite">
      {deployed === null && (
        <div className="notice notice-error">
          <Icon name="info" />
          <span>
            <strong>Le réseau local est indisponible.</strong> Lancez Ganache
            sur <code>{RPC_URL}</code>, puis rechargez la page.
          </span>
        </div>
      )}
      {deployed === false && (
        <div className="notice notice-error">
          <Icon name="info" />
          <span>
            <strong>Le contrat doit être déployé.</strong> Exécutez{" "}
            <code>npm run migrate</code>, puis rechargez la page.
          </span>
        </div>
      )}
      {!wallet.account && (
        <div className="visitor-notice">
          <span>
            <Icon name="globe" size={16} /> Un regard suffit pour découvrir. Un
            portefeuille suffit pour participer.
          </span>
          <button onClick={onConnect}>
            Connecter mon portefeuille <Icon name="arrow" size={15} />
          </button>
        </div>
      )}
      {wallet.wrongNetwork && (
        <div className="notice notice-warn">
          <Icon name="info" />
          <span>
            <strong>Vous êtes sur un autre réseau.</strong> Choisissez Ganache
            local pour participer aux enchères.
          </span>
          <button className="btn btn-small" onClick={onSwitch}>
            Changer de réseau <Icon name="arrow" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
