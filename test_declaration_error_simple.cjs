const { solidityCompiler } = require('@agnostico/browser-solidity-compiler');

async function testDeclarationError() {
  console.log('Testing DeclarationError: Identifier not found or not unique...');

  // This is the basic ERC20 template that should cause the DeclarationError
  const contractBody = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

pragma solidity ^0.8.20;

/**
 * @dev Implementation of the {IERC20} interface.
 */
abstract contract ERC20 is Context, IERC20, IERC20Metadata, IERC6093 {
    mapping(address account => uint256) private _balances;

    mapping(address account => mapping(address spender => uint256)) private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    error ERC20InvalidSender(address sender);
    error ERC20InvalidReceiver(address receiver);
    error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);
    error ERC20InvalidApprover(address approver);
    error ERC20InvalidSpender(address spender);

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
}

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

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
}

interface IERC6093 {
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    error ERC20InvalidSender(address sender);
    error ERC20InvalidReceiver(address receiver);
    error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);
    error ERC20InvalidApprover(address approver);
    error ERC20InvalidSpender(address spender);
}

contract TokenTest1 is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        uint8 decimals
    ) ERC20(name, symbol) {
        _mint(msg.sender, totalSupply * 10**decimals);
    }
}`;

  console.log('\n--- Attempting compilation ---');

  try {
    const result = await solidityCompiler({
      version: 'https://binaries.soliditylang.org/bin/soljson-v0.8.19+commit.7dd6d404.js',
      contractBody,
      options: {}
    });

    console.log('Compilation completed!');

    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ COMPILATION ERRORS:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.type || 'Error'}: ${error.message || error.formattedMessage}`);

        // Check if this is the line 169 error
        if (error.formattedMessage && error.formattedMessage.includes('169')) {
          console.log('🎯 THIS IS THE LINE 169 ERROR');
        }

        // Look for DeclarationError specifically
        if (error.type === 'DeclarationError' || (error.message && error.message.includes('Identifier not found'))) {
          console.log('🔍 DECLARATION ERROR FOUND:');
          console.log(`   Type: ${error.type}`);
          console.log(`   Message: ${error.message || error.formattedMessage}`);

          // Try to extract the problematic identifier
          const identifierMatch = error.message?.match(/Identifier "(\w+)" not found/) ||
                                  error.formattedMessage?.match(/Identifier "(\w+)" not found/);
          if (identifierMatch) {
            console.log(`   Problematic identifier: ${identifierMatch[1]}`);
          }
        }
      });

      // Analyze the contract for potential issues
      console.log('\n📋 CONTRACT ANALYSIS:');
      const lines = contractBody.split('\n');
      console.log(`Total lines: ${lines.length}`);

      // Check line 169 if it exists
      if (lines.length >= 169) {
        console.log(`\n📍 LINE 169: ${lines[168].trim()}`);
        console.log('Context around line 169:');
        for (let i = 165; i < 173 && i < lines.length; i++) {
          const marker = i === 168 ? '>>> ' : '    ';
          console.log(`${marker}${i + 1}: ${lines[i]}`);
        }
      }

    } else {
      console.log('\n✅ COMPILATION SUCCESSFUL - NO ERRORS!');
      if (result.contracts && result.contracts.Compiled_Contracts) {
        console.log('Compiled contracts:', Object.keys(result.contracts.Compiled_Contracts));
      }
    }

  } catch (error) {
    console.error('\n❌ COMPILATION ERROR:', error.message);
  }
}

testDeclarationError();
