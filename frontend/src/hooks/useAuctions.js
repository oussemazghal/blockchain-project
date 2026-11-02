import { useCallback, useEffect, useState } from "react";
import { contractIsDeployed, readContract, toAuction } from "../lib/blockchain.js";

// Charge toutes les enchères depuis le contrat et les met à jour en temps réel
// grâce aux événements AuctionCreated, BidPlaced et AuctionEnded.
export function useAuctions() {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deployed, setDeployed] = useState(true); // true / false / null (Ganache injoignable)

  const refresh = useCallback(async () => {
    const ok = await contractIsDeployed();
    setDeployed(ok);
    if (!ok) {
      setLoading(false);
      return;
    }
    try {
      const count = Number(await readContract.auctionCount());
      const list = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          readContract.getAuction(i).then((raw) => toAuction(i, raw))
        )
      );
      setAuctions(list.reverse()); // les plus récentes d'abord
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const onEvent = () => refresh();
    readContract.on("AuctionCreated", onEvent);
    readContract.on("BidPlaced", onEvent);
    readContract.on("AuctionEnded", onEvent);

    // Filet de sécurité si un événement est manqué
    const timer = setInterval(refresh, 15000);

    return () => {
      readContract.off("AuctionCreated", onEvent);
      readContract.off("BidPlaced", onEvent);
      readContract.off("AuctionEnded", onEvent);
      clearInterval(timer);
    };
  }, [refresh]);

  return { auctions, loading, deployed, refresh };
}

// Horloge qui se met à jour chaque seconde (comptes à rebours)
export function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
