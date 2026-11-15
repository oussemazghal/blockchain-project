export const SIGNED_OUT_KEY = "auction.wallet.signedOut";

// Keep the injected wallet session independent of React so account changes,
// sign-out persistence and delayed provider replies can be tested directly.
export function createWalletSession({ provider, storage, readBalance } = {}) {
  let state = {
    account: null,
    chainId: null,
    balance: null,
    connecting: false,
    disconnecting: false,
  };
  let signedOut = false;
  try {
    signedOut = storage?.getItem(SIGNED_OUT_KEY) === "true";
  } catch {
    /* Storage may be disabled. */
  }
  let active = false;
  let generation = 0;
  let balanceVersion = 0;
  let eventVersion = 0;
  let chainVersion = 0;
  const listeners = new Set();
  const update = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const persistSignOut = (value) => {
    signedOut = value;
    try {
      if (value) storage?.setItem(SIGNED_OUT_KEY, "true");
      else storage?.removeItem(SIGNED_OUT_KEY);
    } catch {
      /* Signing out still works for this session. */
    }
  };

  async function refreshBalance() {
    const address = state.account;
    const version = ++balanceVersion;
    if (!address) return update({ balance: null });
    let balance = null;
    try {
      balance = await readBalance(address);
    } catch {
      /* Keep the balance unknown when RPC is unavailable. */
    }
    if (
      active &&
      !signedOut &&
      state.account === address &&
      balanceVersion === version
    )
      update({ balance });
  }
  function setAccount(address, chainId = state.chainId) {
    ++balanceVersion;
    update({
      account: address,
      chainId: address ? chainId : null,
      balance: null,
    });
    if (address) void refreshBalance();
  }
  function onAccounts(accounts) {
    ++eventVersion;
    if (!active || signedOut || state.connecting || state.disconnecting) return;
    setAccount(accounts[0] || null);
  }
  function onChain(chainId) {
    ++chainVersion;
    if (!active || signedOut) return;
    update({ chainId: Number.parseInt(chainId, 16) });
    void refreshBalance();
  }
  function onProviderDisconnect() {
    ++generation;
    setAccount(null);
    update({ connecting: false, disconnecting: false });
  }

  function start() {
    active = true;
    const ticket = ++generation;
    update({ connecting: false, disconnecting: false });
    if (provider) {
      provider.on("accountsChanged", onAccounts);
      provider.on("chainChanged", onChain);
      provider.on("disconnect", onProviderDisconnect);
      if (!signedOut) {
        const beforeEvents = eventVersion;
        const beforeChain = chainVersion;
        Promise.all([
          provider.request({ method: "eth_accounts" }),
          provider.request({ method: "eth_chainId" }),
        ])
          .then(([accounts, chainId]) => {
            if (active && !signedOut && ticket === generation) {
              setAccount(
                beforeEvents === eventVersion
                  ? accounts[0] || null
                  : state.account,
                beforeChain === chainVersion
                  ? Number.parseInt(chainId, 16)
                  : state.chainId,
              );
            }
          })
          .catch(() => {
            /* Stay in visitor mode if MetaMask is locked or unavailable. */
          });
      }
    }
    return () => {
      active = false;
      ++generation;
      ++balanceVersion;
      provider?.removeListener("accountsChanged", onAccounts);
      provider?.removeListener("chainChanged", onChain);
      provider?.removeListener("disconnect", onProviderDisconnect);
    };
  }

  async function connect({ chooseAccount = false } = {}) {
    if (!provider || state.connecting || state.disconnecting) return false;
    const ticket = ++generation;
    update({ connecting: true });
    try {
      if (chooseAccount || signedOut) {
        try {
          await provider.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }],
          });
        } catch (error) {
          if (![4200, -32601].includes(error?.code)) throw error;
          if (chooseAccount)
            throw new Error(
              "Changez de compte dans MetaMask, puis revenez sur cette page. Ce portefeuille ne propose pas de sélecteur de compte.",
            );
        }
      }
      await provider.request({ method: "eth_requestAccounts" });
      const chainId = await provider.request({ method: "eth_chainId" });
      const accounts = await provider.request({ method: "eth_accounts" });
      if (!active || ticket !== generation) return false;
      if (!accounts[0])
        throw new Error("Sélectionnez un compte dans MetaMask pour continuer.");
      persistSignOut(false);
      setAccount(accounts[0], Number.parseInt(chainId, 16));
      return true;
    } finally {
      if (active && ticket === generation) update({ connecting: false });
    }
  }

  async function disconnect() {
    if (state.disconnecting) return;
    const ticket = ++generation;
    persistSignOut(true);
    setAccount(null);
    update({ connecting: false, disconnecting: Boolean(provider) });
    try {
      await provider?.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      /* Older wallets may not support revocation; local sign-out stays effective. */
    } finally {
      if (active && ticket === generation) update({ disconnecting: false });
    }
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start,
    connect,
    switchAccount: () => connect({ chooseAccount: true }),
    disconnect,
    refreshBalance,
  };
}
