import { useEffect, useState } from "react";
import CopyButton from "./CopyButton.jsx";
import FileInput from "./FileInput.jsx";
import { hashFile, hashImageAtUrl, shortHash } from "../lib/trust.js";

// Affiche la photo de l'article et vérifie qu'elle correspond à l'empreinte
// SHA-256 enregistrée dans le contrat lors de la création de l'enchère.
export default function ImageVerifier({ imageURI, imageHash }) {
  const [state, setState] = useState("checking"); // checking | ok | mismatch | unreachable
  const [manual, setManual] = useState(null); // résultat d'une vérification manuelle
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState("checking");
    setManual(null);
    setBroken(false);
    hashImageAtUrl(imageURI).then((h) => {
      if (cancelled) return;
      if (h === null) setState("unreachable");
      else setState(h.toLowerCase() === imageHash.toLowerCase() ? "ok" : "mismatch");
    });
    return () => {
      cancelled = true;
    };
  }, [imageURI, imageHash]);

  async function checkFile(file) {
    if (!file) return setManual(null);
    const h = await hashFile(file);
    setManual(h.toLowerCase() === imageHash.toLowerCase() ? "ok" : "mismatch");
  }

  const status = manual || state;

  return (
    <div className="image-block">
      {broken ? (
        <div className="image-missing">Image introuvable à ce lien</div>
      ) : (
        <img className="item-photo" src={imageURI} alt="Photo de l'article" onError={() => setBroken(true)} />
      )}

      <div className={`verify verify-${status}`}>
        {status === "checking" && <>Vérification de la photo…</>}
        {status === "ok" && (
          <>
            <strong>✓ Photo authentique</strong> : identique à celle enregistrée sur la blockchain à la
            création de l'enchère{manual ? " (vérifiée avec votre fichier)" : ""}.
          </>
        )}
        {status === "mismatch" && (
          <>
            <strong>⚠ Photo modifiée</strong> : l'image {manual ? "de votre fichier" : "à ce lien"} ne
            correspond pas à l'empreinte enregistrée. Elle a été remplacée après la création de l'enchère.
          </>
        )}
        {status === "unreachable" && (
          <>
            <strong>Vérification automatique impossible</strong> : le site qui héberge l'image en bloque
            la lecture. Téléchargez l'image et sélectionnez-la ci-dessous pour la vérifier.
          </>
        )}
      </div>

      <div className="hash-row">
        <span className="stat-label">Empreinte SHA-256 enregistrée</span>
        <code title={imageHash}>{shortHash(imageHash)}</code>
        <CopyButton text={imageHash.slice(2)} label="Copier" />
      </div>
      <FileInput className="file-check" label="Vérifier avec un fichier :" onFile={checkFile} />
    </div>
  );
}
