import type { Plugin, PluginConfig } from '@/types';

// Token template types
interface TokenTemplate {
  id: string;
  name: string;
  description: string;
  standard: 'ERC-20' | 'ERC-721' | 'ERC-1155' | 'Custom';
  features: string[];
  template: string;
  constructor: {
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
  }[];
}

interface TokenConfig {
  templateId: string;
  name: string;
  symbol: string;
  decimals?: number;
  totalSupply?: string;
  maxSupply?: string;
  mintable?: boolean;
  burnable?: boolean;
  pausable?: boolean;
  ownable?: boolean;
  permit?: boolean;
  snapshot?: boolean;
  votes?: boolean;
  flashMinting?: boolean;
  customFeatures?: string[];
}

interface GeneratedToken {
  id: string;
  name: string;
  filename: string;
  sourceCode: string;
  abi: any[];
  config: TokenConfig;
  createdAt: Date;
}

class TokenCreatorPluginImplementation implements Plugin {
  id = 'Token Creator';
  name = 'Token Creator';
  version = '1.0.0';
  description = 'Create customized tokens with various standards and features';
  author = 'Remix IDE Clone';
  enabled = true;
  config: PluginConfig;
  api: any = null; // Will be set when plugin is registered

  private _config: PluginConfig;
  private templates: TokenTemplate[] = [];
  private generatedTokens: GeneratedToken[] = [];

  constructor(config: PluginConfig = {}) {
    this.config = config;
    this._config = config;
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // ERC-20 Basic Template
    this.templates.push({
      id: 'erc20-basic',
      name: 'ERC-20 Basic Token',
      description: 'Standard ERC-20 token with basic functionality',
      standard: 'ERC-20',
      features: ['Transfer', 'Approval', 'Balance Query'],
      constructor: [
        { name: 'name', type: 'string', description: 'Token name', required: true },
        { name: 'symbol', type: 'string', description: 'Token symbol', required: true },
        { name: 'totalSupply', type: 'uint256', description: 'Total token supply', required: true },
        { name: 'decimals', type: 'uint8', description: 'Token decimals', required: false, default: 18 },
      ],
      template: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract {{TOKEN_NAME}} is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint8 decimals
    ) ERC20(name, symbol) {
        _mint(msg.sender, totalSupply * 10**decimals);
    }
}`,
    });

    // ERC-20 Advanced Template
    this.templates.push({
      id: 'erc20-advanced',
      name: 'ERC-20 Advanced Token',
      description: 'ERC-20 token with advanced features like minting, burning, and access control',
      standard: 'ERC-20',
      features: ['Mintable', 'Burnable', 'Pausable', 'Access Control', 'Permit'],
      constructor: [
        { name: 'name', type: 'string', description: 'Token name', required: true },
        { name: 'symbol', type: 'string', description: 'Token symbol', required: true },
        { name: 'initialSupply', type: 'uint256', description: 'Initial token supply', required: true },
        { name: 'decimals', type: 'uint8', description: 'Token decimals', required: false, default: 18 },
      ],
      template: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract {{TOKEN_NAME}} is ERC20, ERC20Burnable, ERC20Pausable, ERC20Permit, Ownable {
    uint8 private _decimals;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint8 decimals_
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(msg.sender) {
        _decimals = decimals_;
        _mint(msg.sender, initialSupply * 10**decimals_);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // Required override for multiple inheritance
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}`,
    });

    // ERC-721 Basic Template
    this.templates.push({
      id: 'erc721-basic',
      name: 'ERC-721 Basic NFT',
      description: 'Standard ERC-721 NFT with basic functionality',
      standard: 'ERC-721',
      features: ['Transfer', 'Approval', 'Metadata'],
      constructor: [
        { name: 'name', type: 'string', description: 'NFT collection name', required: true },
        { name: 'symbol', type: 'string', description: 'NFT collection symbol', required: true },
        { name: 'baseURI', type: 'string', description: 'Base URI for metadata', required: false, default: '' },
      ],
      template: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract {{TOKEN_NAME}} is ERC721, Ownable {
    uint256 private _nextTokenId = 1;
    string private _baseTokenURI;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseURI;
    }

    function mint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        return tokenId;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
}`,
    });

    // ERC-721 Advanced Template
    this.templates.push({
      id: 'erc721-advanced',
      name: 'ERC-721 Advanced NFT',
      description: 'ERC-721 NFT with advanced features like enumerable, burnable, and royalties',
      standard: 'ERC-721',
      features: ['Enumerable', 'Burnable', 'Royalties', 'Access Control', 'Max Supply'],
      constructor: [
        { name: 'name', type: 'string', description: 'NFT collection name', required: true },
        { name: 'symbol', type: 'string', description: 'NFT collection symbol', required: true },
        { name: 'baseURI', type: 'string', description: 'Base URI for metadata', required: false, default: '' },
        { name: 'maxSupply', type: 'uint256', description: 'Maximum supply of NFTs', required: true },
      ],
      template: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract {{TOKEN_NAME}} is ERC721, ERC721Enumerable, ERC721Burnable, Ownable, IERC2981 {
    uint256 private _nextTokenId = 1;
    uint256 public maxSupply;
    string private _baseTokenURI;
    
    // Royalty info
    address private _royaltyRecipient;
    uint96 private _royaltyFraction;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        uint256 _maxSupply
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseURI;
        maxSupply = _maxSupply;
        _royaltyRecipient = msg.sender;
        _royaltyFraction = 500; // 5% royalty
    }

    function mint(address to) public onlyOwner returns (uint256) {
        require(_nextTokenId <= maxSupply, "Max supply reached");
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        return tokenId;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }

    function setRoyaltyInfo(address recipient, uint96 fraction) public onlyOwner {
        _royaltyRecipient = recipient;
        _royaltyFraction = fraction;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    // Royalty implementation
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        override
        returns (address, uint256)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        uint256 royaltyAmount = (salePrice * _royaltyFraction) / 10000;
        return (_royaltyRecipient, royaltyAmount);
    }

    // Required overrides for multiple inheritance
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }
}`,
    });

    // ERC-1155 Template
    this.templates.push({
      id: 'erc1155-basic',
      name: 'ERC-1155 Multi-Token',
      description: 'ERC-1155 multi-token standard for fungible and non-fungible tokens',
      standard: 'ERC-1155',
      features: ['Multi-Token', 'Batch Operations', 'Metadata'],
      constructor: [
        { name: 'uri', type: 'string', description: 'URI for token metadata', required: true },
      ],
      template: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract {{TOKEN_NAME}} is ERC1155, Ownable {
    constructor(string memory uri) ERC1155(uri) Ownable(msg.sender) {}

    function mint(address to, uint256 id, uint256 amount, bytes memory data)
        public
        onlyOwner
    {
        _mint(to, id, amount, data);
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        public
        onlyOwner
    {
        _mintBatch(to, ids, amounts, data);
    }

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }
}`,
    });
  }

  // Plugin interface methods
  getTemplates(): TokenTemplate[] {
    return [...this.templates];
  }

  getTemplate(templateId: string): TokenTemplate | null {
    return this.templates.find((t) => t.id === templateId) || null;
  }

  generateToken(config: TokenConfig): GeneratedToken {
    const template = this.getTemplate(config.templateId);
    if (!template) {
      throw new Error(`Template ${config.templateId} not found`);
    }

    // Generate contract name from token name
    const contractName = config.name.replace(/[^a-zA-Z0-9]/g, '');

    // Replace template placeholders
    const sourceCode = template.template.replace(/{{TOKEN_NAME}}/g, contractName);

    // Generate filename
    const filename = `${contractName}.sol`;

    // Create generated token object
    const generatedToken: GeneratedToken = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      filename,
      sourceCode,
      abi: [], // Will be populated after compilation
      config,
      createdAt: new Date(),
    };

    // Store generated token
    this.generatedTokens.push(generatedToken);

    return generatedToken;
  }

  getGeneratedTokens(): GeneratedToken[] {
    return [...this.generatedTokens];
  }

  deleteGeneratedToken(tokenId: string): boolean {
    const index = this.generatedTokens.findIndex((t) => t.id === tokenId);
    if (index > -1) {
      this.generatedTokens.splice(index, 1);
      return true;
    }
    return false;
  }

  exportToken(tokenId: string): string | null {
    const token = this.generatedTokens.find((t) => t.id === tokenId);
    return token ? token.sourceCode : null;
  }

  updateConfig(newConfig: PluginConfig): void {
    this._config = { ...this._config, ...newConfig };
    this.config = { ...this.config, ...newConfig };
  }
}

// Export the plugin instance
export const tokenCreatorPlugin: Plugin = new TokenCreatorPluginImplementation();

// Export the implementation class
export { TokenCreatorPluginImplementation };
