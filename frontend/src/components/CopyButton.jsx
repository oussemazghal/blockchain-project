import { useState } from "react";

export default function CopyButton({ text, label = "Copier", className = "" }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Repli pour les navigateurs qui bloquent l'accès au presse-papiers
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }

  return (
    <button type="button" className={`btn btn-small ${className}`} onClick={copy}>
      {done ? "Copié ✓" : label}
    </button>
  );
}
