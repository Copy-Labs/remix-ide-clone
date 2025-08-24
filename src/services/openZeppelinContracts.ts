/**
 * OpenZeppelin Contracts Service
 * Provides pre-loaded OpenZeppelin contract sources for browser-based compilation
 */

// ERC20 Base Contract
const ERC20_CONTRACT = `// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (token/ERC20/ERC20.sol)

pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

/**
 * @dev Implementation of the {IERC20} interface.
 */
abstract contract ERC20 is Context, IERC20, IERC20Metadata, IERC6093 {
    mapping(address account => uint256) private _balances;

    mapping(address account => mapping(address spender => uint256)) private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual returns (string memory) {
        return _name;
    }

    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual returns (uint8) {
        return 18;
    }

    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, value);
        return true;
    }

    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public virtual returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _transfer(from, to, value);
        return true;
    }

    function _mint(address account, uint256 value) internal {
        if (account == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(address(0), account, value);
    }

    function _burn(address account, uint256 value) internal {
        if (account == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        _update(account, address(0), value);
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        if (to == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        _update(from, to, value);
    }

    function _update(address from, address to, uint256 value) internal virtual {
        if (from == address(0)) {
            _totalSupply += value;
        } else {
            uint256 fromBalance = _balances[from];
            if (fromBalance < value) {
                revert ERC20InsufficientBalance(from, fromBalance, value);
            }
            unchecked {
                _balances[from] = fromBalance - value;
            }
        }

        if (to == address(0)) {
            unchecked {
                _totalSupply -= value;
            }
        } else {
            unchecked {
                _balances[to] += value;
            }
        }

        emit Transfer(from, to, value);
    }

    function _approve(address owner, address spender, uint256 value) internal {
        _approve(owner, spender, value, true);
    }

    function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual {
        if (owner == address(0)) {
            revert ERC20InvalidApprover(address(0));
        }
        if (spender == address(0)) {
            revert ERC20InvalidSpender(address(0));
        }
        _allowances[owner][spender] = value;
        if (emitEvent) {
            emit Approval(owner, spender, value);
        }
    }

    function _spendAllowance(address owner, address spender, uint256 value) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            if (currentAllowance < value) {
                revert ERC20InsufficientAllowance(spender, currentAllowance, value);
            }
            unchecked {
                _approve(owner, spender, currentAllowance - value, false);
            }
        }
    }
}`;

// IERC20 Interface
const IERC20_INTERFACE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}`;

// IERC20Metadata Interface
const IERC20_METADATA_INTERFACE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}`;

// Context Contract
const CONTEXT_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}`;

// IERC6093 Interface
const IERC6093_INTERFACE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC6093 {
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    error ERC20InvalidSender(address sender);
    error ERC20InvalidReceiver(address receiver);
    error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);
    error ERC20InvalidApprover(address approver);
    error ERC20InvalidSpender(address spender);
}`;

// Ownable Contract
const OWNABLE_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Context.sol";

abstract contract Ownable is Context {
    address private _owner;

    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}`;

// ReentrancyGuard Contract
const REENTRANCY_GUARD_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract ReentrancyGuard {
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        _status = NOT_ENTERED;
    }

    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}`;

// Pausable Contract
const PAUSABLE_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Context.sol";

abstract contract Pausable is Context {
    bool private _paused;

    error EnforcedPause();
    error ExpectedPause();

    event Paused(address account);
    event Unpaused(address account);

    constructor() {
        _paused = false;
    }

    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    modifier whenPaused() {
        _requirePaused();
        _;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}`;

// OpenZeppelin contract sources mapping
export const OPENZEPPELIN_CONTRACTS: Record<string, string> = {
  '@openzeppelin/contracts/token/ERC20/ERC20.sol': ERC20_CONTRACT,
  '@openzeppelin/contracts/token/ERC20/IERC20.sol': IERC20_INTERFACE,
  '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol': IERC20_METADATA_INTERFACE,
  '@openzeppelin/contracts/utils/Context.sol': CONTEXT_CONTRACT,
  '@openzeppelin/contracts/interfaces/draft-IERC6093.sol': IERC6093_INTERFACE,
  '@openzeppelin/contracts/access/Ownable.sol': OWNABLE_CONTRACT,
  '@openzeppelin/contracts/utils/ReentrancyGuard.sol': REENTRANCY_GUARD_CONTRACT,
  '@openzeppelin/contracts/utils/Pausable.sol': PAUSABLE_CONTRACT,
};

/**
 * Get OpenZeppelin contract source by import path
 * @param importPath The import path from the Solidity file
 * @returns The contract source code or null if not found
 */
export function getOpenZeppelinContract(importPath: string): string | null {
  return OPENZEPPELIN_CONTRACTS[importPath] || null;
}

/**
 * Get all OpenZeppelin contracts needed for a given source code
 * @param sourceCode The Solidity source code to analyze
 * @returns Record of contract paths and their sources
 */
export function getRequiredOpenZeppelinContracts(sourceCode: string): Record<string, string> {
  const requiredContracts: Record<string, string> = {};

  // Find all OpenZeppelin imports in the source code
  const importRegex = /import\s+["'](@openzeppelin\/contracts\/[^"']+)["'];/g;
  let match;

  while ((match = importRegex.exec(sourceCode)) !== null) {
    const importPath = match[1];
    const contractSource = getOpenZeppelinContract(importPath);

    if (contractSource) {
      requiredContracts[importPath] = contractSource;

      // Special-case: if ERC20 base contract is requested, also include its typical dependencies
      if (importPath === '@openzeppelin/contracts/token/ERC20/ERC20.sol') {
        const depPaths = [
          '@openzeppelin/contracts/token/ERC20/IERC20.sol',
          '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol',
          '@openzeppelin/contracts/utils/Context.sol',
          '@openzeppelin/contracts/interfaces/draft-IERC6093.sol',
        ];
        for (const dep of depPaths) {
          const depSrc = getOpenZeppelinContract(dep);
          if (depSrc) {
            requiredContracts[dep] = depSrc;
          }
        }
      }

      // Recursively get dependencies of this contract
      const dependencies = getRequiredOpenZeppelinContracts(contractSource);
      Object.assign(requiredContracts, dependencies);
    }
  }

  return requiredContracts;
}
