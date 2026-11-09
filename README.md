# Application décentralisée de gestion des enchères

**Projet Blockchain — Sujet 5** · Faculté des Sciences de Sfax
Équipe : Med Amine Salhi, Nour Mellah, Oussema Zghal, Omar Bouattour · Encadrant : Claude Duvallet

Un vendeur met un article en vente sur la blockchain avec une **enchère minimale** et une **durée fixe**.
Les enchérisseurs envoient des offres en ETH ; à la fin, le meilleur enchérisseur gagne, le vendeur
est payé et les enchérisseurs dépassés récupèrent leurs fonds.

Deux fonctions de **confiance** complètent l'application :
- **Photo infalsifiable** : le lien de la photo et son empreinte SHA-256 sont enregistrés à la création ;
  si l'image est remplacée ensuite, l'application le détecte.
- **Authentification du vendeur** : profil public (nom + lien vers son site ou réseau social) et
  **annonces signées** avec MetaMask, que n'importe qui peut vérifier dans l'onglet « Vérifier ».

| Élément | Technologie |
|---|---|
| Smart contract | Solidity 0.8.20 + OpenZeppelin (`ReentrancyGuard`) |
| Compilation, migrations, tests | Truffle 5 |
| Blockchain locale | Ganache 7 (application graphique ou ligne de commande) |
| Portefeuille | MetaMask |
| Interface Web | React 18 + Ethers.js 6 (Vite) |

---

## 1. Prérequis

- **Node.js 18 ou plus récent** (testé avec Node 22) et npm
- **Ganache** : l'application graphique *ou* la version ligne de commande incluse dans le projet
- **MetaMask** installé dans le navigateur (Chrome, Firefox, Brave ou Edge)

## 2. Installation

```bash
npm run setup        # installe les dépendances du projet et du front-end
```

(équivalent à `npm install` à la racine puis `npm install` dans `frontend/`)

## 3. Lancer l'application

Ouvrir **trois terminaux** à la racine du projet.

**Terminal 1 — Blockchain Ganache**

```bash
npm run ganache
```

Ganache démarre sur `http://127.0.0.1:7545` (chain ID 1337) avec 10 comptes de test à 1000 ETH.
Avec l'**application graphique Ganache**, créez simplement un workspace « Quickstart » : le port 7545
et le chain ID 1337 sont les valeurs par défaut. Laissez ce terminal ouvert.

**Terminal 2 — Déploiement du contrat**

```bash
npm run migrate      # truffle migrate --network development --reset
```

La migration déploie `Auction.sol` sur Ganache **et copie automatiquement l'adresse et l'ABI** du
contrat dans `frontend/src/contract/Auction.json`. Aucune copie manuelle n'est nécessaire.

> ⚠️ Ganache ne conserve rien entre deux lancements : après chaque redémarrage de Ganache,
> relancez `npm run migrate`.

**Terminal 3 — Interface React**

```bash
npm run frontend
```

Le navigateur s'ouvre sur `http://localhost:5173`.

## 4. Configurer MetaMask

1. **Ajouter le réseau Ganache** (MetaMask → Réseaux → Ajouter un réseau manuellement) :
   - Nom : `Ganache local`
   - URL RPC : `http://127.0.0.1:7545`
   - Chain ID : `1337`
   - Symbole : `ETH`

   L'interface propose aussi un bouton **« Basculer sur Ganache »** qui ajoute ce réseau automatiquement.

2. **Importer des comptes de test** (MetaMask → Ajouter un compte → Importer un compte), avec leur
   clé privée. Avec `npm run ganache`, les comptes sont toujours les mêmes :

   | Rôle conseillé pour la démo | Clé privée |
   |---|---|
   | Vendeur (compte 0) | `0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d` |
   | Enchérisseur A (compte 1) | `0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1` |
   | Enchérisseur B (compte 2) | `0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c` |

   Avec l'application graphique, cliquez sur l'icône 🔑 d'un compte pour afficher sa clé privée.

   > Ces clés sont publiques et ne servent qu'aux tests locaux : n'envoyez **jamais** de vrais
   > fonds vers ces adresses.

3. Sur la page, cliquez sur **« Connecter MetaMask »**. Pour changer de rôle pendant la démo,
   changez simplement de compte dans MetaMask : l'interface se met à jour.

## 5. Scénario de démonstration (vidéo de 3 à 5 minutes)

1. **Vendeur** : *Mon compte* → profil « Boutique … » avec un lien. Puis *Créer une enchère* →
   « Montre ancienne », photo `/images/montre.svg` (+ le fichier `frontend/public/images/montre.svg`),
   prix minimal 1 ETH, durée 3 minutes. La page affiche **« ✓ Photo authentique »**.
   Sur l'enchère, *Signer une annonce* → copier le texte signé.
2. **Enchérisseur A** : ouvre l'enchère, propose **0,5 ETH** → refusé (inférieur au prix minimal),
   puis **1,2 ETH** → accepté. La meilleure offre et l'historique se mettent à jour.
3. **Enchérisseur B** : propose **1,5 ETH** → il passe en tête.
4. **Enchérisseur A** : tente **1,4 ETH** → refusé (offre trop basse).
   Dans *Mon compte*, il voit **1,2 ETH à retirer** → *Retirer mes fonds* → son solde augmente.
5. **Vendeur** : son formulaire d'offre est masqué (il ne peut pas enchérir sur sa propre enchère).
6. Après la date de fin : le bouton **« Clôturer l'enchère »** apparaît (n'importe quel compte peut
   clôturer). Après clôture : gagnant = enchérisseur B, le vendeur reçoit **1,5 ETH**.
7. **Authentification** : avec un autre compte, onglet *Vérifier* → coller l'annonce signée →
   **« ✓ Annonce authentique »**. Modifier un caractère (par ex. le prix) → **« ✗ Annonce NON authentique »**.
8. **Photo remplacée** : faites d'abord une copie de `frontend/public/images/montre.svg`, puis
   remplacez-le par une autre image (par ex. copiez `velo.svg` à sa place) et rechargez l'enchère →
   **« ⚠ Photo modifiée »**. Sélectionnez la copie d'origine dans « Vérifier avec un fichier » →
   **« ✓ Photo authentique »**. Remettez ensuite l'original à sa place.
9. Montrer les transactions dans l'onglet *Transactions* de l'application graphique Ganache (pour
   l'onglet *Events*, liez le projet dans les paramètres du workspace : *Workspace → Truffle Projects
   → Add Project* → `truffle-config.js`), puis lancer `npm test` pour montrer les 31 tests qui passent.

## 6. Tests

```bash
npm test               # 31 tests Truffle sur un Ganache lancé en mémoire
npm run test:ganache   # les mêmes tests sur le Ganache du port 7545
```

`npm test` utilise un Ganache **séparé, en mémoire** : les tests avancent l'horloge de la blockchain
pour simuler la fin des enchères, ce qui décalerait l'heure du Ganache utilisé par l'interface.
Si vous lancez `npm run test:ganache`, redémarrez ensuite Ganache et relancez `npm run migrate`
avant la démo.

Scénarios couverts (`test/auction.test.js`) :

- **Création** : enregistrement des données, événement `AuctionCreated`, plusieurs enchères,
  refus d'un nom vide / prix nul / durée nulle
- **Enchères** : offre inférieure au prix minimal refusée, offre égale au minimum acceptée,
  offre égale ou inférieure à la meilleure refusée, vendeur ne pouvant pas enchérir,
  surenchère et remboursement de l'ancienne offre, cumul des remboursements, offre après expiration refusée
- **Remboursement** : montant exact récupéré, double retrait refusé, retrait possible après la clôture
- **Clôture** : refusée avant la fin, possible par n'importe qui après la fin, vendeur payé,
  double clôture refusée, enchère sans offre (pas de gagnant, aucun transfert)
- **Photo** : lien et empreinte enregistrés, enchère sans photo, refus d'un lien sans empreinte (et inversement)
- **Profil vendeur** : enregistrement et événement `ProfileUpdated`, modification, profil vide par défaut,
  refus d'un nom vide ou trop long
- **Sécurité** : attaque par réentrance bloquée, vendeur qui refuse les ETH ne bloquant pas la clôture

## 7. Structure du projet

```
auction-dapp/
├── contracts/
│   ├── Auction.sol                 # smart contract principal
│   └── test/                       # contrats utilisés uniquement par les tests
│       ├── ReentrancyAttacker.sol
│       └── RejectingSeller.sol
├── migrations/1_deploy_auction.js  # déploiement + copie de l'ABI vers le front-end
├── test/auction.test.js            # tests Truffle (Mocha / Chai)
├── truffle-config.js               # connexion à Ganache, compilateur
├── package.json                    # scripts npm
└── frontend/                       # interface React + Ethers.js
    └── src/
        ├── App.jsx                 # navigation et envoi des transactions
        ├── config.js               # URL de Ganache, adresse et ABI du contrat
        ├── contract/Auction.json   # généré par la migration
        ├── hooks/                  # useWallet (MetaMask), useAuctions (données + événements)
        ├── lib/blockchain.js       # Ethers.js, formats, messages d'erreur
        ├── lib/trust.js            # empreinte SHA-256, annonces signées
        └── components/             # liste, détail, création, mon compte, vérifier…
    └── public/images/              # photos de démonstration (montre.svg, velo.svg)
```

## 8. Fonctionnement du smart contract

| Fonction | Rôle |
|---|---|
| `createAuction(nom, description, lienPhoto, empreintePhoto, prixMinimal, durée)` | crée une enchère ; date de fin = `block.timestamp + durée` ; la photo est facultative (lien vide et empreinte nulle) |
| `bid(id)` *(payable)* | l'ETH envoyé est l'offre ; l'ancienne meilleure offre devient remboursable |
| `withdraw()` | l'enchérisseur dépassé récupère ses fonds (retrait à la demande) |
| `endAuction(id)` | après la date de fin, n'importe qui clôture : le vendeur reçoit la meilleure offre |
| `setProfile(nom, lien)` | crée ou modifie le profil public du vendeur |
| `getAuction(id)`, `auctionCount()`, `pendingReturns(adresse)`, `getProfile(adresse)` | lecture (gratuite) |

Événements : `AuctionCreated`, `BidPlaced`, `AuctionEnded`, `Withdrawal`, `ProfileUpdated`. L'interface les écoute pour
se mettre à jour en temps réel et reconstruit l'historique des offres à partir de `BidPlaced`.

Sécurité :
- **Retrait à la demande** (*pull payment*) : on ne renvoie pas d'ETH à l'ancien enchérisseur dans
  `bid()`, sinon un contrat malveillant qui refuse les ETH pourrait bloquer toutes les offres.
- **Anti-réentrance** : le solde est remis à zéro avant l'envoi, et `withdraw()` / `endAuction()`
  sont protégées par `nonReentrant` (OpenZeppelin).
- **Clôture jamais bloquée** : si le vendeur est un contrat qui refuse les ETH, le montant lui reste
  dû et il peut le retirer via `withdraw()`.

## 9. Photo et authentification du vendeur

### Photo de l'article

- À la création, indiquez le **lien public** de la photo et, si possible, **le fichier** lui-même.
  L'application calcule l'**empreinte SHA-256** du fichier et l'enregistre avec le lien dans le contrat.
- Sur la page de l'enchère, l'application télécharge l'image et recalcule son empreinte :
  **✓ Photo authentique** si elle est identique, **⚠ Photo modifiée** si elle a été remplacée.
- Certains sites bloquent la lecture de leurs images par une autre page (règles CORS). Dans ce cas,
  l'application demande le fichier pour calculer l'empreinte, et les visiteurs peuvent vérifier en
  sélectionnant l'image téléchargée.
- Vérification indépendante, sans l'application : `sha256sum photo.jpg` (Linux/macOS) ou
  `Get-FileHash photo.jpg` (Windows PowerShell) doit donner l'empreinte affichée (bouton « Copier »).
- **Démo locale** : placez vos photos dans `frontend/public/images/` et utilisez le lien
  `/images/nom-du-fichier`. Seuls le lien et l'empreinte vont sur la blockchain, jamais l'image
  (ce serait beaucoup trop coûteux en gas).

### Authentifier le vendeur

L'adresse qui crée une enchère est garantie par la blockchain (seul le détenteur de la clé privée peut
l'utiliser). Il reste à relier cette adresse à l'identité publique du vendeur :

1. **Profil** (*Mon compte*) : nom affiché et lien vers son site ou réseau social, enregistrés dans le
   contrat. Le vendeur publie aussi **son adresse** sur cette page : le lien dans les deux sens prouve
   que l'adresse est bien la sienne. Le nom seul ne prouve rien (n'importe qui peut choisir un nom).
2. **Annonce signée** : sur son enchère, le vendeur clique sur *Signer une annonce*. MetaMask signe un
   texte décrivant l'enchère (gratuit, aucune transaction). Le vendeur publie ce texte où il veut.
3. **Vérification** : n'importe qui colle l'annonce dans l'onglet *Vérifier*. L'application retrouve
   l'adresse qui a signé (`verifyMessage` d'Ethers.js) et la compare au vendeur enregistré dans le
   contrat. Une annonce modifiée, ou recopiée et signée par quelqu'un d'autre, est refusée.

Ces mécanismes prouvent **qui** a créé l'annonce, pas que le vendeur est honnête ni que l'objet est
authentique : une blockchain ne peut pas vérifier un objet physique.

Chaque enchère a aussi un **lien direct** (`…/#/enchere/3`, bouton « Copier le lien ») à partager
avec l'annonce.

## 10. Problèmes fréquents

| Problème | Solution |
|---|---|
| « Ganache est injoignable » | Ganache n'est pas lancé ou n'écoute pas sur le port 7545 |
| « Contrat introuvable sur ce réseau » | Ganache a été redémarré : relancez `npm run migrate` puis rechargez la page |
| Erreur de *nonce* dans MetaMask après un redémarrage de Ganache | MetaMask → Paramètres → Avancé → **Effacer les données de l'onglet Activité** (pour chaque compte importé) |
| « Mauvais réseau dans MetaMask » | Cliquez sur « Basculer sur Ganache » ou sélectionnez le réseau Ganache dans MetaMask |
| Solde affiché à 0 dans MetaMask | Vérifiez que MetaMask est bien sur le réseau Ganache (chain ID 1337) |

**À propos de l'horloge de Ganache** : Ganache ne crée un bloc que lorsqu'une transaction arrive, et
MetaMask simule chaque transaction avec l'heure du dernier bloc. Sans précaution, une enchère dont le
délai est écoulé paraîtrait encore « en cours » à cette simulation et la clôture serait refusée.
L'interface demande donc à Ganache de miner un bloc vide avant chaque transaction
(`syncLocalChainTime` dans `frontend/src/lib/blockchain.js`). Sur un vrai réseau, des blocs sont
produits en continu et cette étape est sans effet.
