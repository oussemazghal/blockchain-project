import { useCallback, useEffect, useState } from "react";
import { CHAIN_ID } from "../config.js";
import { getBrowserProvider, hasMetaMask, readProvider, switchToGanache } from "../lib/blockchain.js";

// Gère la connexion à MetaMask : compte, réseau et solde.
export function useWallet() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const refreshBalance = useCallback(async (addr = account) => {
    if (!addr) return setBalance(null);
    try {
      setBalance(await readProvider.getBalance(addr));
    } catch {
      setBalance(null);
    }
  }, [account]);

  // Reprise silencieuse si le site est déjà autorisé dans MetaMask
  useEffect(() => {
    if (!hasMetaMask()) return;
    window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
      if (accs.length) setAccount(accs[0]);
    });
    window.ethereum.request({ method: "eth_chainId" }).then((id) => setChainId(parseInt(id, 16)));

    const onAccounts = (accs) => setAccount(accs[0] || null);
    const onChain = (id) => setChainId(parseInt(id, 16));
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged", onChain);
    };
  }, []);

  useEffect(() => {
    refreshBalance(account);
  }, [account, refreshBalance]);

  const connect = useCallback(async () => {
    if (!hasMetaMask()) return;
    setConnecting(true);
    try {
      const accs = await getBrowserProvider().send("eth_requestAccounts", []);
      setAccount(accs[0] || null);
      const id = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(parseInt(id, 16));
    } finally {
      setConnecting(false);
    }
  }, []);

  return {
    account,
    chainId,
    balance,
    connecting,
    connect,
    switchNetwork: switchToGanache,
    refreshBalance,
    wrongNetwork: Boolean(account) && chainId !== null && chainId !== CHAIN_ID,
    metaMaskInstalled: hasMetaMask(),
  };
}
