import { useCallback, useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import Notices from "./components/Notices.jsx";
import AuctionList from "./components/AuctionList.jsx";
import AuctionDetail from "./components/AuctionDetail.jsx";
import CreateAuction from "./components/CreateAuction.jsx";
import MyAccount from "./components/MyAccount.jsx";
import VerifyPage from "./components/VerifyPage.jsx";
import Toast from "./components/Toast.jsx";
import { useWallet } from "./hooks/useWallet.js";
import { useAuctions, useNow } from "./hooks/useAuctions.js";
import { errorMessage, getWriteContract, syncLocalChainTime } from "./lib/blockchain.js";

export default function App() {
  const wallet = useWallet();
  const { auctions, loading, deployed, refresh } = useAuctions();
  const now = useNow();

  // Navigation par l'adresse de la page (#/enchere/3…) : chaque enchère a un lien partageable
  const [{ page, selectedId }, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  const canWrite = Boolean(wallet.account) && !wallet.wrongNetwork && deployed === true;

  // Envoie une transaction via MetaMask et affiche le résultat
  const runTx = useCallback(
    async (pendingText, successText, send) => {
      setBusy(true);
      setToast({ type: "info", text: `${pendingText} Confirmez dans MetaMask…` });
      try {
        await syncLocalChainTime(); // Ganache : met à jour l'horloge de la chaîne
        const contract = await getWriteContract();
        const tx = await send(contract);
        setToast({ type: "info", text: `${pendingText} Transaction envoyée, en attente de validation…` });
        const receipt = await tx.wait();
        setToast({ type: "success", text: successText });
        await Promise.all([refresh(), wallet.refreshBalance()]);
        return receipt;
      } catch (err) {
        console.error(err);
        setToast({ type: "error", text: errorMessage(err) });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [refresh, wallet]
  );

  const selected = auctions.find((a) => a.id === selectedId) || null;

  const go = (p) => {
    window.location.hash = PAGE_HASH[p] || "#/";
  };
  const setSelectedId = (id) => {
    window.location.hash = id === null ? PAGE_HASH[page] || "#/" : `#/enchere/${id}`;
  };

  return (
    <>
      <Header page={page} onNavigate={go} wallet={wallet} />
      <main className="container">
        <Notices wallet={wallet} deployed={deployed} />

        {selected ? (
          <AuctionDetail
            auction={selected}
            now={now}
            account={wallet.account}
            canWrite={canWrite}
            busy={busy}
            runTx={runTx}
            onBack={() => setSelectedId(null)}
          />
        ) : page === "create" ? (
          <CreateAuction
            canWrite={canWrite}
            busy={busy}
            runTx={runTx}
            onCreated={(id) => setSelectedId(id)}
          />
        ) : page === "verify" ? (
          <VerifyPage onOpen={setSelectedId} />
        ) : page === "account" ? (
          <MyAccount
            account={wallet.account}
            auctions={auctions}
            now={now}
            canWrite={canWrite}
            busy={busy}
            runTx={runTx}
            onOpen={setSelectedId}
          />
        ) : (
          <AuctionList
            auctions={auctions}
            loading={loading}
            now={now}
            account={wallet.account}
            onOpen={setSelectedId}
            onCreate={() => go("create")}
          />
        )}
      </main>
      <footer className="footer container">
        Projet Blockchain — Sujet 5 · Faculté des Sciences de Sfax · Solidity, Truffle, Ganache, MetaMask, React
      </footer>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

const PAGE_HASH = { list: "#/", create: "#/creer", account: "#/compte", verify: "#/verifier" };

function parseRoute(hash) {
  const m = hash.match(/^#\/enchere\/(\d+)/);
  if (m) return { page: "list", selectedId: Number(m[1]) };
  const page = Object.keys(PAGE_HASH).find((k) => PAGE_HASH[k] === hash) || "list";
  return { page, selectedId: null };
}
