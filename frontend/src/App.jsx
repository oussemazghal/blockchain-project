import { useCallback, useEffect, useRef, useState } from "react";
import Header, { Brand } from "./components/Header.jsx";
import Icon from "./components/Icon.jsx";
import ExperienceDialog from "./components/ExperienceDialog.jsx";
import Notices from "./components/Notices.jsx";
import AuctionList from "./components/AuctionList.jsx";
import AuctionDetail from "./components/AuctionDetail.jsx";
import CreateAuction from "./components/CreateAuction.jsx";
import MyAccount from "./components/MyAccount.jsx";
import VerifyPage from "./components/VerifyPage.jsx";
import Toast from "./components/Toast.jsx";
import { useWallet } from "./hooks/useWallet.js";
import { useAuctions, useNow } from "./hooks/useAuctions.js";
import { useScrollReveal } from "./hooks/useScrollReveal.js";
import {
  errorMessage,
  getWriteContract,
  syncLocalChainTime,
} from "./lib/blockchain.js";

export default function App() {
  const mainRef = useRef(null);
  useScrollReveal(mainRef);
  const wallet = useWallet();
  const { auctions, loading, deployed, refresh } = useAuctions();
  const now = useNow();

  // Navigation par l'adresse de la page (#/enchere/3…) : chaque enchère a un lien partageable
  const [{ page, selectedId }, setRoute] = useState(() =>
    parseRoute(window.location.hash),
  );
  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const canWrite =
    Boolean(wallet.account) && !wallet.wrongNetwork && deployed === true;

  // Envoie une transaction via MetaMask et affiche le résultat
  const runTx = useCallback(
    async (pendingText, successText, send) => {
      setBusy(true);
      setToast({
        type: "info",
        text: `${pendingText} Confirmez dans MetaMask…`,
      });
      try {
        await syncLocalChainTime(); // Ganache : met à jour l'horloge de la chaîne
        const contract = await getWriteContract();
        const tx = await send(contract);
        setToast({
          type: "info",
          text: `${pendingText} Transaction envoyée, en attente de validation…`,
        });
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
    [refresh, wallet],
  );

  const selected = auctions.find((a) => a.id === selectedId) || null;

  const go = (p) => {
    window.location.hash = PAGE_HASH[p] || "#/";
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const setSelectedId = (id) => {
    window.location.hash =
      id === null ? PAGE_HASH[page] || "#/" : `#/enchere/${id}`;
  };

  const connect = async () => {
    await wallet.connect();
    if (wallet.metaMaskInstalled) setDialog(null);
  };
  const switchNetwork = async () => {
    try {
      await wallet.switchNetwork();
    } catch (err) {
      setToast({ type: "error", text: errorMessage(err) });
    }
  };
  const openWallet = () => setDialog("wallet");
  const openGuide = () => setDialog("guide");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, selectedId]);

  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content").focus();
        }}
      >
        Aller au contenu
      </a>
      <Header
        page={page}
        onNavigate={go}
        wallet={wallet}
        onConnect={openWallet}
        onGuide={openGuide}
      />
      <main ref={mainRef} className="container" id="main-content" tabIndex={-1}>
        <Notices
          wallet={wallet}
          deployed={deployed}
          onConnect={openWallet}
          onSwitch={switchNetwork}
        />

        <div
          className="page-transition"
          key={`${page}:${selectedId ?? "index"}`}
        >
          {selected ? (
            <AuctionDetail
              auction={selected}
              now={now}
              account={wallet.account}
              canWrite={canWrite}
              busy={busy}
              runTx={runTx}
              onBack={() => setSelectedId(null)}
              onConnect={openWallet}
            />
          ) : page === "create" ? (
            <CreateAuction
              canWrite={canWrite}
              busy={busy}
              runTx={runTx}
              onCreated={(id) => setSelectedId(id)}
              onConnect={openWallet}
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
              onConnect={openWallet}
            />
          ) : (
            <AuctionList
              auctions={auctions}
              loading={loading}
              now={now}
              account={wallet.account}
              onOpen={setSelectedId}
              onCreate={() => go("create")}
              onGuide={openGuide}
              onVerify={() => go("verify")}
            />
          )}
        </div>
      </main>
      <footer className="footer">
        <div className="container">
          <div className="footer-main">
            <div>
              <Brand onClick={() => go("list")} />
              <p>Les objets passent. Les histoires restent.</p>
            </div>
            <nav aria-label="Liens utiles">
              <button onClick={() => go("list")}>Explorer les enchères</button>
              <button onClick={openGuide}>Comment ça marche</button>
              <button onClick={() => go("verify")}>
                Vérifier une annonce <Icon name="diagonal" size={13} />
              </button>
            </nav>
          </div>
          <div className="footer-bottom">
            <span>Projet Blockchain · Faculté des Sciences de Sfax</span>
            <span>
              <span className={`dot ${deployed ? "dot-ok" : "dot-warn"}`} />
              {deployed
                ? "Connecté au réseau local"
                : "Réseau local indisponible"}
              <span className="footer-separator">·</span> ETH de test uniquement
            </span>
          </div>
        </div>
      </footer>
      {dialog && (
        <ExperienceDialog
          key={dialog}
          kind={dialog}
          wallet={wallet}
          onClose={() => setDialog(null)}
          onConnect={connect}
          onSwitch={wallet.switchNetwork}
          onCreate={() => {
            setDialog(null);
            go("create");
          }}
        />
      )}
      <Toast
        key={toast ? `${toast.type}:${toast.text}` : "no-toast"}
        toast={toast}
        onClose={dismissToast}
      />
    </>
  );
}

const PAGE_HASH = {
  list: "#/",
  create: "#/creer",
  account: "#/compte",
  verify: "#/verifier",
};

function parseRoute(hash) {
  const m = hash.match(/^#\/enchere\/(\d+)/);
  if (m) return { page: "list", selectedId: Number(m[1]) };
  const page =
    Object.keys(PAGE_HASH).find((k) => PAGE_HASH[k] === hash) || "list";
  return { page, selectedId: null };
}
