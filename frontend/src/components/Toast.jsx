import { useEffect } from "react";

export default function Toast({ toast, onClose }) {
  // Les messages de succès disparaissent seuls ; les erreurs restent jusqu'à fermeture
  useEffect(() => {
    if (toast?.type !== "success") return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type}`} role="status">
      <span>{toast.text}</span>
      {toast.type !== "info" && (
        <button className="toast-close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
      )}
    </div>
  );
}
