// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Gestion d'enchères sur la blockchain
/// @notice Un vendeur met un article en vente avec une enchère minimale et une durée fixe.
///         Les enchérisseurs envoient des offres en ETH ; à la fin, le meilleur enchérisseur
///         gagne, le vendeur est payé et les enchérisseurs dépassés retirent leurs fonds.
contract Auction is ReentrancyGuard {
    struct AuctionItem {
        address seller;          // vendeur
        string itemName;         // nom de l'article
        string description;      // description courte
        string imageURI;         // lien vers la photo (URL ou ipfs://), optionnel
        bytes32 imageHash;       // empreinte SHA-256 de la photo (0 si pas de photo)
        uint256 minPrice;        // enchère minimale (en wei)
        uint256 endTime;         // date de fin (timestamp)
        address highestBidder;   // meilleur enchérisseur
        uint256 highestBid;      // meilleure offre (en wei)
        bool ended;              // enchère clôturée ?
    }

    /// @notice Nombre total d'enchères créées (les identifiants vont de 0 à auctionCount - 1)
    uint256 public auctionCount;

    mapping(uint256 => AuctionItem) private auctions;

    /// @notice Montants à rembourser (offres dépassées), retirables via withdraw()
    mapping(address => uint256) public pendingReturns;

    /// @notice Profil public d'un vendeur : nom affiché et lien vers sa page
    ///         (site, réseau social…). Le vendeur publie son adresse sur cette page :
    ///         le lien dans les deux sens permet aux acheteurs de l'authentifier.
    struct SellerProfile {
        string name;
        string link;
    }
    mapping(address => SellerProfile) private profiles;

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        string itemName,
        uint256 minPrice,
        uint256 endTime
    );
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address winner, uint256 amount);
    event Withdrawal(address indexed bidder, uint256 amount);
    event ProfileUpdated(address indexed seller, string name, string link);

    modifier auctionExists(uint256 auctionId) {
        require(auctionId < auctionCount, "Enchere inexistante");
        _;
    }

    /// @notice Crée une enchère.
    /// @param itemName nom de l'article
    /// @param description description de l'article
    /// @param imageURI lien vers la photo de l'article ("" si aucune)
    /// @param imageHash empreinte SHA-256 du fichier image (0 si aucune photo).
    ///        Enregistrée avant toute offre, elle permet de vérifier que la photo
    ///        affichée n'a pas été remplacée après coup.
    /// @param minPrice enchère minimale en wei
    /// @param duration durée en secondes
    function createAuction(
        string calldata itemName,
        string calldata description,
        string calldata imageURI,
        bytes32 imageHash,
        uint256 minPrice,
        uint256 duration
    ) external returns (uint256 auctionId) {
        require(bytes(itemName).length > 0, "Nom de l'article obligatoire");
        require(minPrice > 0, "Le prix minimal doit etre > 0");
        require(duration > 0, "La duree doit etre > 0");
        // Une photo doit être accompagnée de son empreinte, et inversement
        require(
            (bytes(imageURI).length == 0) == (imageHash == bytes32(0)),
            "Image et empreinte vont ensemble"
        );

        auctionId = auctionCount;
        auctionCount++;

        AuctionItem storage a = auctions[auctionId];
        a.seller = msg.sender;
        a.itemName = itemName;
        a.description = description;
        a.imageURI = imageURI;
        a.imageHash = imageHash;
        a.minPrice = minPrice;
        a.endTime = block.timestamp + duration;

        emit AuctionCreated(auctionId, msg.sender, itemName, minPrice, a.endTime);
    }

    /// @notice Propose une offre : le montant envoyé (msg.value) est l'offre.
    function bid(uint256 auctionId) external payable auctionExists(auctionId) {
        AuctionItem storage a = auctions[auctionId];

        require(!a.ended && block.timestamp < a.endTime, "Enchere terminee");
        require(msg.sender != a.seller, "Le vendeur ne peut pas encherir");

        if (a.highestBidder == address(0)) {
            require(msg.value >= a.minPrice, "Offre inferieure au prix minimal");
        } else {
            require(msg.value > a.highestBid, "Offre trop basse");
            // L'ancienne meilleure offre devient remboursable (retrait à la demande).
            pendingReturns[a.highestBidder] += a.highestBid;
        }

        a.highestBidder = msg.sender;
        a.highestBid = msg.value;

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    /// @notice Retire les fonds des offres dépassées.
    function withdraw() external nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "Aucun fonds a retirer");

        // On remet le solde à zéro AVANT l'envoi (protection contre la réentrance).
        pendingReturns[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Echec du transfert");

        emit Withdrawal(msg.sender, amount);
    }

    /// @notice Clôture l'enchère une fois la date de fin passée. Appelable par n'importe qui.
    function endAuction(uint256 auctionId) external nonReentrant auctionExists(auctionId) {
        AuctionItem storage a = auctions[auctionId];

        require(block.timestamp >= a.endTime, "Enchere encore en cours");
        require(!a.ended, "Enchere deja cloturee");

        a.ended = true;

        if (a.highestBidder != address(0)) {
            (bool ok, ) = payable(a.seller).call{value: a.highestBid}("");
            if (!ok) {
                // Si le vendeur ne peut pas recevoir d'ETH directement,
                // le montant lui reste dû et il peut le retirer via withdraw().
                pendingReturns[a.seller] += a.highestBid;
            }
        }

        emit AuctionEnded(auctionId, a.highestBidder, a.highestBid);
    }

    /// @notice Crée ou met à jour le profil public du vendeur (appelant).
    function setProfile(string calldata name, string calldata link) external {
        require(bytes(name).length > 0, "Nom du profil obligatoire");
        require(bytes(name).length <= 64 && bytes(link).length <= 200, "Profil trop long");
        profiles[msg.sender] = SellerProfile(name, link);
        emit ProfileUpdated(msg.sender, name, link);
    }

    /// @notice Profil public d'une adresse (champs vides si aucun profil).
    function getProfile(address seller) external view returns (SellerProfile memory) {
        return profiles[seller];
    }

    /// @notice Renvoie toutes les informations d'une enchère.
    function getAuction(uint256 auctionId)
        external
        view
        auctionExists(auctionId)
        returns (AuctionItem memory)
    {
        return auctions[auctionId];
    }
}
