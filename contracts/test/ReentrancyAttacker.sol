// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../Auction.sol";

/// @dev Contrat utilisé UNIQUEMENT dans les tests : il tente de rappeler withdraw()
///      pendant qu'il reçoit des ETH (attaque par réentrance).
contract ReentrancyAttacker {
    Auction public immutable auction;
    uint256 public reentryAttempts;

    constructor(Auction _auction) {
        auction = _auction;
    }

    function placeBid(uint256 auctionId) external payable {
        auction.bid{value: msg.value}(auctionId);
    }

    function attack() external {
        auction.withdraw();
    }

    receive() external payable {
        if (reentryAttempts == 0) {
            reentryAttempts++;
            auction.withdraw(); // doit échouer grâce à nonReentrant
        }
    }
}
