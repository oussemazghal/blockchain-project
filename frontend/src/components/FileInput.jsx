import { useState } from "react";

// Sélecteur de fichier en français (le bouton natif affiche la langue du navigateur)
export default function FileInput({ label, accept = "image/*", onFile, className = "" }) {
  const [name, setName] = useState("");

  return (
    <label className={`file-input ${className}`}>
      <span className="file-input-label">{label}</span>
      <span className="file-input-row">
        <span className="btn btn-small" aria-hidden="true">Choisir un fichier</span>
        <span className="file-input-name">{name || "Aucun fichier sélectionné"}</span>
      </span>
      <input
        type="file"
        accept={accept}
        className="visually-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          setName(file ? file.name : "");
          onFile(file);
        }}
      />
    </label>
  );
}
