// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Auction {
    struct AuctionItem {
        address seller;
        string itemName;
        string description;
        uint256 minPrice;
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool ended;
    }

    uint256 public auctionCount;
    mapping(uint256 => AuctionItem) private auctions;
    mapping(address => uint256) public pendingReturns;

    event AuctionCreated(uint256 indexed auctionId, address indexed seller, string itemName, uint256 minPrice, uint256 endTime);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address winner, uint256 amount);
    event Withdrawal(address indexed bidder, uint256 amount);

    modifier auctionExists(uint256 auctionId) {
        require(auctionId < auctionCount, "Enchere inexistante");
        _;
    }

    function createAuction(
        string calldata itemName,
        string calldata description,
        uint256 minPrice,
        uint256 duration
    ) external returns (uint256 auctionId) {
        require(bytes(itemName).length > 0, "Nom de l'article obligatoire");
        require(minPrice > 0, "Le prix minimal doit etre > 0");
        require(duration > 0, "La duree doit etre > 0");

        auctionId = auctionCount;
        auctionCount++;

        AuctionItem storage a = auctions[auctionId];
        a.seller = msg.sender;
        a.itemName = itemName;
        a.description = description;
        a.minPrice = minPrice;
        a.endTime = block.timestamp + duration;

        emit AuctionCreated(auctionId, msg.sender, itemName, minPrice, a.endTime);
    }

    function bid(uint256 auctionId) external payable auctionExists(auctionId) {
        AuctionItem storage a = auctions[auctionId];

        require(!a.ended && block.timestamp < a.endTime, "Enchere terminee");
        require(msg.sender != a.seller, "Le vendeur ne peut pas encherir");

        if (a.highestBidder == address(0)) {
            require(msg.value >= a.minPrice, "Offre inferieure au prix minimal");
        } else {
            require(msg.value > a.highestBid, "Offre trop basse");
            pendingReturns[a.highestBidder] += a.highestBid;
        }

        a.highestBidder = msg.sender;
        a.highestBid = msg.value;

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    function withdraw() external {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "Aucun fonds a retirer");

        pendingReturns[msg.sender] = 0;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Echec du transfert");

        emit Withdrawal(msg.sender, amount);
    }

    function endAuction(uint256 auctionId) external auctionExists(auctionId) {
        AuctionItem storage a = auctions[auctionId];

        require(block.timestamp >= a.endTime, "Enchere encore en cours");
        require(!a.ended, "Enchere deja cloturee");

        a.ended = true;

        if (a.highestBidder != address(0)) {
            (bool ok, ) = payable(a.seller).call{value: a.highestBid}("");
            require(ok, "Echec du virement vendeur");
        }

        emit AuctionEnded(auctionId, a.highestBidder, a.highestBid);
    }

    function getAuction(uint256 auctionId) external view auctionExists(auctionId) returns (AuctionItem memory) {
        return auctions[auctionId];
    }
}
