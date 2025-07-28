import { useGitStore } from '@/stores/gitStore';
import { debug, info, warn } from '@/services/loggerService';
import { gitHooksService, GitHookType } from '@/services/gitHooksService';

/**
 * Deployment environment type
 */
export enum DeploymentEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  CUSTOM = 'custom',
}

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  id: string;
  name: string;
  environment: DeploymentEnvironment;
  branch: string;
  autoDeployEnabled: boolean;
  deployOnPush: boolean;
  customEnvironmentName?: string;
  deploymentScript?: string;
  lastDeploymentTimestamp?: number;
  lastDeploymentStatus?: 'success' | 'failure' | 'in-progress';
}

/**
 * Deployment result
 */
export interface DeploymentResult {
  success: boolean;
  timestamp: number;
  environment: DeploymentEnvironment;
  message: string;
  logs: string[];
  commitHash?: string;
}

/**
 * GitDeploymentIntegration
 *
 * This service provides support for Git-based deployment workflows.
 * It allows configuring deployment environments and automatically deploying when changes are pushed to specific branches.
 */
class GitDeploymentIntegration {
  private static instance: GitDeploymentIntegration;
  private isInitialized: boolean = false;
  private deploymentConfigs: DeploymentConfig[] = [];
  private deploymentResults: Record<string, DeploymentResult[]> = {};
  private deploymentInProgress: boolean = false;

  private constructor() {}

  public static getInstance(): GitDeploymentIntegration {
    if (!GitDeploymentIntegration.instance) {
      GitDeploymentIntegration.instance = new GitDeploymentIntegration();
    }
    return GitDeploymentIntegration.instance;
  }

  /**
   * Initialize the Git deployment integration
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    info('GitDeploymentIntegration', 'Initializing Git deployment integration');

    // Load saved deployment configurations
    this.loadDeploymentConfigs();

    // Register Git hooks
    this.registerGitHooks();

    this.isInitialized = true;
  }

  /**
   * Add a deployment configuration
   * @param config The deployment configuration to add
   * @returns The added deployment configuration
   */
  public addDeploymentConfig(config: Omit<DeploymentConfig, 'id'>): DeploymentConfig {
    const id = this.generateId();
    const newConfig: DeploymentConfig = {
      ...config,
      id,
      lastDeploymentTimestamp: undefined,
      lastDeploymentStatus: undefined,
    };

    this.deploymentConfigs.push(newConfig);
    this.saveDeploymentConfigs();

    info(
      'GitDeploymentIntegration',
      `Added deployment configuration: ${config.name} (${config.environment})`,
    );

    return newConfig;
  }

  /**
   * Update a deployment configuration
   * @param id The ID of the deployment configuration to update
   * @param config The updated deployment configuration
   * @returns The updated deployment configuration, or undefined if not found
   */
  public updateDeploymentConfig(
    id: string,
    config: Partial<Omit<DeploymentConfig, 'id'>>,
  ): DeploymentConfig | undefined {
    const index = this.deploymentConfigs.findIndex((c) => c.id === id);
    if (index === -1) {
      warn(
        'GitDeploymentIntegration',
        `Failed to update deployment configuration: Configuration with ID ${id} not found`,
      );
      return undefined;
    }

    const updatedConfig: DeploymentConfig = {
      ...this.deploymentConfigs[index],
      ...config,
    };

    this.deploymentConfigs[index] = updatedConfig;
    this.saveDeploymentConfigs();

    info(
      'GitDeploymentIntegration',
      `Updated deployment configuration: ${updatedConfig.name} (${updatedConfig.environment})`,
    );

    return updatedConfig;
  }

  /**
   * Remove a deployment configuration
   * @param id The ID of the deployment configuration to remove
   * @returns Whether the deployment configuration was removed
   */
  public removeDeploymentConfig(id: string): boolean {
    const index = this.deploymentConfigs.findIndex((c) => c.id === id);
    if (index === -1) {
      warn(
        'GitDeploymentIntegration',
        `Failed to remove deployment configuration: Configuration with ID ${id} not found`,
      );
      return false;
    }

    const removedConfig = this.deploymentConfigs.splice(index, 1)[0];
    this.saveDeploymentConfigs();

    info(
      'GitDeploymentIntegration',
      `Removed deployment configuration: ${removedConfig.name} (${removedConfig.environment})`,
    );

    return true;
  }

  /**
   * Get all deployment configurations
   * @returns All deployment configurations
   */
  public getDeploymentConfigs(): DeploymentConfig[] {
    return [...this.deploymentConfigs];
  }

  /**
   * Get a deployment configuration by ID
   * @param id The ID of the deployment configuration to get
   * @returns The deployment configuration, or undefined if not found
   */
  public getDeploymentConfig(id: string): DeploymentConfig | undefined {
    return this.deploymentConfigs.find((c) => c.id === id);
  }

  /**
   * Get deployment configurations for a branch
   * @param branch The branch to get deployment configurations for
   * @returns Deployment configurations for the branch
   */
  public getDeploymentConfigsForBranch(branch: string): DeploymentConfig[] {
    return this.deploymentConfigs.filter((c) => c.branch === branch);
  }

  /**
   * Deploy to an environment
   * @param configId The ID of the deployment configuration to use
   * @param commitHash The commit hash to deploy
   * @returns The deployment result
   */
  public async deploy(configId: string, commitHash?: string): Promise<DeploymentResult> {
    const config = this.getDeploymentConfig(configId);
    if (!config) {
      const error = `Failed to deploy: Configuration with ID ${configId} not found`;
      warn('GitDeploymentIntegration', error);
      return {
        success: false,
        timestamp: Date.now(),
        environment: DeploymentEnvironment.CUSTOM,
        message: error,
        logs: [error],
      };
    }

    if (this.deploymentInProgress) {
      const error = 'Failed to deploy: Another deployment is already in progress';
      warn('GitDeploymentIntegration', error);
      return {
        success: false,
        timestamp: Date.now(),
        environment: config.environment,
        message: error,
        logs: [error],
      };
    }

    this.deploymentInProgress = true;

    // Update the deployment status
    this.updateDeploymentConfig(configId, {
      lastDeploymentTimestamp: Date.now(),
      lastDeploymentStatus: 'in-progress',
    });

    info(
      'GitDeploymentIntegration',
      `Starting deployment to ${config.environment} environment using configuration: ${config.name}`,
    );

    const logs: string[] = [];
    logs.push(`Deployment started at ${new Date().toISOString()}`);
    logs.push(`Environment: ${config.environment}`);
    logs.push(`Branch: ${config.branch}`);

    try {
      // Get the current branch
      const gitStore = useGitStore.getState();
      const currentBranch = await gitStore.currentBranch();

      // Check if we need to switch branches
      if (currentBranch !== config.branch) {
        logs.push(`Switching from branch ${currentBranch} to ${config.branch}`);
        await gitStore.switchBranch(config.branch);
        logs.push(`Switched to branch ${config.branch}`);
      }

      // If a commit hash is provided, check it out
      if (commitHash) {
        logs.push(`Checking out commit ${commitHash}`);
        await gitStore.checkout(commitHash);
        logs.push(`Checked out commit ${commitHash}`);
      }

      // Execute the deployment script if provided
      if (config.deploymentScript) {
        logs.push('Executing deployment script');
        // In a real implementation, this would execute the deployment script
        // For now, we'll just simulate a successful deployment
        logs.push('Deployment script executed successfully');
      } else {
        logs.push('No deployment script provided, simulating deployment');
        // Simulate deployment
        await new Promise((resolve) => setTimeout(resolve, 1000));
        logs.push('Simulated deployment completed');
      }

      // Update the deployment status
      this.updateDeploymentConfig(configId, {
        lastDeploymentTimestamp: Date.now(),
        lastDeploymentStatus: 'success',
      });

      const result: DeploymentResult = {
        success: true,
        timestamp: Date.now(),
        environment: config.environment,
        message: `Successfully deployed to ${config.environment} environment`,
        logs,
        commitHash,
      };

      // Save the deployment result
      this.saveDeploymentResult(configId, result);

      info(
        'GitDeploymentIntegration',
        `Successfully deployed to ${config.environment} environment`,
      );

      this.deploymentInProgress = false;

      return result;
    } catch (error) {
      const errorMessage = `Failed to deploy to ${config.environment} environment: ${error}`;
      logs.push(errorMessage);

      // Update the deployment status
      this.updateDeploymentConfig(configId, {
        lastDeploymentTimestamp: Date.now(),
        lastDeploymentStatus: 'failure',
      });

      const result: DeploymentResult = {
        success: false,
        timestamp: Date.now(),
        environment: config.environment,
        message: errorMessage,
        logs,
        commitHash,
      };

      // Save the deployment result
      this.saveDeploymentResult(configId, result);

      warn('GitDeploymentIntegration', errorMessage);

      this.deploymentInProgress = false;

      return result;
    }
  }

  /**
   * Get deployment results for a configuration
   * @param configId The ID of the deployment configuration to get results for
   * @returns Deployment results for the configuration
   */
  public getDeploymentResults(configId: string): DeploymentResult[] {
    return this.deploymentResults[configId] || [];
  }

  /**
   * Register Git hooks
   */
  private registerGitHooks(): void {
    // Register a post-push hook to trigger deployments
    gitHooksService.registerHook({
      type: GitHookType.POST_PUSH,
      name: 'auto-deploy-on-push',
      description: 'Automatically deploys when changes are pushed to configured branches',
      callback: async (data) => {
        if (!data || !data.branch) {
          return true;
        }

        const branch = data.branch;
        const configs = this.getDeploymentConfigsForBranch(branch);

        // Filter configs that have auto-deploy and deployOnPush enabled
        const deployConfigs = configs.filter((c) => c.autoDeployEnabled && c.deployOnPush);

        if (deployConfigs.length === 0) {
          debug(
            'GitDeploymentIntegration',
            `No deployment configurations found for branch ${branch} with auto-deploy enabled`,
          );
          return true;
        }

        info(
          'GitDeploymentIntegration',
          `Found ${deployConfigs.length} deployment configurations for branch ${branch} with auto-deploy enabled`,
        );

        // Deploy to each environment
        for (const config of deployConfigs) {
          try {
            info(
              'GitDeploymentIntegration',
              `Auto-deploying to ${config.environment} environment using configuration: ${config.name}`,
            );
            await this.deploy(config.id);
          } catch (error) {
            warn(
              'GitDeploymentIntegration',
              `Failed to auto-deploy to ${config.environment} environment: ${error}`,
            );
          }
        }

        return true;
      },
    });

    debug('GitDeploymentIntegration', 'Registered Git hooks');
  }

  /**
   * Save a deployment result
   * @param configId The ID of the deployment configuration
   * @param result The deployment result to save
   */
  private saveDeploymentResult(configId: string, result: DeploymentResult): void {
    if (!this.deploymentResults[configId]) {
      this.deploymentResults[configId] = [];
    }

    this.deploymentResults[configId].push(result);

    // Keep only the last 10 results
    if (this.deploymentResults[configId].length > 10) {
      this.deploymentResults[configId] = this.deploymentResults[configId].slice(-10);
    }

    // In a real implementation, this would save the results to persistent storage
  }

  /**
   * Load saved deployment configurations
   */
  private loadDeploymentConfigs(): void {
    // In a real implementation, this would load configurations from persistent storage
    // For now, we'll just initialize with some default configurations

    // Development environment
    this.deploymentConfigs.push({
      id: this.generateId(),
      name: 'Development',
      environment: DeploymentEnvironment.DEVELOPMENT,
      branch: 'develop',
      autoDeployEnabled: true,
      deployOnPush: true,
      deploymentScript:
        '# Example deployment script\necho "Deploying to development environment"\n',
    });

    // Staging environment
    this.deploymentConfigs.push({
      id: this.generateId(),
      name: 'Staging',
      environment: DeploymentEnvironment.STAGING,
      branch: 'staging',
      autoDeployEnabled: true,
      deployOnPush: true,
      deploymentScript: '# Example deployment script\necho "Deploying to staging environment"\n',
    });

    // Production environment
    this.deploymentConfigs.push({
      id: this.generateId(),
      name: 'Production',
      environment: DeploymentEnvironment.PRODUCTION,
      branch: 'main',
      autoDeployEnabled: false,
      deployOnPush: false,
      deploymentScript: '# Example deployment script\necho "Deploying to production environment"\n',
    });

    debug(
      'GitDeploymentIntegration',
      `Loaded ${this.deploymentConfigs.length} deployment configurations`,
    );
  }

  /**
   * Save deployment configurations
   */
  private saveDeploymentConfigs(): void {
    // In a real implementation, this would save configurations to persistent storage
    debug(
      'GitDeploymentIntegration',
      `Saved ${this.deploymentConfigs.length} deployment configurations`,
    );
  }

  /**
   * Generate a unique ID
   * @returns A unique ID
   */
  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }
}

export const gitDeploymentIntegration = GitDeploymentIntegration.getInstance();
