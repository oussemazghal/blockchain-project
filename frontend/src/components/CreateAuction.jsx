import { useState } from "react";
import { parseEther } from "ethers";
import { readContract } from "../lib/blockchain.js";
import { hashFile, hashImageAtUrl, shortHash, ZERO_HASH } from "../lib/trust.js";
import FileInput from "./FileInput.jsx";

const UNITS = [
  { id: "minutes", label: "minutes", seconds: 60 },
  { id: "hours", label: "heures", seconds: 3600 },
  { id: "days", label: "jours", seconds: 86400 },
];

export default function CreateAuction({ canWrite, busy, runTx, onCreated }) {
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [duration, setDuration] = useState("10");
  const [unit, setUnit] = useState("minutes");
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null); // { name, hash, preview }

  async function submit(e) {
    e.preventDefault();
    setError("");

    // Contrôles côté interface (le smart contract refait toutes les vérifications)
    if (!itemName.trim()) return setError("Le nom de l'article est obligatoire.");
    let price;
    try {
      price = parseEther(minPrice.replace(",", "."));
    } catch {
      return setError("Prix minimal invalide.");
    }
    if (price <= 0n) return setError("Le prix minimal doit être supérieur à 0.");
    const d = Number(duration);
    if (!Number.isInteger(d) || d <= 0) return setError("La durée doit être un entier positif.");
    const seconds = d * UNITS.find((u) => u.id === unit).seconds;

    // Photo : on enregistre son lien ET l'empreinte SHA-256 de son contenu
    const url = imageUrl.trim();
    let imageHash = ZERO_HASH;
    if (imageFile && !url) {
      return setError("Indiquez le lien où la photo est publiée (pour la démo locale : /images/nom-du-fichier).");
    }
    if (url) {
      const remoteHash = await hashImageAtUrl(url);
      if (imageFile) {
        if (remoteHash && remoteHash !== imageFile.hash) {
          return setError("Le fichier sélectionné ne correspond pas à l'image publiée à ce lien.");
        }
        imageHash = imageFile.hash;
      } else if (remoteHash) {
        imageHash = remoteHash;
      } else {
        return setError(
          "Impossible de lire l'image à ce lien (accès bloqué par le site qui l'héberge). " +
            "Sélectionnez aussi le fichier pour calculer son empreinte."
        );
      }
    }

    const receipt = await runTx(
      "Création de l'enchère.",
      `Enchère « ${itemName.trim()} » créée.`,
      (c) => c.createAuction(itemName.trim(), description.trim(), url, imageHash, price, seconds)
    );
    if (!receipt) return;

    // Récupère l'identifiant de la nouvelle enchère dans l'événement AuctionCreated
    const created = receipt.logs
      .map((log) => {
        try {
          return readContract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((parsed) => parsed?.name === "AuctionCreated");
    if (created) onCreated(Number(created.args.auctionId));
  }

  return (
    <section className="narrow">
      <h1>Créer une enchère</h1>
      <p className="muted">
        L'article est enregistré dans le smart contract avec un prix minimal et une durée fixe. La
        création est une transaction signée avec MetaMask.
      </p>

      <form className="card form" onSubmit={submit} onChange={() => error && setError("")}>
        <label>
          Nom de l'article *
          <input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Ex. : Montre ancienne"
            maxLength={80}
          />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="État, caractéristiques…"
            rows={3}
            maxLength={300}
          />
        </label>
        <fieldset className="image-fields">
          <legend>Photo (facultative)</legend>
          <label>
            Lien public de la photo
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://… ou /images/montre.jpg"
            />
          </label>
          <FileInput
            label="Fichier de la photo"
            onFile={async (file) => {
              if (!file) return setImageFile(null);
              setImageFile({ name: file.name, hash: await hashFile(file), preview: URL.createObjectURL(file) });
            }}
          />
          {(imageFile || imageUrl.trim()) && (
            <div className="image-preview">
              <img src={imageFile ? imageFile.preview : imageUrl.trim()} alt="Aperçu" />
              {imageFile && (
                <span className="hint">
                  Empreinte SHA-256 : <code>{shortHash(imageFile.hash)}</code>
                </span>
              )}
            </div>
          )}
          <p className="hint">
            Seuls le lien et l'empreinte SHA-256 de l'image sont enregistrés sur la blockchain. Si l'image
            est remplacée plus tard, l'application le détectera. Le fichier permet de calculer l'empreinte
            quand le site qui héberge l'image en bloque la lecture.
          </p>
        </fieldset>

        <div className="row">
          <label>
            Prix minimal (ETH) *
            <input
              inputMode="decimal"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Ex. : 1"
            />
          </label>
          <label>
            Durée *
            <div className="input-group">
              <input
                type="number"
                min="1"
                step="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </label>
        </div>
        <p className="hint">
          Les données sont stockées sur la blockchain : gardez un texte court (pas d'images) pour
          limiter le coût en gas.
        </p>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={!canWrite || busy}>
          {busy ? "Transaction en cours…" : "Créer l'enchère"}
        </button>
        {!canWrite && <p className="hint">Connectez MetaMask sur le réseau Ganache pour créer une enchère.</p>}
      </form>
    </section>
  );
}
