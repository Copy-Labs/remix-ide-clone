import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompilerService } from '../compilerService';

describe('CompilerService', () => {
  let compilerService: CompilerService;

  beforeEach(() => {
    compilerService = CompilerService.getInstance();
  });

  describe('compile', () => {
    it('should handle empty sources without throwing JSONError', async () => {
      const emptySources = {};

      const result = await compilerService.compile(emptySources);

      // Should not throw JSONError and should return a proper error result
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle null/undefined sources without throwing JSONError', async () => {
      const nullSources = null as any;

      const result = await compilerService.compile(nullSources);

      // Should not throw JSONError and should return a proper error result
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle sources with empty content without throwing JSONError', async () => {
      const sourcesWithEmptyContent = {
        'contract.sol': '',
      };

      const result = await compilerService.compile(sourcesWithEmptyContent);

      // Should not throw JSONError and should return a proper error result
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);

      // Check if the error is the "Invalid contract content" error
      const hasInvalidContentError = result.errors.some((error) =>
        error.message.includes('Invalid contract content for file'),
      );
      console.log(
        'Empty content test - errors:',
        result.errors.map((e) => e.message),
      );
      console.log('Has invalid content error:', hasInvalidContentError);
    });

    it('should handle sources with invalid content without throwing JSONError', async () => {
      const sourcesWithInvalidContent = {
        'contract.sol': 'invalid solidity code that cannot be compiled',
      };

      const result = await compilerService.compile(sourcesWithInvalidContent);

      // Should not throw JSONError and should return a proper error result
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should successfully compile valid Solidity code', async () => {
      const validSources = {
        'SimpleContract.sol': `
          // SPDX-License-Identifier: MIT
          pragma solidity ^0.8.0;

          contract SimpleContract {
              uint256 public value;

              constructor(uint256 _value) {
                  value = _value;
              }

              function setValue(uint256 _value) public {
                  value = _value;
              }
          }
        `,
      };

      const result = await compilerService.compile(validSources);

      // Should compile successfully
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.contracts).toBeDefined();
      expect(Object.keys(result.contracts).length).toBeGreaterThan(0);
    });

    it('should properly handle content passing and not return "Invalid contract content" for valid strings', async () => {
      const counterContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Counter {
    uint256 public count = 0;

    function increment() public {
        count += 1;
    }

    function getCount() public view returns (uint256) {
        return count;
    }
}`;

      const sources = {
        '/contracts/Counter.sol': counterContract,
      };

      const result = await compilerService.compile(sources);

      // Should not have "Invalid contract content" error
      const hasInvalidContentError = result.errors.some((error) =>
        error.message.includes('Invalid contract content for file'),
      );

      expect(hasInvalidContentError).toBe(false);
      expect(result).toBeDefined();

      // The result might fail due to Worker environment in Node.js, but it shouldn't be due to invalid content
      if (!result.success) {
        // If it fails, it should be due to Worker/environment issues, not content issues
        const hasWorkerError = result.errors.some(
          (error) =>
            error.message.includes('Worker is not defined') ||
            error.message.includes('Solidity compiler error'),
        );
        expect(hasWorkerError).toBe(true);
      }
    });
  });
});
