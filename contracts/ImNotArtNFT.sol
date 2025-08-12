// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ImNotArtNFT is ERC1155, Ownable {
    using Strings for uint256;
    
    uint256 private _tokenIdCounter;
    
    struct TokenInfo {
        address artist;
        uint256 maxSupply;
        uint256 currentSupply;
        uint256 royaltyPercentage; // 10% = 1000 (basis points)
        string metadataURI;
    }
    
    mapping(uint256 => TokenInfo) public tokenInfo;
    
    event TokenMinted(
        uint256 indexed tokenId,
        address indexed artist,
        address indexed buyer,
        uint256 amount
    );
    
    event TokenCreated(
        uint256 indexed tokenId,
        address indexed artist,
        uint256 maxSupply,
        string metadataURI
    );
    
    constructor(address initialOwner) ERC1155("https://imnotart.com/api/metadata/{id}") Ownable(initialOwner) {
        _tokenIdCounter = 1;
    }
    
    function createToken(
        address artist,
        uint256 maxSupply,
        string memory metadataURI
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        
        tokenInfo[tokenId] = TokenInfo({
            artist: artist,
            maxSupply: maxSupply,
            currentSupply: 0,
            royaltyPercentage: 1000, // 10%
            metadataURI: metadataURI
        });
        
        emit TokenCreated(tokenId, artist, maxSupply, metadataURI);
        return tokenId;
    }
    
    function mintToken(
        uint256 tokenId,
        address buyer,
        uint256 amount
    ) external onlyOwner {
        TokenInfo storage token = tokenInfo[tokenId];
        require(token.artist != address(0), "Token does not exist");
        require(token.currentSupply + amount <= token.maxSupply, "Exceeds max supply");
        
        token.currentSupply += amount;
        _mint(buyer, tokenId, amount, "");
        
        emit TokenMinted(tokenId, token.artist, buyer, amount);
    }
    
    function uri(uint256 tokenId) public view override returns (string memory) {
        TokenInfo memory token = tokenInfo[tokenId];
        require(token.artist != address(0), "Token does not exist");
        return token.metadataURI;
    }
    
    function getTokenInfo(uint256 tokenId) external view returns (TokenInfo memory) {
        return tokenInfo[tokenId];
    }
    
    function getRoyaltyInfo(uint256 tokenId, uint256 salePrice) 
        external 
        view 
        returns (address receiver, uint256 royaltyAmount) 
    {
        TokenInfo memory token = tokenInfo[tokenId];
        require(token.artist != address(0), "Token does not exist");
        
        royaltyAmount = (salePrice * token.royaltyPercentage) / 10000;
        receiver = token.artist;
    }
}