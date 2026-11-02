import { status } from "../lib/blockchain.js";

const LABELS = {
  "en-cours": "En cours",
  "a-cloturer": "À clôturer",
  terminee: "Terminée",
};

export default function StatusBadge({ auction, now }) {
  const s = status(auction, now);
  return <span className={`badge badge-${s}`}>{LABELS[s]}</span>;
}
