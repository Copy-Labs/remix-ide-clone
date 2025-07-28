import { debug, info } from '@/services/loggerService';

/**
 * Enum for browser Git limitations
 */
export enum BrowserGitLimitationType {
  SYMBOLIC_LINKS = 'symbolic_links',
  LARGE_REPOSITORIES = 'large_repositories',
  PERFORMANCE = 'performance',
  AUTHENTICATION = 'authentication',
  NETWORK_RESTRICTIONS = 'network_restrictions',
  STORAGE_CONSTRAINTS = 'storage_constraints',
  OFFLINE_SUPPORT = 'offline_support',
  LFS_SUPPORT = 'lfs_support',
}

/**
 * Interface for browser Git limitation
 */
export interface BrowserGitLimitation {
  type: BrowserGitLimitationType;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  workaround?: string;
  documentationUrl?: string;
}

/**
 * Browser Git limitations service
 * Provides information about Git limitations in browser environments
 */
export class BrowserGitLimitationsService {
  private limitations: Map<BrowserGitLimitationType, BrowserGitLimitation> = new Map();
  private isDesktopEnvironment: boolean;

  constructor() {
    this.isDesktopEnvironment = this.detectDesktopEnvironment();
    this.initializeLimitations();
    info(
      `Browser Git limitations service initialized. Desktop environment: ${this.isDesktopEnvironment}`,
    );
  }

  /**
   * Detect if running in desktop environment
   */
  private detectDesktopEnvironment(): boolean {
    // Check if running in Electron or similar desktop environment
    return !!(window.process && window.process.type);
  }

  /**
   * Initialize limitations
   */
  private initializeLimitations(): void {
    this.limitations.set(BrowserGitLimitationType.SYMBOLIC_LINKS, {
      type: BrowserGitLimitationType.SYMBOLIC_LINKS,
      title: 'Symbolic Links Not Supported',
      description:
        'Browser security restrictions prevent the creation and use of symbolic links, which are commonly used in Git repositories.',
      impact: 'medium',
      workaround: 'Use relative paths or restructure your project to avoid symbolic links.',
      documentationUrl: 'https://isomorphic-git.org/docs/en/limitations',
    });

    this.limitations.set(BrowserGitLimitationType.LARGE_REPOSITORIES, {
      type: BrowserGitLimitationType.LARGE_REPOSITORIES,
      title: 'Large Repository Limitations',
      description:
        'Browser storage limits make it difficult to work with large repositories. Operations may be slow or fail completely.',
      impact: 'high',
      workaround:
        'Use smaller repositories or consider using the desktop application for large repositories.',
      documentationUrl: 'https://isomorphic-git.org/docs/en/limitations',
    });

    this.limitations.set(BrowserGitLimitationType.PERFORMANCE, {
      type: BrowserGitLimitationType.PERFORMANCE,
      title: 'Performance Limitations',
      description:
        'Git operations in the browser are generally slower than native Git commands due to JavaScript execution and browser constraints.',
      impact: 'medium',
      workaround:
        'Be patient with operations or use the desktop application for better performance.',
      documentationUrl: 'https://isomorphic-git.org/docs/en/performance',
    });

    this.limitations.set(BrowserGitLimitationType.AUTHENTICATION, {
      type: BrowserGitLimitationType.AUTHENTICATION,
      title: 'Authentication Limitations',
      description:
        'Browser security models limit the authentication options available for Git operations.',
      impact: 'medium',
      workaround: 'Use OAuth or personal access tokens for authentication.',
      documentationUrl: 'https://isomorphic-git.org/docs/en/authentication',
    });

    this.limitations.set(BrowserGitLimitationType.NETWORK_RESTRICTIONS, {
      type: BrowserGitLimitationType.NETWORK_RESTRICTIONS,
      title: 'Network Restrictions',
      description:
        'CORS policies and other browser security measures may restrict communication with Git servers.',
      impact: 'high',
      workaround: 'Use CORS-enabled Git servers or proxy requests through a compatible server.',
      documentationUrl: 'https://isomorphic-git.org/docs/en/cors',
    });

    this.limitations.set(BrowserGitLimitationType.STORAGE_CONSTRAINTS, {
      type: BrowserGitLimitationType.STORAGE_CONSTRAINTS,
      title: 'Storage Constraints',
      description:
        'Browsers have limited storage capacity compared to desktop environments, making it challenging to handle large repositories.',
      impact: 'high',
      workaround:
        'Use smaller repositories or consider using the desktop application for large repositories.',
      documentationUrl: 'https://isomorphic-git.org/docs/en/limitations',
    });

    this.limitations.set(BrowserGitLimitationType.OFFLINE_SUPPORT, {
      type: BrowserGitLimitationType.OFFLINE_SUPPORT,
      title: 'Limited Offline Support',
      description:
        'Some Git operations require network connectivity and may not work properly offline.',
      impact: 'medium',
      workaround: 'Ensure you have network connectivity for critical Git operations.',
      documentationUrl: 'https://isomorphic-git.org/docs/en/limitations',
    });

    this.limitations.set(BrowserGitLimitationType.LFS_SUPPORT, {
      type: BrowserGitLimitationType.LFS_SUPPORT,
      title: 'Limited LFS Support',
      description: 'Git LFS (Large File Storage) has limited support in browser environments.',
      impact: 'high',
      workaround:
        'Avoid using large binary files or use the desktop application for repositories with LFS.',
      documentationUrl: 'https://isomorphic-git.org/docs/en/limitations',
    });
  }

  /**
   * Get all limitations
   */
  public getAllLimitations(): BrowserGitLimitation[] {
    return Array.from(this.limitations.values());
  }

  /**
   * Get limitation by type
   */
  public getLimitation(type: BrowserGitLimitationType): BrowserGitLimitation | undefined {
    return this.limitations.get(type);
  }

  /**
   * Check if a specific limitation applies
   */
  public hasLimitation(type: BrowserGitLimitationType): boolean {
    if (this.isDesktopEnvironment) {
      // Desktop environment doesn't have browser limitations
      return false;
    }
    return this.limitations.has(type);
  }

  /**
   * Check if running in browser environment
   */
  public isBrowserEnvironment(): boolean {
    return !this.isDesktopEnvironment;
  }

  /**
   * Get contextual help message for a specific Git operation
   */
  public getContextualHelpMessage(operation: string): string | null {
    if (this.isDesktopEnvironment) {
      return null;
    }

    // Map operations to relevant limitations
    const operationLimitations: Record<string, BrowserGitLimitationType[]> = {
      clone: [
        BrowserGitLimitationType.LARGE_REPOSITORIES,
        BrowserGitLimitationType.PERFORMANCE,
        BrowserGitLimitationType.NETWORK_RESTRICTIONS,
      ],
      push: [
        BrowserGitLimitationType.AUTHENTICATION,
        BrowserGitLimitationType.NETWORK_RESTRICTIONS,
        BrowserGitLimitationType.OFFLINE_SUPPORT,
      ],
      pull: [
        BrowserGitLimitationType.LARGE_REPOSITORIES,
        BrowserGitLimitationType.NETWORK_RESTRICTIONS,
        BrowserGitLimitationType.OFFLINE_SUPPORT,
      ],
      lfs: [BrowserGitLimitationType.LFS_SUPPORT, BrowserGitLimitationType.STORAGE_CONSTRAINTS],
      symlink: [BrowserGitLimitationType.SYMBOLIC_LINKS],
    };

    const limitations = operationLimitations[operation];
    if (!limitations || limitations.length === 0) {
      return null;
    }

    // Get the highest impact limitation
    const highestImpactLimitation = limitations
      .map((type) => this.getLimitation(type))
      .filter(Boolean)
      .sort((a, b) => {
        const impactOrder = { high: 3, medium: 2, low: 1 };
        return impactOrder[b!.impact] - impactOrder[a!.impact];
      })[0];

    if (!highestImpactLimitation) {
      return null;
    }

    return `${highestImpactLimitation.title}: ${highestImpactLimitation.description} ${highestImpactLimitation.workaround ? `Workaround: ${highestImpactLimitation.workaround}` : ''}`;
  }

  /**
   * Check if a specific Git operation is supported in the current environment
   */
  public isOperationSupported(operation: string): boolean {
    if (this.isDesktopEnvironment) {
      return true;
    }

    // List of operations with limited or no support in browser
    const limitedSupportOperations = ['symlink', 'submodule'];
    return !limitedSupportOperations.includes(operation);
  }
}

// Export singleton instance
export const browserGitLimitationsService = new BrowserGitLimitationsService();
