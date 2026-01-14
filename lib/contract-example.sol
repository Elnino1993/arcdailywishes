// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title DailyWishNFT
 * @dev NFT contract for daily wish minting on Arc Testnet
 * This is an example contract that can be deployed to Arc Testnet
 */
contract DailyWishNFT is ERC721URIStorage, Ownable {
    using Strings for uint256;

    uint256 private _tokenIdCounter;

    struct WishData {
        uint256 tokenId;
        string wishText;
        string dateKey;
        uint256 timestamp;
        address minter;
    }

    // Mapping from address to their wishes
    mapping(address => WishData[]) private _wishesByAddress;
    
    // Mapping from address + dateKey to bool (to enforce one per day)
    mapping(address => mapping(string => bool)) private _hasMintedOnDate;
    
    // Mapping from tokenId to wish data
    mapping(uint256 => WishData) private _wishes;

    event WishMinted(
        address indexed to,
        uint256 indexed tokenId,
        string wishText,
        string dateKey,
        uint256 timestamp
    );

    constructor() ERC721("Daily Wish NFT", "WISH") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }

    /**
     * @dev Mint a new wish NFT
     * @param to Address to mint the NFT to
     * @param wishText The wish message
     * @param dateKey Date key in format YYYY-MM-DD
     */
    function mintWish(
        address to,
        string memory wishText,
        string memory dateKey
    ) external returns (uint256) {
        require(bytes(wishText).length > 0, "Wish text cannot be empty");
        require(bytes(wishText).length <= 300, "Wish text too long");
        require(!_hasMintedOnDate[to][dateKey], "Already minted today");

        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(to, tokenId);

        WishData memory newWish = WishData({
            tokenId: tokenId,
            wishText: wishText,
            dateKey: dateKey,
            timestamp: block.timestamp,
            minter: to
        });

        _wishes[tokenId] = newWish;
        _wishesByAddress[to].push(newWish);
        _hasMintedOnDate[to][dateKey] = true;

        // Generate and set token URI
        string memory uri = _generateTokenURI(tokenId, wishText, dateKey);
        _setTokenURI(tokenId, uri);

        emit WishMinted(to, tokenId, wishText, dateKey, block.timestamp);

        return tokenId;
    }

    /**
     * @dev Check if user has minted today
     */
    function hasMintedToday(address user, string memory dateKey)
        external
        view
        returns (bool)
    {
        return _hasMintedOnDate[user][dateKey];
    }

    /**
     * @dev Get all wishes by address
     */
    function getWishesByAddress(address owner)
        external
        view
        returns (WishData[] memory)
    {
        return _wishesByAddress[owner];
    }

    /**
     * @dev Generate onchain SVG and metadata for the wish NFT
     */
    function _generateTokenURI(
        uint256 tokenId,
        string memory wishText,
        string memory dateKey
    ) private pure returns (string memory) {
        // Create SVG
        string memory svg = string(
            abi.encodePacked(
                '<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">',
                '<defs>',
                '<linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">',
                '<stop offset="0%" style="stop-color:rgb(251,207,232);stop-opacity:1" />',
                '<stop offset="100%" style="stop-color:rgb(254,215,170);stop-opacity:1" />',
                '</linearGradient>',
                '</defs>',
                '<rect width="400" height="400" fill="url(#grad)"/>',
                '<text x="20" y="40" font-family="Arial" font-size="16" fill="#666">',
                dateKey,
                '</text>',
                '<foreignObject x="20" y="70" width="360" height="260">',
                '<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial;font-size:18px;color:#333;word-wrap:break-word;">',
                wishText,
                '</div>',
                '</foreignObject>',
                '<text x="20" y="380" font-family="Arial" font-size="12" fill="#999">Wish #',
                tokenId.toString(),
                '</text>',
                '</svg>'
            )
        );

        // Create metadata JSON
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Daily Wish #',
                        tokenId.toString(),
                        '", "description": "A daily wish minted on Arc Testnet", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(svg)),
                        '", "attributes": [{"trait_type": "Date", "value": "',
                        dateKey,
                        '"}]}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }
}
