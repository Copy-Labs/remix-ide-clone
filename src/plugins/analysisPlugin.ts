import type { Plugin, PluginConfig } from '@/types';

/**
 * Code analysis and linting plugin for Remix IDE Clone
 * Provides functionality for analyzing Solidity code for potential issues
 * and enforcing coding standards.
 */
export const analysisPlugin: Omit<Plugin, 'api'> = {
  id: 'code-analysis',
  name: 'Code Analysis & Linting',
  version: '1.0.0',
  description: 'Analyze your Solidity code for potential issues and enforce coding standards',
  author: 'Remix IDE Clone Team',
  enabled: false,
  config: {
    autoAnalyze: true,
    securityRules: true,
    gasOptimizationRules: true,
    styleRules: true,
    bestPracticeRules: true,
    customRules: [],
    severityLevels: {
      error: true,
      warning: true,
      info: true,
    },
  },
};

/**
 * Analysis result severity
 */
export enum AnalysisSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Analysis result interface
 */
interface AnalysisResult {
  id: string;
  name: string;
  description: string;
  severity: AnalysisSeverity;
  line: number;
  column: number;
  file: string;
  ruleId: string;
  category: 'security' | 'gas' | 'style' | 'best-practice' | 'custom';
  impact?: string;
  recommendation?: string;
}

/**
 * Analysis summary interface
 */
interface AnalysisSummary {
  errors: number;
  warnings: number;
  infos: number;
  files: number;
  duration: number;
  timestamp: number;
  results: AnalysisResult[];
}

/**
 * Code analysis plugin functionality
 * This would be implemented with a real analysis tool in a production environment
 */
export class AnalysisPluginImplementation {
  private config: PluginConfig;
  private lastAnalysis: AnalysisSummary | null = null;
  private rules: Map<string, any> = new Map();

  constructor(config: PluginConfig) {
    this.config = config;
    this.initializeRules();
  }

  /**
   * Initialize analysis rules
   */
  private initializeRules(): void {
    // Security rules
    if (this.config.securityRules) {
      this.rules.set('SEC001', {
        id: 'SEC001',
        name: 'Reentrancy vulnerability',
        description: 'Function does not follow checks-effects-interactions pattern',
        category: 'security',
        severity: AnalysisSeverity.ERROR,
        impact: 'High - Could lead to theft of funds',
        recommendation: 'Follow checks-effects-interactions pattern or use ReentrancyGuard',
      });

      this.rules.set('SEC002', {
        id: 'SEC002',
        name: 'Unchecked external call',
        description: 'External call result is not checked',
        category: 'security',
        severity: AnalysisSeverity.ERROR,
        impact: 'Medium - Could lead to silent failures',
        recommendation: 'Check the return value of external calls',
      });

      this.rules.set('SEC003', {
        id: 'SEC003',
        name: 'Use of tx.origin',
        description: 'Using tx.origin for authorization',
        category: 'security',
        severity: AnalysisSeverity.ERROR,
        impact: 'High - Vulnerable to phishing attacks',
        recommendation: 'Use msg.sender instead of tx.origin for authorization',
      });
    }

    // Gas optimization rules
    if (this.config.gasOptimizationRules) {
      this.rules.set('GAS001', {
        id: 'GAS001',
        name: 'Expensive storage operation',
        description: 'Unnecessary storage operation in a loop',
        category: 'gas',
        severity: AnalysisSeverity.WARNING,
        impact: 'Medium - Increases gas costs',
        recommendation: 'Cache storage variables in memory before loop operations',
      });

      this.rules.set('GAS002', {
        id: 'GAS002',
        name: 'Inefficient variable packing',
        description: 'Variables could be packed more efficiently',
        category: 'gas',
        severity: AnalysisSeverity.INFO,
        impact: 'Low - Slightly increases gas costs',
        recommendation: 'Reorder variables to optimize storage packing',
      });
    }

    // Style rules
    if (this.config.styleRules) {
      this.rules.set('STY001', {
        id: 'STY001',
        name: 'Inconsistent naming convention',
        description: 'Variable or function name does not follow naming convention',
        category: 'style',
        severity: AnalysisSeverity.INFO,
        recommendation: 'Follow Solidity naming conventions',
      });

      this.rules.set('STY002', {
        id: 'STY002',
        name: 'Missing function visibility',
        description: 'Function visibility is not explicitly declared',
        category: 'style',
        severity: AnalysisSeverity.WARNING,
        recommendation: 'Always explicitly declare function visibility',
      });
    }

    // Best practice rules
    if (this.config.bestPracticeRules) {
      this.rules.set('BP001', {
        id: 'BP001',
        name: 'Missing event for state change',
        description: 'State-changing function does not emit an event',
        category: 'best-practice',
        severity: AnalysisSeverity.WARNING,
        recommendation: 'Emit events for all state changes',
      });

      this.rules.set('BP002', {
        id: 'BP002',
        name: 'Missing function documentation',
        description: 'Function is missing NatSpec documentation',
        category: 'best-practice',
        severity: AnalysisSeverity.INFO,
        recommendation: 'Add NatSpec documentation to all public functions',
      });
    }

    // Add custom rules
    if (this.config.customRules && Array.isArray(this.config.customRules)) {
      this.config.customRules.forEach((rule) => {
        if (rule.id && rule.name) {
          this.rules.set(rule.id, {
            ...rule,
            category: 'custom',
          });
        }
      });
    }
  }

  /**
   * Analyze a single file
   * @param filePath Path to the file
   * @param content File content
   */
  async analyzeFile(filePath: string, content: string): Promise<AnalysisResult[]> {
    console.log(`Analyzing file: ${filePath}`);

    // In a real implementation, this would use a Solidity analyzer to check the code
    // This is a mock implementation that generates random results
    const results: AnalysisResult[] = [];

    // Only analyze Solidity files
    if (!filePath.endsWith('.sol')) {
      return results;
    }

    const lines = content.split('\n');
    const fileResults: AnalysisResult[] = [];

    // Simulate finding issues in the code
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for security issues
      if (this.config.securityRules) {
        if (line.includes('transfer(') || line.includes('send(')) {
          const rule = this.rules.get('SEC001');
          if (rule && this.config.severityLevels.error) {
            fileResults.push({
              ...rule,
              line: i + 1,
              column:
                line.indexOf('transfer(') !== -1
                  ? line.indexOf('transfer(')
                  : line.indexOf('send('),
              file: filePath,
              ruleId: rule.id,
            });
          }
        }

        if (line.includes('tx.origin')) {
          const rule = this.rules.get('SEC003');
          if (rule && this.config.severityLevels.error) {
            fileResults.push({
              ...rule,
              line: i + 1,
              column: line.indexOf('tx.origin'),
              file: filePath,
              ruleId: rule.id,
            });
          }
        }
      }

      // Check for gas optimization issues
      if (this.config.gasOptimizationRules) {
        if (line.includes('for') && i < lines.length - 5) {
          // Check if there's a storage operation in the next few lines
          for (let j = i + 1; j < i + 5 && j < lines.length; j++) {
            if (lines[j].includes('storage')) {
              const rule = this.rules.get('GAS001');
              if (rule && this.config.severityLevels.warning) {
                fileResults.push({
                  ...rule,
                  line: j + 1,
                  column: lines[j].indexOf('storage'),
                  file: filePath,
                  ruleId: rule.id,
                });
                break;
              }
            }
          }
        }
      }

      // Check for style issues
      if (this.config.styleRules) {
        if (
          line.includes('function') &&
          !line.includes('public') &&
          !line.includes('private') &&
          !line.includes('internal') &&
          !line.includes('external')
        ) {
          const rule = this.rules.get('STY002');
          if (rule && this.config.severityLevels.warning) {
            fileResults.push({
              ...rule,
              line: i + 1,
              column: line.indexOf('function'),
              file: filePath,
              ruleId: rule.id,
            });
          }
        }
      }

      // Check for best practice issues
      if (this.config.bestPracticeRules) {
        if (
          line.includes('function') &&
          !lines[i - 1]?.includes('/**') &&
          !lines[i - 2]?.includes('/**')
        ) {
          const rule = this.rules.get('BP002');
          if (rule && this.config.severityLevels.info) {
            fileResults.push({
              ...rule,
              line: i + 1,
              column: line.indexOf('function'),
              file: filePath,
              ruleId: rule.id,
            });
          }
        }
      }
    }

    return fileResults;
  }

  /**
   * Analyze multiple files
   * @param files Map of file paths to file contents
   */
  async analyzeFiles(files: Map<string, string>): Promise<AnalysisSummary> {
    console.log(`Analyzing ${files.size} files`);

    const startTime = Date.now();
    const results: AnalysisResult[] = [];

    // Analyze each file
    for (const [path, content] of files.entries()) {
      const fileResults = await this.analyzeFile(path, content);
      results.push(...fileResults);
    }

    // Count results by severity
    const errors = results.filter((r) => r.severity === AnalysisSeverity.ERROR).length;
    const warnings = results.filter((r) => r.severity === AnalysisSeverity.WARNING).length;
    const infos = results.filter((r) => r.severity === AnalysisSeverity.INFO).length;

    const summary: AnalysisSummary = {
      errors,
      warnings,
      infos,
      files: files.size,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
      results,
    };

    this.lastAnalysis = summary;
    return summary;
  }

  /**
   * Get the last analysis results
   */
  getLastAnalysis(): AnalysisSummary | null {
    return this.lastAnalysis;
  }

  /**
   * Update analysis configuration
   * @param newConfig New configuration
   */
  updateConfig(newConfig: Partial<PluginConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Updated analysis configuration:', this.config);

    // Reinitialize rules with new configuration
    this.initializeRules();
  }

  /**
   * Add a custom rule
   * @param rule Custom rule definition
   */
  addCustomRule(rule: any): boolean {
    if (!rule.id || !rule.name) {
      console.error('Custom rule must have id and name');
      return false;
    }

    // Add to custom rules in config
    if (!this.config.customRules) {
      this.config.customRules = [];
    }

    this.config.customRules.push(rule);

    // Add to rules map
    this.rules.set(rule.id, {
      ...rule,
      category: 'custom',
    });

    console.log(`Added custom rule: ${rule.name} (${rule.id})`);
    return true;
  }

  /**
   * Remove a custom rule
   * @param ruleId Rule ID to remove
   */
  removeCustomRule(ruleId: string): boolean {
    // Remove from custom rules in config
    if (this.config.customRules) {
      const index = this.config.customRules.findIndex((r) => r.id === ruleId);
      if (index !== -1) {
        this.config.customRules.splice(index, 1);
      }
    }

    // Remove from rules map
    const removed = this.rules.delete(ruleId);

    if (removed) {
      console.log(`Removed custom rule: ${ruleId}`);
    } else {
      console.error(`Rule not found: ${ruleId}`);
    }

    return removed;
  }
}
