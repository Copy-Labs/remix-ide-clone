// File System Types
export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  parent?: string;
  isOpen?: boolean;
  isSelected?: boolean;
  lastModified: number;
  size?: number;
}

export interface FileSystemState {
  files: Map<string, FileNode>;
  activeFile: string | null;
  openTabs: string[];
  selectedFiles: string[];
  expandedFolders: Set<string>;
}

// Editor Types
export interface EditorState {
  editorInstances: Map<string, monaco.editor.IStandaloneCodeEditor>;
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  folding: boolean;
  bracketMatching: boolean;
}

export interface EditorSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  folding: boolean;
  bracketMatching: boolean;
}

// Compiler Types
export interface CompilerState {
  isCompiling: boolean;
  compilationResult: CompilationResult | null;
  selectedContract: string | null;
  compilerVersion: string;
  availableVersions: string[]; // Now an array of strings
  optimizationEnabled: boolean;
  optimizationRuns: number;
  autoCompile: boolean;
  lastCompilationTime: Date | null;
}

export interface CompilationResult {
  success: boolean;
  errors: CompilerError[];
  warnings: CompilerWarning[];
  contracts: Record<string, CompiledContract>;
  sources: Record<string, string>;
}

export interface CompilerError {
  severity: 'error' | 'warning';
  message: string;
  sourceLocation?: {
    file: string;
    start: number;
    end: number;
  };
  type: string;
  component: string;
  errorCode?: string;
}

export interface CompilerWarning {
  severity: 'warning';
  message: string;
  sourceLocation?: {
    file: string;
    start: number;
    end: number;
  };
  type: string;
  component: string;
}

export interface CompiledContract {
  name: string;
  bytecode: string;
  deployedBytecode: string;
  abi: any[];
  metadata: string;
  devdoc: any;
  userdoc: any;
  storageLayout: any;
  gasEstimates: any;
  assembly: any;
}

export interface SourceMap {
  [fileName: string]: {
    id: number;
    ast: any;
    source: string;
  };
}

// Deployment Types
export interface DeploymentState {
  deployedContracts: Map<string, DeployedContract>;
  isDeploying: boolean;
  selectedNetwork: string;
  availableNetworks: Network[];
  account: string | null;
  balance: string | null;
  gasPrice: string | null;
  gasLimit: string;
}

export interface DeployedContract {
  name: string;
  address: string;
  abi: any[];
  bytecode: string;
  network: string;
  deployedAt: number;
  transactionHash: string;
  deploymentCost: string;
  constructorArgs: any[];
}

export interface Network {
  id: string;
  name: string;
  rpcUrl: string;
  chainId: number;
  symbol: string;
  blockExplorer?: string;
  isTestnet: boolean;
}

// UI Types
export interface UIState {
  sidebarCollapsed: boolean;
  terminalCollapsed: boolean;
  activePanel: 'files' | 'compiler' | 'deploy' | 'debugger' | 'settings';
  layout: 'default' | 'zen' | 'minimal';
  notifications: Notification[];
  modals: Modal[];
  contextMenus: ContextMenu[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
  createdAt: number;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface Modal {
  id: string;
  title: string;
  content: React.ComponentType<any>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  data?: any;
}

export interface ContextMenu {
  id: string;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

export interface ContextMenuItem {
  label: string;
  action: () => void;
  icon?: React.ComponentType<any>;
  disabled?: boolean;
  separator?: boolean;
  submenu?: ContextMenuItem[];
}

// Terminal Types
export interface TerminalState {
  history: TerminalEntry[];
  currentCommand: string;
  isRunning: boolean;
  workingDirectory: string;
}

export interface TerminalEntry {
  id: string;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: number;
}

// Settings Types
export interface Settings {
  general: GeneralSettings;
  editor: EditorSettings;
  compiler: CompilerSettings;
  deployment: DeploymentSettings;
  ui: UISettings;
}

export interface GeneralSettings {
  autoSave: boolean;
  autoSaveDelay: number;
  confirmBeforeClose: boolean;
  showWelcomeScreen: boolean;
  telemetry: boolean;
  updates: 'auto' | 'manual' | 'disabled';
}

export interface CompilerSettings {
  defaultVersion: string;
  autoCompile: boolean;
  optimizationEnabled: boolean;
  optimizationRuns: number;
  evmVersion: string;
  remappings: string[];
}

export interface DeploymentSettings {
  defaultNetwork: string;
  defaultGasLimit: string;
  confirmTransactions: boolean;
  saveDeployments: boolean;
}

export interface UISettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  fontSize: number;
  fontFamily: string;
  compactMode: boolean;
  showLineNumbers: boolean;
  showMinimap: boolean;
  wordWrap: boolean;
}

// Plugin Types
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  config: PluginConfig;
  api: PluginAPI;
}

export interface PluginConfig {
  [key: string]: any;
}

export interface PluginAPI {
  fileSystem: FileSystemAPI;
  editor: EditorAPI;
  compiler: CompilerAPI;
  deployment: DeploymentAPI;
  ui: UIAPI;
}

export interface FileSystemAPI {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  createFile: (path: string, content?: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
}

export interface EditorAPI {
  getActiveEditor: () => monaco.editor.IStandaloneCodeEditor | null;
  getEditorContent: (path: string) => string | null;
  setEditorContent: (path: string, content: string) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
}

export interface CompilerAPI {
  compile: (files: Map<string, string>) => Promise<CompilationResult>;
  getCompilationResult: (contractName: string) => CompilationResult | null;
}

export interface DeploymentAPI {
  deploy: (contract: CompiledContract, args: any[]) => Promise<DeployedContract>;
  getDeployedContract: (address: string) => DeployedContract | null;
  interact: (contract: DeployedContract, method: string, args: any[]) => Promise<any>;
}

export interface UIAPI {
  showNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  showModal: (modal: Omit<Modal, 'id'>) => void;
  showContextMenu: (menu: Omit<ContextMenu, 'id'>) => void;
}

// Web3 Types
export interface Web3State {
  provider: any;
  web3: any;
  account: string | null;
  network: Network | null;
  balance: string | null;
  isConnected: boolean;
  isConnecting: boolean;
}

// Global App State
export interface AppState {
  fileSystem: FileSystemState;
  editor: EditorState;
  compiler: CompilerState;
  deployment: DeploymentState;
  ui: UIState;
  terminal: TerminalState;
  settings: Settings;
  web3: Web3State;
  plugins: Plugin[];
}

// Action Types
export type FileSystemAction =
  | { type: 'CREATE_FILE'; payload: { path: string; content?: string } }
  | { type: 'DELETE_FILE'; payload: { path: string } }
  | { type: 'RENAME_FILE'; payload: { oldPath: string; newPath: string } }
  | { type: 'UPDATE_FILE'; payload: { path: string; content: string } }
  | { type: 'OPEN_FILE'; payload: { path: string } }
  | { type: 'CLOSE_FILE'; payload: { path: string } }
  | { type: 'SET_ACTIVE_FILE'; payload: { path: string | null } }
  | { type: 'TOGGLE_FOLDER'; payload: { path: string } };

export type EditorAction =
  | { type: 'REGISTER_EDITOR'; payload: { fileId: string; editor: monaco.editor.IStandaloneCodeEditor } }
  | { type: 'UPDATE_EDITOR_SETTINGS'; payload: Partial<EditorSettings> }
  | { type: 'SET_THEME'; payload: { theme: 'light' | 'dark' | 'auto' } };

export type CompilerAction =
  | { type: 'START_COMPILATION' }
  | { type: 'COMPILATION_SUCCESS'; payload: { result: CompilationResult } }
  | { type: 'COMPILATION_ERROR'; payload: { error: string } }
  | { type: 'SET_COMPILER_VERSION'; payload: { version: string } };

export type DeploymentAction =
  | { type: 'START_DEPLOYMENT'; payload: { contract: CompiledContract } }
  | { type: 'DEPLOYMENT_SUCCESS'; payload: { contract: DeployedContract } }
  | { type: 'DEPLOYMENT_ERROR'; payload: { error: string } }
  | { type: 'SET_NETWORK'; payload: { network: Network } };

export type UIAction =
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_TERMINAL' }
  | { type: 'SET_ACTIVE_PANEL'; payload: { panel: UIState['activePanel'] } }
  | { type: 'SHOW_NOTIFICATION'; payload: Omit<Notification, 'id' | 'createdAt'> }
  | { type: 'HIDE_NOTIFICATION'; payload: { id: string } }
  | { type: 'SHOW_MODAL'; payload: Omit<Modal, 'id'> }
  | { type: 'HIDE_MODAL'; payload: { id: string } };

// Logging Types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
  context?: Record<string, any>;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

declare global {
  interface Window {
    monaco: typeof monaco;
    remixIDE: {
      version: string;
      plugins: Plugin[];
      api: PluginAPI;
    };
  }
}
