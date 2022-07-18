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
    uint256 public constant maxSupply = 2600 + 1;
    // uint256 public constant maxPurchase = 5;
    uint256 public constant mintPrice = 0.1 ether;
    uint256 public reserveMaxAmount = 260;
    address public beneficiary;
    bool private saleActive = false;
    mapping(address => uint256) public presaled;

    constructor(string memory _uri) ERC1155(_uri) ERC1155Supply() {
        name = "KoDAO";
        symbol = "KODAO";
    }

    modifier saleIsActive() {
        require(saleActive, "Sale not active"); 
        _;
    }

    function totalSupply() public view returns (uint256) {
        return totalSupply(tokenID);
    }

    function setSaleActive(bool state) external onlyOwner {
        saleActive = state;
    }

    function mint(uint256 amount) public payable saleIsActive {
        // require(amount < maxPurchase, "Max purchase exceeded");
        require(totalSupply(tokenID) + amount < maxSupply, "Purchase would exceed max supply");
        require(mintPrice * amount == msg.value, "Incorrect ETH value sent");

        _mint(msg.sender, tokenID, amount, "");
    }

    function claim() public saleIsActive {
        address account = msg.sender;
        uint256 amount = presaled[account];
        require(amount > 0, "Address not eligible for claim");

        _mint(account, tokenID, amount, "");
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool sent, bytes memory _data) = payable(beneficiary).call{ value: balance }("");
        // _data;
        require(sent, "Failed to send Ether");
    }

    function setPresaled(address[] calldata accounts, uint256[] calldata amounts)
        external
        onlyOwner
    {
        require(accounts.length == amounts.length, "Incorrect data");
        for (uint256 i = 0; i < accounts.length; i++) {
            presaled[accounts[i]] = amounts[i];
        }
    }

    function setPresaled(address account, uint256 amount) external onlyOwner {
        presaled[account] = amount;
    }

    function setURI(string memory newURI) external onlyOwner {
        _setURI(newURI);
        emit URI(newURI, tokenID);
    }
}
