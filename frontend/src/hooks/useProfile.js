import { useCallback, useEffect, useState } from "react";
import { readContract } from "../lib/blockchain.js";

// Profil public (nom + lien) d'une adresse, mis à jour à chaque événement ProfileUpdated
export function useProfile(address) {
  const [profile, setProfile] = useState(null);

  const load = useCallback(async () => {
    if (!address) return setProfile(null);
    try {
      const p = await readContract.getProfile(address);
      setProfile(p.name ? { name: p.name, link: p.link } : null);
    } catch {
      setProfile(null);
    }
  }, [address]);

  useEffect(() => {
    load();
    const onUpdate = (seller) => {
      if (address && seller.toLowerCase() === address.toLowerCase()) load();
    };
    readContract.on("ProfileUpdated", onUpdate);
    return () => {
      readContract.off("ProfileUpdated", onUpdate);
    };
  }, [address, load]);

  return { profile, reload: load };
}
