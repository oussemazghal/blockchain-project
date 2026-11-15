import { useEffect, useState } from "react";
import { parseEther } from "ethers";
import { readContract } from "../lib/blockchain.js";
import {
  hashFile,
  hashImageAtUrl,
  shortHash,
  ZERO_HASH,
} from "../lib/trust.js";
import FileInput from "./FileInput.jsx";
import Icon from "./Icon.jsx";
import ItemImage from "./ItemImage.jsx";

const UNITS = [
  { id: "minutes", label: "minutes", seconds: 60 },
  { id: "hours", label: "heures", seconds: 3600 },
  { id: "days", label: "jours", seconds: 86400 },
];

export default function CreateAuction({
  canWrite,
  busy,
  runTx,
  onCreated,
  onConnect,
}) {
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [duration, setDuration] = useState("10");
  const [unit, setUnit] = useState("minutes");
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null); // { name, hash, preview }
  useEffect(
    () => () => {
      if (imageFile?.preview) URL.revokeObjectURL(imageFile.preview);
    },
    [imageFile],
  );

  async function submit(e) {
    e.preventDefault();
    setError("");

    // Contrôles côté interface (le smart contract refait toutes les vérifications)
    if (!itemName.trim())
      return setError("Le nom de l'article est obligatoire.");
    let price;
    try {
      price = parseEther(minPrice.replace(",", "."));
    } catch {
      return setError("Prix minimal invalide.");
    }
    if (price <= 0n)
      return setError("Le prix minimal doit être supérieur à 0.");
    const d = Number(duration);
    if (!Number.isInteger(d) || d <= 0)
      return setError("La durée doit être un entier positif.");
    const seconds = d * UNITS.find((u) => u.id === unit).seconds;

    // Photo : on enregistre son lien ET l'empreinte SHA-256 de son contenu
    const url = imageUrl.trim();
    let imageHash = ZERO_HASH;
    if (imageFile && !url) {
      return setError(
        "Indiquez le lien où la photo est publiée (pour la démo locale : /images/nom-du-fichier).",
      );
    }
    if (url) {
      const remoteHash = await hashImageAtUrl(url);
      if (imageFile) {
        if (remoteHash && remoteHash !== imageFile.hash) {
          return setError(
            "Le fichier sélectionné ne correspond pas à l'image publiée à ce lien.",
          );
        }
        imageHash = imageFile.hash;
      } else if (remoteHash) {
        imageHash = remoteHash;
      } else {
        return setError(
          "Impossible de lire l'image à ce lien (accès bloqué par le site qui l'héberge). " +
            "Sélectionnez aussi le fichier pour calculer son empreinte.",
        );
      }
    }

    const receipt = await runTx(
      "Création de l'enchère.",
      `Enchère « ${itemName.trim()} » créée.`,
      (c) =>
        c.createAuction(
          itemName.trim(),
          description.trim(),
          url,
          imageHash,
          price,
          seconds,
        ),
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
    <section>
      <div className="page-heading">
        <p className="eyebrow">CÔTÉ VENDEUR</p>
        <h1>
          Votre objet mérite
          <br />
          <em>une nouvelle histoire.</em>
        </h1>
        <p className="muted">
          Quelques détails, une mise à prix et votre pièce est prête à
          rencontrer son prochain propriétaire.
        </p>
      </div>
      <ol className="step-rail">
        <li>
          <span>01</span> Présenter l’objet
        </li>
        <li>
          <span>02</span> Fixer les conditions
        </li>
        <li>
          <span>03</span> Confirmer dans MetaMask
        </li>
      </ol>
      <form
        className="create-layout"
        onSubmit={submit}
        onChange={() => error && setError("")}
      >
        <div>
          <div className="card">
            <div className="form-section-title">
              <span>01</span>
              <h2>Faisons connaissance avec votre objet</h2>
            </div>
            <div className="form">
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
                <legend>Une photo vaut mille mots · facultative</legend>
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
                    setImageFile({
                      name: file.name,
                      hash: await hashFile(file),
                      preview: URL.createObjectURL(file),
                    });
                  }}
                />
                {(imageFile || imageUrl.trim()) && (
                  <div className="image-preview">
                    <img
                      src={imageFile ? imageFile.preview : imageUrl.trim()}
                      alt="Aperçu"
                    />
                    {imageFile && (
                      <span className="hint">
                        Empreinte SHA-256 :{" "}
                        <code>{shortHash(imageFile.hash)}</code>
                      </span>
                    )}
                  </div>
                )}
                <p className="hint">
                  L’empreinte de votre photo est enregistrée à la création : vos
                  visiteurs pourront vérifier qu’elle n’a pas changé. Vous
                  pouvez essayer avec <code>/images/montre.svg</code>.
                </p>
              </fieldset>
            </div>
          </div>
          <div className="card">
            <div className="form-section-title">
              <span>02</span>
              <h2>À vous de fixer les conditions</h2>
            </div>
            <div className="form">
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
                      aria-label="Durée de l’enchère"
                      min="1"
                      step="1"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      aria-label="Unité de durée"
                    >
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
                L’enchère démarre dès sa création. Choisissez une durée qui
                laisse le temps aux curieux de découvrir votre objet.
              </p>
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="form-footer">
            <p className="hint">
              <Icon name="shield" size={17} /> Votre confirmation dans MetaMask
              sera nécessaire pour publier.
            </p>
            <button className="btn btn-primary" disabled={!canWrite || busy}>
              {busy ? "Création en cours…" : "Créer l'enchère"}
              <Icon name="arrow" size={17} />
            </button>
          </div>
          {!canWrite && (
            <div className="notice notice-warn">
              <span>
                Connectez votre portefeuille sur Ganache pour publier votre
                objet.
              </span>
              <button type="button" className="text-button" onClick={onConnect}>
                Se connecter <Icon name="arrow" size={15} />
              </button>
            </div>
          )}
        </div>
        <aside className="preview-card" data-reveal>
          <div className="preview-label">
            <Icon name="image" size={15} /> APERÇU DE VOTRE ANNONCE
          </div>
          <ItemImage
            src={imageFile?.preview || imageUrl.trim()}
            alt={itemName || "Votre objet"}
          />
          <div className="preview-body">
            <p className="eyebrow">LA PROCHAINE BELLE DÉCOUVERTE</p>
            <h3>{itemName.trim() || "Votre pièce, ici."}</h3>
            <p className="hint">
              {description.trim() ||
                "Une courte description pour donner envie d’en savoir plus."}
            </p>
            <span className="stat-label">Mise à prix</span>
            <strong className="auction-price">
              {minPrice.trim() || "—"} ETH
            </strong>
            <p className="preview-note">
              <Icon name="clock" size={16} /> Durée : {duration || "—"}{" "}
              {UNITS.find((u) => u.id === unit).label}
            </p>
            <p className="preview-note">
              <Icon name="shield" size={16} /> Cet aperçu devient une enchère
              après votre confirmation.
            </p>
          </div>
        </aside>
      </form>
    </section>
  );
}
