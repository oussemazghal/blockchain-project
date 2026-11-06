import { useState } from "react";
import CopyButton from "./CopyButton.jsx";
import { errorMessage, formatEth, getBrowserProvider } from "../lib/blockchain.js";
import { buildAnnouncement, formatSignedAnnouncement } from "../lib/trust.js";

// Permet au vendeur de signer une annonce de son enchère avec MetaMask.
// La signature est gratuite (aucune transaction) ; le texte signé peut être publié
// n'importe où, et chacun peut le vérifier dans l'onglet « Vérifier ».
export default function AnnouncementSigner({ auction, canWrite }) {
  const [signed, setSigned] = useState("");
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);

  async function sign() {
    setError("");
    setSigning(true);
    try {
      const message = buildAnnouncement(auction, formatEth(auction.minPrice));
      const signer = await getBrowserProvider().getSigner();
      const signature = await signer.signMessage(message);
      setSigned(formatSignedAnnouncement(message, signature));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="card">
      <h2>Prouver que cette annonce est la vôtre</h2>
      <p className="muted">
        Signez un texte décrivant cette enchère avec votre clé MetaMask (gratuit, aucune transaction).
        Publiez-le sur vos réseaux ou votre site : n'importe qui pourra vérifier dans l'onglet « Vérifier »
        qu'il vient bien du vendeur de cette enchère et qu'il n'a pas été modifié.
      </p>
      {!signed ? (
        <button className="btn btn-primary" onClick={sign} disabled={!canWrite || signing}>
          {signing ? "Signature…" : "Signer une annonce"}
        </button>
      ) : (
        <>
          <textarea className="signed-box" readOnly value={signed} rows={11} />
          <div className="row-actions">
            <CopyButton text={signed} label="Copier l'annonce signée" className="btn-primary" />
            <button className="btn btn-small" onClick={() => setSigned("")}>
              Nouvelle signature
            </button>
          </div>
        </>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
