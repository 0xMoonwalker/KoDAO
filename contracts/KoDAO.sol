// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";

/**
 * @title KoDAO Passes Contract
 * @dev Extends ERC1155 Token Standard basic implementation
 */
contract KoDAO is ERC1155Supply, Ownable {
    string public name;
    string public symbol;
    uint256 private constant tokenID = 0;
    uint256 public constant maxSupply = 2600;
    // uint256 public constant maxPurchase = 5;
    uint256 public constant mintPrice = 0.1 ether;
    uint256 public reserveMaxAmount = 260;
    address public beneficiary;
    mapping(address => uint256) public presaled;

    constructor(string memory _uri) ERC1155(_uri) ERC1155Supply() {
        name = "KoDAO";
        symbol = "KODAO";
    }

    function totalSupply() public view returns (uint256) {
        return totalSupply(tokenID);
    }

    function mint(address account, uint256 amount) public payable {
        // require(amount < maxPurchase, "Max purchase exceeded");
        require(
            totalSupply(tokenID) + amount < maxSupply,
            "Purchase would exceed max supply"
        );
        require(mintPrice * amount == msg.value, "Incorrect ETH value sent");

        _mint(account, tokenID, amount, "");
    }

    function claim(address account) public {
        uint256 amount = presaled[account];
        require(amount > 0, "Address not eligible for claim");

        _mint(account, tokenID, amount, "");
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool sent, bytes memory data) = payable(beneficiary).call{
            value: balance
        }("");
        require(sent, "Failed to send Ether");
    }

    function setPresaled(
        address[] calldata accounts,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(accounts.length == amounts.length, "Incorrect data");
        for (uint256 i = 0; i < accounts.length; i++) {
            presaled[accounts[i]] = amounts[i];
        }
    }

    function setPresaled(address account, uint256 amount) external onlyOwner {
        presaled[account] = amount;
    }
}
