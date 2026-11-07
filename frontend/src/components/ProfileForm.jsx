import { useEffect, useState } from "react";
import CopyButton from "./CopyButton.jsx";
import { useProfile } from "../hooks/useProfile.js";

// Profil public du vendeur, enregistré dans le smart contract
export default function ProfileForm({ account, canWrite, busy, runTx }) {
  const { profile, reload } = useProfile(account);
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setName(profile?.name || "");
    setLink(profile?.link || "");
  }, [profile]);

  async function save(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Le nom du profil est obligatoire.");
    const receipt = await runTx("Enregistrement du profil.", "Profil enregistré.", (c) =>
      c.setProfile(name.trim(), link.trim())
    );
    if (receipt) reload();
  }

  return (
    <div className="card">
      <h2>Mon profil de vendeur</h2>
      <p className="muted">
        Ce nom et ce lien sont affichés sur vos enchères. Pour que les acheteurs puissent vous
        authentifier, publiez aussi votre adresse sur la page indiquée (bio, site…) : le lien dans
        les deux sens prouve que cette adresse est bien la vôtre.
      </p>
      <form className="form" onSubmit={save} onChange={() => error && setError("")}>
        <div className="row">
          <label>
            Nom affiché *
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={64} placeholder="Ex. : Boutique Nour" />
          </label>
          <label>
            Lien (site, réseau social)
            <input value={link} onChange={(e) => setLink(e.target.value)} maxLength={200} placeholder="https://instagram.com/…" />
          </label>
        </div>
        <div className="addr-row">
          <span className="hint">Votre adresse à publier :</span>
          <code className="addr-full">{account}</code>
          <CopyButton text={account} label="Copier" />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary" disabled={!canWrite || busy}>
          {busy ? "Transaction en cours…" : profile ? "Mettre à jour le profil" : "Enregistrer le profil"}
        </button>
      </form>
    </div>
  );
}
