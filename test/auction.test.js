const Auction = artifacts.require("Auction");
const ReentrancyAttacker = artifacts.require("ReentrancyAttacker");
const RejectingSeller = artifacts.require("RejectingSeller");

const { toBN, toWei } = web3.utils;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH = "0x" + "00".repeat(32);
// Empreinte SHA-256 d'un fichier image fictif (calculée par l'interface dans l'application)
const IMAGE_HASH = "0x" + require("crypto").createHash("sha256").update("contenu de la photo").digest("hex");
const ONE_HOUR = 3600;

// ---------- utilitaires ----------

// Vérifie qu'une transaction échoue avec le message attendu
async function expectRevert(promise, expectedMessage) {
  try {
    await promise;
  } catch (err) {
    assert.include(err.message, expectedMessage, `Message inattendu : ${err.message}`);
    return;
  }
  assert.fail(`La transaction aurait dû échouer avec "${expectedMessage}"`);
}

// Avance le temps de la blockchain Ganache (pour simuler la fin d'une enchère)
async function increaseTime(seconds) {
  const send = (method, params = []) =>
    new Promise((resolve, reject) =>
      web3.currentProvider.send(
        { jsonrpc: "2.0", method, params, id: Date.now() },
        (err, res) => (err ? reject(err) : resolve(res))
      )
    );
  await send("evm_increaseTime", [seconds]);
  await send("evm_mine");
}

// Coût en gas réellement payé pour une transaction
async function gasCost(receipt) {
  const tx = await web3.eth.getTransaction(receipt.tx);
  return toBN(receipt.receipt.gasUsed).mul(toBN(tx.gasPrice));
}

const balance = async (addr) => toBN(await web3.eth.getBalance(addr));

// ---------- tests ----------

contract("Auction", (accounts) => {
  const [seller, alice, bob, carol] = accounts;
  const MIN = toBN(toWei("1", "ether"));
  let auction;

  beforeEach(async () => {
    auction = await Auction.new();
  });

  async function createDefault(from = seller) {
    const tx = await auction.createAuction("Montre", "Montre ancienne", "", ZERO_HASH, MIN, ONE_HOUR, { from });
    return tx.logs[0].args.auctionId.toNumber();
  }

  describe("Création (F1)", () => {
    it("enregistre l'article, le vendeur, le prix minimal et la date de fin", async () => {
      const tx = await auction.createAuction("Montre", "Montre ancienne", "", ZERO_HASH, MIN, ONE_HOUR, { from: seller });
      const block = await web3.eth.getBlock(tx.receipt.blockNumber);

      const a = await auction.getAuction(0);
      assert.equal(a.seller, seller);
      assert.equal(a.itemName, "Montre");
      assert.equal(a.description, "Montre ancienne");
      assert.equal(a.minPrice.toString(), MIN.toString());
      assert.equal(a.endTime.toString(), String(Number(block.timestamp) + ONE_HOUR));
      assert.equal(a.highestBidder, ZERO_ADDRESS);
      assert.equal(a.highestBid.toString(), "0");
      assert.isFalse(a.ended);
      assert.equal((await auction.auctionCount()).toString(), "1");
    });

    it("émet l'événement AuctionCreated (F6)", async () => {
      const tx = await auction.createAuction("Montre", "", "", ZERO_HASH, MIN, ONE_HOUR, { from: seller });
      assert.equal(tx.logs[0].event, "AuctionCreated");
      assert.equal(tx.logs[0].args.auctionId.toString(), "0");
      assert.equal(tx.logs[0].args.seller, seller);
      assert.equal(tx.logs[0].args.itemName, "Montre");
    });

    it("gère plusieurs enchères avec des identifiants distincts", async () => {
      await createDefault();
      await auction.createAuction("Vélo", "", "", ZERO_HASH, MIN, ONE_HOUR, { from: alice });
      assert.equal((await auction.auctionCount()).toString(), "2");
      assert.equal((await auction.getAuction(1)).seller, alice);
    });

    it("refuse un nom vide, un prix minimal nul ou une durée nulle", async () => {
      await expectRevert(auction.createAuction("", "", "", ZERO_HASH, MIN, ONE_HOUR), "Nom de l'article obligatoire");
      await expectRevert(auction.createAuction("Montre", "", "", ZERO_HASH, 0, ONE_HOUR), "Le prix minimal doit etre > 0");
      await expectRevert(auction.createAuction("Montre", "", "", ZERO_HASH, MIN, 0), "La duree doit etre > 0");
    });

    it("refuse la lecture d'une enchère inexistante", async () => {
      await expectRevert(auction.getAuction(5), "Enchere inexistante");
    });
  });

  describe("Enchérir (F2) et suivi (F3)", () => {
    let id;
    beforeEach(async () => {
      id = await createDefault();
    });

    it("refuse une première offre inférieure au prix minimal", async () => {
      await expectRevert(
        auction.bid(id, { from: alice, value: toWei("0.5", "ether") }),
        "Offre inferieure au prix minimal"
      );
    });

    it("accepte une première offre égale au prix minimal et met à jour la meilleure offre", async () => {
      const tx = await auction.bid(id, { from: alice, value: MIN });
      assert.equal(tx.logs[0].event, "BidPlaced");
      assert.equal(tx.logs[0].args.bidder, alice);

      const a = await auction.getAuction(id);
      assert.equal(a.highestBidder, alice);
      assert.equal(a.highestBid.toString(), MIN.toString());
    });

    it("refuse une offre égale ou inférieure à la meilleure offre", async () => {
      await auction.bid(id, { from: alice, value: toWei("1.5", "ether") });
      await expectRevert(auction.bid(id, { from: bob, value: toWei("1.5", "ether") }), "Offre trop basse");
      await expectRevert(auction.bid(id, { from: bob, value: toWei("1.2", "ether") }), "Offre trop basse");
    });

    it("refuse que le vendeur enchérisse sur sa propre enchère", async () => {
      await expectRevert(auction.bid(id, { from: seller, value: MIN }), "Le vendeur ne peut pas encherir");
    });

    it("refuse une offre sur une enchère inexistante", async () => {
      await expectRevert(auction.bid(42, { from: alice, value: MIN }), "Enchere inexistante");
    });

    it("une surenchère remplace le meilleur enchérisseur et rend l'ancienne offre remboursable", async () => {
      await auction.bid(id, { from: alice, value: toWei("1.2", "ether") });
      await auction.bid(id, { from: bob, value: toWei("1.5", "ether") });

      const a = await auction.getAuction(id);
      assert.equal(a.highestBidder, bob);
      assert.equal(a.highestBid.toString(), toWei("1.5", "ether"));
      assert.equal((await auction.pendingReturns(alice)).toString(), toWei("1.2", "ether"));
      assert.equal((await auction.pendingReturns(bob)).toString(), "0");
    });

    it("cumule les remboursements si un enchérisseur est dépassé plusieurs fois", async () => {
      await auction.bid(id, { from: alice, value: toWei("1", "ether") });
      await auction.bid(id, { from: bob, value: toWei("2", "ether") });
      await auction.bid(id, { from: alice, value: toWei("3", "ether") });
      await auction.bid(id, { from: bob, value: toWei("4", "ether") });

      assert.equal((await auction.pendingReturns(alice)).toString(), toWei("4", "ether")); // 1 + 3
      assert.equal((await auction.pendingReturns(bob)).toString(), toWei("2", "ether"));
    });

    it("refuse toute offre après l'expiration (F4)", async () => {
      await increaseTime(ONE_HOUR + 1);
      await expectRevert(auction.bid(id, { from: alice, value: MIN }), "Enchere terminee");
    });
  });

  describe("Remboursement (F5)", () => {
    let id;
    beforeEach(async () => {
      id = await createDefault();
      await auction.bid(id, { from: alice, value: toWei("1.2", "ether") });
      await auction.bid(id, { from: bob, value: toWei("1.5", "ether") });
    });

    it("l'enchérisseur dépassé récupère exactement son offre", async () => {
      const before = await balance(alice);
      const tx = await auction.withdraw({ from: alice });
      const after = await balance(alice);

      const expected = before.add(toBN(toWei("1.2", "ether"))).sub(await gasCost(tx));
      assert.equal(after.toString(), expected.toString());
      assert.equal((await auction.pendingReturns(alice)).toString(), "0");
      assert.equal(tx.logs[0].event, "Withdrawal");
    });

    it("refuse un second retrait et un retrait sans fonds", async () => {
      await auction.withdraw({ from: alice });
      await expectRevert(auction.withdraw({ from: alice }), "Aucun fonds a retirer");
      await expectRevert(auction.withdraw({ from: bob }), "Aucun fonds a retirer"); // bob est en tête
    });

    it("le retrait reste possible après la clôture", async () => {
      await increaseTime(ONE_HOUR + 1);
      await auction.endAuction(id, { from: carol });
      await auction.withdraw({ from: alice });
      assert.equal((await auction.pendingReturns(alice)).toString(), "0");
    });
  });

  describe("Clôture (F4)", () => {
    let id;
    beforeEach(async () => {
      id = await createDefault();
    });

    it("refuse la clôture avant la date de fin", async () => {
      await expectRevert(auction.endAuction(id, { from: seller }), "Enchere encore en cours");
    });

    it("après l'échéance, n'importe qui peut clôturer : gagnant identifié et vendeur payé", async () => {
      await auction.bid(id, { from: alice, value: toWei("1.2", "ether") });
      await auction.bid(id, { from: bob, value: toWei("1.5", "ether") });
      await increaseTime(ONE_HOUR + 1);

      const sellerBefore = await balance(seller);
      const tx = await auction.endAuction(id, { from: carol }); // carol n'a rien à voir avec l'enchère
      const sellerAfter = await balance(seller);

      assert.equal(sellerAfter.sub(sellerBefore).toString(), toWei("1.5", "ether"));
      assert.equal(tx.logs[0].event, "AuctionEnded");
      assert.equal(tx.logs[0].args.winner, bob);
      assert.equal(tx.logs[0].args.amount.toString(), toWei("1.5", "ether"));

      const a = await auction.getAuction(id);
      assert.isTrue(a.ended);
      assert.equal(a.highestBidder, bob);
    });

    it("le contrat ne garde que les fonds encore dus aux enchérisseurs dépassés", async () => {
      await auction.bid(id, { from: alice, value: toWei("1.2", "ether") });
      await auction.bid(id, { from: bob, value: toWei("1.5", "ether") });
      await increaseTime(ONE_HOUR + 1);
      await auction.endAuction(id);

      assert.equal((await balance(auction.address)).toString(), toWei("1.2", "ether"));
      await auction.withdraw({ from: alice });
      assert.equal((await balance(auction.address)).toString(), "0");
    });

    it("refuse une double clôture", async () => {
      await auction.bid(id, { from: alice, value: MIN });
      await increaseTime(ONE_HOUR + 1);
      await auction.endAuction(id);
      await expectRevert(auction.endAuction(id), "Enchere deja cloturee");
    });

    it("sans offre : pas de gagnant et aucun transfert", async () => {
      await increaseTime(ONE_HOUR + 1);
      const sellerBefore = await balance(seller);
      const tx = await auction.endAuction(id, { from: carol });

      assert.equal(tx.logs[0].args.winner, ZERO_ADDRESS);
      assert.equal(tx.logs[0].args.amount.toString(), "0");
      assert.equal((await balance(seller)).toString(), sellerBefore.toString());
      assert.isTrue((await auction.getAuction(id)).ended);
    });

    it("refuse la clôture d'une enchère inexistante", async () => {
      await expectRevert(auction.endAuction(7), "Enchere inexistante");
    });
  });

  describe("Photo de l'article (empreinte SHA-256)", () => {
    it("enregistre le lien et l'empreinte de la photo", async () => {
      await auction.createAuction("Montre", "", "http://localhost:5173/images/montre.jpg", IMAGE_HASH, MIN, ONE_HOUR);
      const a = await auction.getAuction(0);
      assert.equal(a.imageURI, "http://localhost:5173/images/montre.jpg");
      assert.equal(a.imageHash, IMAGE_HASH);
    });

    it("accepte une enchère sans photo (lien vide, empreinte nulle)", async () => {
      await auction.createAuction("Montre", "", "", ZERO_HASH, MIN, ONE_HOUR);
      const a = await auction.getAuction(0);
      assert.equal(a.imageURI, "");
      assert.equal(a.imageHash, ZERO_HASH);
    });

    it("refuse un lien sans empreinte, ou une empreinte sans lien", async () => {
      await expectRevert(
        auction.createAuction("Montre", "", "http://exemple.com/photo.jpg", ZERO_HASH, MIN, ONE_HOUR),
        "Image et empreinte vont ensemble"
      );
      await expectRevert(
        auction.createAuction("Montre", "", "", IMAGE_HASH, MIN, ONE_HOUR),
        "Image et empreinte vont ensemble"
      );
    });
  });

  describe("Profil vendeur", () => {
    it("enregistre le profil et émet ProfileUpdated", async () => {
      const tx = await auction.setProfile("Boutique Nour", "https://instagram.com/boutique.nour", { from: seller });
      assert.equal(tx.logs[0].event, "ProfileUpdated");
      assert.equal(tx.logs[0].args.seller, seller);

      const p = await auction.getProfile(seller);
      assert.equal(p.name, "Boutique Nour");
      assert.equal(p.link, "https://instagram.com/boutique.nour");
    });

    it("permet de modifier son profil, sans toucher à celui des autres", async () => {
      await auction.setProfile("Ancien nom", "", { from: seller });
      await auction.setProfile("Alice", "https://alice.example", { from: alice });
      await auction.setProfile("Nouveau nom", "https://nouveau.example", { from: seller });

      assert.equal((await auction.getProfile(seller)).name, "Nouveau nom");
      assert.equal((await auction.getProfile(alice)).name, "Alice");
    });

    it("renvoie un profil vide pour une adresse sans profil", async () => {
      const p = await auction.getProfile(carol);
      assert.equal(p.name, "");
      assert.equal(p.link, "");
    });

    it("refuse un nom vide ou un profil trop long", async () => {
      await expectRevert(auction.setProfile("", "https://x.example"), "Nom du profil obligatoire");
      await expectRevert(auction.setProfile("a".repeat(65), ""), "Profil trop long");
    });
  });

  describe("Sécurité", () => {
    it("bloque une attaque par réentrance sur withdraw()", async () => {
      const id = await createDefault();
      const attacker = await ReentrancyAttacker.new(auction.address);

      await attacker.placeBid(id, { from: alice, value: toWei("1", "ether") });
      await auction.bid(id, { from: bob, value: toWei("2", "ether") });

      // L'attaquant a 1 ETH à récupérer ; sa tentative de rappel doit tout faire échouer
      await expectRevert(attacker.attack(), "Echec du transfert");
      assert.equal((await auction.pendingReturns(attacker.address)).toString(), toWei("1", "ether"));
      assert.equal((await balance(auction.address)).toString(), toWei("3", "ether"));
    });

    it("un vendeur qui refuse les ETH ne bloque pas la clôture : le montant lui reste dû", async () => {
      const rejecting = await RejectingSeller.new(auction.address);
      await rejecting.create(MIN, ONE_HOUR);
      await auction.bid(0, { from: alice, value: toWei("2", "ether") });
      await increaseTime(ONE_HOUR + 1);

      await auction.endAuction(0, { from: carol }); // ne doit pas échouer
      assert.equal((await auction.pendingReturns(rejecting.address)).toString(), toWei("2", "ether"));

      await rejecting.enablePayments();
      await rejecting.withdrawFromAuction();
      assert.equal((await balance(rejecting.address)).toString(), toWei("2", "ether"));
    });
  });
});
