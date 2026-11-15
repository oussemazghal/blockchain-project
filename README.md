# Enchères DApp

> **Le code arbitre, les offres décident.**  
> Une application décentralisée d'enchères à durée fixe et prix minimal sur Ethereum : les fonds sont sécurisés par smart contract, les remboursements des offres dépassées sont garantis sans intermédiaire, et l'authenticité des articles est protégée par empreinte cryptographique.

[🎬 Démo vidéo](#2-démonstration) · [📄 Rapport de projet](#2-démonstration) · [⚙️ Installation](#6-installation) · [👥 Équipe](#8-membres-de-léquipe)

🌐 **Langue / Language :** Français

---

## Sommaire

- [1. Introduction](#1-introduction)
- [2. Démonstration](#2-démonstration)
- [3. Architecture](#3-architecture)
- [4. Outils utilisés](#4-outils-utilisés)
- [5. Fonctionnalités et règles](#5-fonctionnalités-et-règles)
- [6. Installation et démarrage](#6-installation-et-démarrage)
- [7. Dépannage et bonnes pratiques](#7-dépannage-et-bonnes-pratiques)
- [8. Membres de l'équipe](#8-membres-de-léquipe)

---

## 1. Introduction

Sur les plateformes d'enchères en ligne traditionnelles (eBay, maisons de vente...), la confiance repose entièrement sur un **intermédiaire centralisé**. C'est lui qui encaisse les fonds, décide de la fin de l'enchère, prélève des commissions et arbitre les litiges de manière opaque.

**Enchères DApp** supprime cet intermédiaire grâce à un **smart contract Solidity immuable** sur la blockchain Ethereum. Un vendeur met un article en vente avec un **prix minimal** et une **durée fixe**. Pendant la période d'enchère :
- ✅ **Chaque offre valide** dépasse strictement la précédente et devient la nouvelle offre gagnante provisoire.
- ↩️ **L'enchérisseur dépassé** est crédité instantanément et peut retirer l'intégralité de sa mise à tout moment.
- 🏆 **À l'échéance**, n'importe quel participant peut déclencher la clôture : le vendeur reçoit immédiatement les fonds et le gagnant est irrévocablement désigné.

| Critère | Enchères traditionnelles (centralisées) | Enchères décentralisées (*Enchères DApp*) |
| :--- | :--- | :--- |
| **Qui garde l'argent ?** | La plateforme centrale (compte bancaire privé) | Le smart contract autonome (`Auction.sol`) |
| **Qui fixe et applique les règles ?** | L'opérateur du site (modifiables à tout moment) | Le code Solidity, vérifiable et immuable dès le déploiement |
| **Remboursement des enchérisseurs ?** | Selon la politique du site (délais bancaires, frais) | Garanti par le contrat via le pattern sécurisé *Pull payment* |
| **Clôture et désignation du gagnant ?** | Décision unilatérale de l'administrateur | Déterminée mathématiquement par `block.timestamp` |
| **Authenticité des photos ?** | Hébergées sur des serveurs privés (remplaçables) | Empreinte SHA-256 ancrée dans la blockchain |
| **Identité du vendeur ?** | Profil fermé sur une plateforme tierce | Clé cryptographique publique + annonces signées (EIP-191) |

---

## 2. Démonstration

### 🎬 Vidéo et documentation
- **Vidéo de démonstration (3 à 5 minutes) :** Parcours complet filmé (création d'enchère, offres d'Alice et Bob, retrait des fonds bloqués, clôture et vérification d'authenticité).
- **Rapport technique :** Document complet rédigé en LaTeX détaillant la conception, la sécurité et la matrice de validation.

### 📸 Parcours utilisateur illustré

| 1. Création d'enchère & Empreinte SHA-256 | 2. Enchères en direct & Surenchère |
| :---: | :---: |
| Formulaire de création avec nom, prix min, durée et photo vérifiée par hash SHA-256. | Historique dynamique des offres, compte à rebours et détection du meilleur enchérisseur. |

| 3. Retrait sécurisé (*Mon Compte*) | 4. Clôture & Vérification d'Annonce |
| :---: | :---: |
| Modèle *Pull over Push* : bouton « Retirer mes fonds » pour récupérer les ETH des offres dépassées. | Clôture transparente après expiration et vérification cryptographique des annonces du vendeur. |

---

## 3. Architecture

L'application repose sur une architecture entièrement décentralisée, **sans serveur d'application ni base de données centralisée** : la blockchain Ethereum fait office de base de données d'état et de moteur d'exécution logique.

```
┌─────────────────────────────────────────────────────────────┐
│                       Navigateur Web                        │
│   React 18 + Vite  ◄──────────────►   Extension MetaMask    │
│   (Interface utilisateur)             (Signature & Clés)    │
└──────────────┬──────────────────────────────┬───────────────┘
               │ Lecture directe (RPC)        │ Envoi de transactions signées
               ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Nœud Ethereum Local (Ganache)               │
│                     Port 7545 · Chain ID 1337               │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │               Smart Contract Auction.sol            │   │
│   │  • Gestion des enchères (Item, minPrice, endTime)   │   │
│   │  • Pattern Pull Payment (pendingReturns[address])   │   │
│   │  • Protection anti-réentrance (ReentrancyGuard)     │   │
│   │  • Événements temps réel (BidPlaced, AuctionEnded)  │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Principes de conception et sécurité
1. **Modèle Pull over Push (*Retrait à la demande*) :**  
   Lorsqu'un enchérisseur est dépassé, le contrat ne lui renvoie pas immédiatement ses ETH via un `call` dans `bid()`. Il crédite son solde dans la table `pendingReturns[address]`. L'utilisateur retire lui-même ses fonds via `withdraw()`. Cela élimine totalement les attaques par déni de service (DoS) où un contrat malveillant rejetterait les ETH entrants pour bloquer l'enchère.
2. **Protection contre la réentrance (*ReentrancyGuard*) :**  
   Application stricte du pattern *Checks-Effects-Interactions* : le solde `pendingReturns` est remis à zéro **avant** l'émission du virement d'ETH. Les méthodes sensibles portent également le modificateur `nonReentrant` d'OpenZeppelin.
3. **Immutabilité de l'article & Preuve SHA-256 :**  
   Pour éviter le stockage on-chain prohibitif en gaz d'une image, seuls le lien public de la photo et son **empreinte cryptographique SHA-256 (32 octets)** sont stockés dans le contrat. L'interface compare à la volée le hash du fichier affiché avec le hash scellé on-chain.
4. **Synchronisation de l'horloge Ganache :**  
   Ganache n'incrémente son horloge que lors de l'arrivée d'une transaction. Pour garantir que la simulation MetaMask prenne en compte l'expiration du temps, un bloc vide est miné automatiquement avant chaque transaction critique (`syncLocalChainTime`).

---

## 4. Outils utilisés

| Domaine | Technologie & Outils | Rôle dans le projet |
| :--- | :--- | :--- |
| **Smart contracts** | Solidity `^0.8.20`, OpenZeppelin Contracts | Logique métier décentralisée, sécurité et gestion des états |
| **Suite de développement** | Truffle Suite `v5.x` | Compilation, scripts de migration et environnement de test Mocha/Chai |
| **Blockchain locale** | Ganache 7 (`port 7545`, `chain ID 1337`) | Réseau de test local déterministe avec 10 comptes préfinancés |
| **Interface Web** | React 18, Vite, CSS moderne | Interface réactive avec routage par hash et filtres dynamiques |
| **Bibliothèque Web3** | Ethers.js `v6` | Interaction avec les contrats, encodage des données et gestion des événements |
| **Portefeuille Web3** | MetaMask | Gestion des clés privées, signature des transactions et messages EIP-191 |
| **Tests automatisés** | Mocha, Chai | **31 tests réussis (100% de succès)** couvrant règles, erreurs et sécurité |

---

## 5. Fonctionnalités et règles

### Matrice de conformité aux exigences fonctionnelles

| Réf. | Fonctionnalité | Acteur | Méthode Solidity / Implémentation |
| :---: | :--- | :--- | :--- |
| **F1** | **Création d'une enchère** | Vendeur | `createAuction(name, desc, imgURI, imgHash, minPrice, duration)` |
| **F2** | **Placer une offre** | Enchérisseur | `bid(auctionId)` *(payable)* — vérifie le montant et la validité temporelle |
| **F3** | **Suivi en temps réel** | Tout visiteur | `getAuction(auctionId)`, écoute de `BidPlaced`, calcul du temps restant |
| **F4** | **Clôture de l'enchère** | Tout acteur | `endAuction(auctionId)` — attribue le lot et transfère les fonds au vendeur |
| **F5** | **Remboursement sécurisé** | Enchérisseur dépassé | `withdraw()` — retrait à la demande via le pattern Pull payment |
| **F6** | **Traçabilité & Événements** | Smart contract | Émission de `AuctionCreated`, `BidPlaced`, `AuctionEnded`, `Withdrawal` |
| **F7** | **Interface Web décentralisée** | Tout le monde | DApp React avec support multi-comptes MetaMask et mode lecture seule |
| **F8** | **Photo infalsifiable** *(Bonus)* | Vendeur / Public | Calcul client du SHA-256 et comparaison avec l'`imageHash` on-chain |
| **F9** | **Annonces signées** *(Bonus)* | Vendeur / Public | Signature cryptographique MetaMask (EIP-191) et vérification d'authenticité |

### Règles de gestion strictes (RG1 à RG8)
- **RG1 :** Toute enchère possède un vendeur, un prix minimal strictement supérieur à 0 et une durée fixe $> 0$.
- **RG2 :** Toute offre soumise après expiration du délai (`block.timestamp >= endTime`) est rejetée.
- **RG3 :** La première offre doit être $\ge$ au prix minimal. Toute surenchère doit être strictement supérieure à l'offre en tête (`msg.value > highestBid`).
- **RG4 :** Le vendeur ne peut en aucun cas enchérir sur sa propre vente.
- **RG5 :** Les fonds de l'enchérisseur dépassé sont immédiatement transférés dans `pendingReturns` et prêts au retrait.
- **RG6 :** La clôture est irréversible : un gagnant unique est proclamé et le contrat ne peut pas être clôturé deux fois.
- **RG7 :** Si une enchère expire sans aucune offre, la clôture est validée sans transfert monétaire.
- **RG8 :** Si le vendeur refuse les paiements en direct, les fonds sont crédités sur son solde de retrait sans jamais bloquer la clôture.

### Arborescence du projet

```
auction-dapp/
├── contracts/
│   ├── Auction.sol                 # Smart contract principal des enchères
│   └── test/                       # Contrats auxiliaires pour les tests de sécurité
│       ├── ReentrancyAttacker.sol  # Simulation d'une attaque par réentrance
│       └── RejectingSeller.sol     # Vendeur refusant les paiements (test DoS)
├── migrations/
│   └── 1_deploy_auction.js         # Déploiement Truffle + export automatique de l'ABI
├── test/
│   └── auction.test.js             # 31 tests Truffle automatisés (Mocha / Chai)
├── frontend/                       # Application Web React + Vite
│   ├── src/
│   │   ├── components/             # Composants (Detail, List, Create, MyAccount, Verify...)
│   │   ├── hooks/                  # useWallet (MetaMask), useAuctions, useProfile
│   │   ├── lib/                    # blockchain.js (Ethers), trust.js (SHA-256 & signatures)
│   │   ├── contract/Auction.json   # ABI et adresse déployée synchronisées
│   │   ├── App.jsx                 # Routage par hash et logique globale
│   │   └── styles.css              # Styles et charte visuelle
│   └── public/images/              # Images de test (velo.svg, montre.svg)
├── truffle-config.js               # Configuration du compilateur et du réseau Ganache
├── package.json                    # Scripts d'orchestration globale
├── PROGRESS.md                     # Suivi d'avancement et répartition de l'équipe
└── README.md                       # Documentation officielle du projet
```

---

## 6. Installation et démarrage

### Prérequis
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) version 18 ou plus récente (testé sous Node 22) et `npm`
- Extension [MetaMask](https://metamask.io/) installée sur votre navigateur

### 1. Cloner le projet et installer les dépendances
```bash
git clone https://github.com/oussemazghal/blockchain-project.git
cd blockchain-project

# Installation de toutes les dépendances (racine et frontend)
npm run setup
```

### 2. Exécuter les tests unitaires
Vérifiez immédiatement la validité du smart contract avec la suite de 31 tests :
```bash
npm test
```
*Le résultat doit afficher `31 passing` sans aucun avertissement.*

Vérifiez aussi le catalogue et le rendu des pages de l'interface :
```bash
npm --prefix frontend test              # recherche, filtres et tri du catalogue
npm --prefix frontend run test:render   # rendu des pages et états, sans navigateur
```

---

### 3. Lancer l'environnement de démonstration

Ouvrez **3 terminaux séparés** à la racine du projet :

#### 🔹 Terminal 1 : Démarrer la blockchain locale Ganache
```bash
npm run ganache
```
*Démarre un nœud local sur `http://127.0.0.1:7545` (Chain ID : `1337`) avec 10 comptes préfinancés à 1000 ETH fictifs.*

#### 🔹 Terminal 2 : Compiler et déployer le contrat
```bash
npm run migrate
```
*Compile `Auction.sol`, le déploie sur Ganache et synchronise automatiquement l'adresse et l'ABI dans `frontend/src/contract/Auction.json`.*

#### 🔹 Terminal 3 : Lancer l'interface utilisateur React
```bash
npm run frontend
```
*L'application s'ouvre automatiquement sur `http://localhost:5173`.*

L'onglet **Vendre un objet** permet de créer une enchère. **Mon compte** regroupe
le profil du vendeur, le suivi des offres et le retrait des fonds.

---

### 4. Configuration de MetaMask

1. **Ajouter le réseau local Ganache :**
   - **Nom du réseau :** `Ganache Local`
   - **Nouvelle URL de RPC :** `http://127.0.0.1:7545`
   - **ID de chaîne :** `1337`
   - **Symbole de la monnaie :** `ETH`
   *(L'application propose également un bouton direct « Basculer sur Ganache » pour l'ajouter en un clic).*

2. **Importer les comptes de démonstration :**  
   Dans MetaMask, cliquez sur *Ajouter un compte* $\rightarrow$ *Importer un compte*, puis collez l'une des clés privées générées par Ganache :

| Rôle dans le scénario | Adresse du compte | Clé privée de test |
| :--- | :--- | :--- |
| **Vendeur (Compte 0)** | `0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1` | `0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d` |
| **Enchérisseur A (Compte 1)** | `0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0` | `0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1` |
| **Enchérisseur B (Compte 2)** | `0x22d491Bde2303f2f43325b2108D26f1eAbA1e32b` | `0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c` |

> ⚠️ **Sécurité :** Ces clés privées sont publiques et réservées exclusivement au développement local. Ne transférez jamais de vrais fonds vers ces adresses.

### 5. Changer de compte et se déconnecter

Cliquez sur votre adresse en haut à droite pour ouvrir le portefeuille :
- **Changer de compte** ouvre le choix des comptes dans MetaMask. Sélectionnez le vendeur ou un enchérisseur pour poursuivre le scénario avec ce rôle.
- **Se déconnecter** remet l'application en mode visiteur. Elle reste déconnectée après un rechargement de la page. Cliquez sur **Connecter le portefeuille**, puis **Connecter MetaMask** pour choisir à nouveau un compte.

Le solde, les offres et les contrôles du vendeur suivent le compte sélectionné.
Attendez la confirmation d'une transaction avant de changer de rôle. Les enchères
déjà créées restent sur Ganache pendant ces changements de compte.

---

### Commandes npm utiles

| Commande | Action |
| :--- | :--- |
| `npm run setup` | Installe les packages racine et ceux du sous-dossier `frontend/` |
| `npm test` | Exécute les 31 tests Truffle sur une instance Ganache en mémoire |
| `npm run test:ganache` | Exécute les tests sur le serveur Ganache actif (`port 7545`) |
| `npm --prefix frontend test` | Vérifie la recherche, les filtres et le tri du catalogue |
| `npm --prefix frontend run test:render` | Vérifie le rendu des pages et des états de l'interface sans navigateur |
| `npm run compile` | Recompile les smart contracts Solidity |
| `npm run migrate` | Déploie les contrats sur Ganache et met à jour l'ABI frontend |
| `npm run ganache` | Démarre la blockchain locale en ligne de commande |
| `npm run frontend` | Démarre le serveur de développement Vite React |

---

## 7. Dépannage et bonnes pratiques

| Problème rencontré | Cause probable | Solution |
| :--- | :--- | :--- |
| **« Erreur de nonce » dans MetaMask** | Ganache a été redémarré alors que MetaMask a mémorisé d'anciennes transactions | Dans MetaMask : *Paramètres* $\rightarrow$ *Avancé* $\rightarrow$ **« Effacer les données d'activité de l'onglet Activité »**. |
| **« Contrat introuvable sur ce réseau »** | Les contrats n'ont pas été redéployés après le redémarrage de Ganache | Lancez `npm run migrate` dans le Terminal 2, puis actualisez la page Web (`F5`). |
| **« Ganache est injoignable »** | Le serveur local Ganache n'est pas actif sur le port 7545 | Vérifiez que le Terminal 1 exécute bien `npm run ganache` ou que l'application de bureau Ganache est ouverte. |
| **Solde à 0 ETH affiché** | Mauvais réseau sélectionné dans le portefeuille | Vérifiez que MetaMask est bien connecté à `Ganache Local` (Chain ID `1337`). |

---

## 8. Membres de l'équipe

Projet réalisé dans le cadre du module **Blockchain** — Sujet 5 : *Mise en vente d'un article avec enchère minimale et durée fixe*.  
**Faculté des Sciences de Sfax (FSS)** · **Université de Sfax**  
*Année universitaire 2026 – 2027*

| Membre | Profil GitHub | Rôle principal & Responsabilités techniques |
| :--- | :--- | :--- |
| **Med Amine Salhi** | [@medaminesalhi](https://github.com/medaminesalhi) | **Smart contract Solidity :** Règles métier de l'enchère, modèle de retrait (*Pull payment*), sécurité anti-réentrance et événements. |
| **Oussema Zghal** | [@oussemazghal](https://github.com/oussemazghal) | **Tests et déploiement :** 31 tests automatisés Truffle sur Ganache, scripts de migration, configuration réseau et scénarios d'attaque. |
| **Omar Bouattour** | [@OmarBouat](https://github.com/OmarBouat) | **Interface utilisateur React :** Composants de page, formulaires de création, affichage réactif des enchères et gestion des erreurs en français. |
| **Nour Mellah** | [@nourmellah](https://github.com/nourmellah) | **Intégration Web3 :** Ethers.js v6, connexion MetaMask, exécution des transactions et écoute des événements en direct. |

**Supervision académique :** M. Claude Duvallet
