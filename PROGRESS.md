# Suivi du projet

## Fait
- [x] Smart contract `contracts/Auction.sol` (création, offre, retrait, clôture, événements, anti-réentrance)
- [x] 31 tests Truffle (`npm test` en mémoire, `npm run test:ganache` sur le port 7545) — tous verts
- [x] Vérification que les tests détectent les erreurs (règles volontairement cassées → tests en échec)
- [x] Migration qui copie l'adresse et l'ABI vers le front-end
- [x] Interface React + Ethers.js : connexion MetaMask, liste filtrable, création, détail avec
      compte à rebours et historique, enchérir, clôturer, « Mon compte » avec retrait
- [x] Parcours complet testé dans un navigateur (Chromium sans interface) avec un portefeuille
      simulé branché sur Ganache : 21/21 vérifications
- [x] Correctif horloge Ganache (bloc vide miné avant chaque transaction, sinon clôture refusée)
- [x] README (installation, MetaMask, scénario de démo, dépannage)
- [x] Photo vérifiable : lien + empreinte SHA-256 dans le contrat, détection d'une photo remplacée
- [x] Authentification du vendeur : profil public, annonces signées (MetaMask), page « Vérifier »,
      liens directs vers chaque enchère — testé dans le navigateur : 18/18 vérifications
- [x] Rapport (LaTeX, 21 pages) livré séparément : Rapport_Encheres_Blockchain.pdf + sources

## Reste à faire (équipe)
- [ ] Lancer le projet en local avec le vrai MetaMask (README §3–4)
- [ ] Enregistrer la vidéo de démonstration (scénario README §5)
- [ ] Relire le rapport et compléter les captures si besoin
