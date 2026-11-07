import CopyButton from "./CopyButton.jsx";
import { useProfile } from "../hooks/useProfile.js";

// Identité du vendeur : profil déclaré (nom + lien) et adresse complète.
// L'adresse est la seule donnée garantie : elle a créé l'enchère. Le nom est
// déclaré par le vendeur ; il devient fiable quand la page indiquée affiche
// elle-même cette adresse (lien dans les deux sens).
export default function SellerInfo({ address, isYou }) {
  const { profile } = useProfile(address);

  return (
    <div className="seller-info">
      <div className="seller-head">
        <span className="seller-name">{profile ? profile.name : "Vendeur sans profil"}</span>
        {isYou && <span className="tag">vous</span>}
      </div>
      {profile?.link && (
        <a className="seller-link" href={safeLink(profile.link)} target="_blank" rel="noopener noreferrer">
          {profile.link}
        </a>
      )}
      <div className="addr-row">
        <code className="addr-full">{address}</code>
        <CopyButton text={address} label="Copier l'adresse" />
      </div>
      <p className="hint">
        {profile
          ? "Nom et lien déclarés par le vendeur. Ils sont fiables si la page indiquée affiche cette même adresse."
          : "Comparez cette adresse avec celle que le vendeur publie sur son site ou ses réseaux."}
      </p>
    </div>
  );
}

// N'ouvre que des liens http(s) : un lien « javascript: » serait dangereux
export function safeLink(link) {
  return /^https?:\/\//i.test(link) ? link : `https://${link.replace(/^[a-z]+:/i, "")}`;
}
