import React, { useState, useEffect } from 'react';
import { usePluginStore } from '@/stores/pluginStore';
import { useFileStore } from '@/stores/fileStore';
import { AnalysisPluginImplementation, AnalysisSeverity } from '@/plugins/analysisPlugin';

interface AnalysisPluginUIProps {
  pluginId: string;
}

const AnalysisPluginUI: React.FC<AnalysisPluginUIProps> = ({ pluginId }) => {
  const { getPlugin, updatePluginConfig } = usePluginStore();
  const { files } = useFileStore();

  const [implementation, setImplementation] = useState<AnalysisPluginImplementation | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Filter options
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showSecurityIssues, setShowSecurityIssues] = useState(true);
  const [showGasIssues, setShowGasIssues] = useState(true);
  const [showStyleIssues, setShowStyleIssues] = useState(true);
  const [showBestPracticeIssues, setShowBestPracticeIssues] = useState(true);

  // Config options
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [securityRules, setSecurityRules] = useState(true);
  const [gasOptimizationRules, setGasOptimizationRules] = useState(true);
  const [styleRules, setStyleRules] = useState(true);
  const [bestPracticeRules, setBestPracticeRules] = useState(true);

  // Initialize the implementation when the component mounts
  useEffect(() => {
    const plugin = getPlugin(pluginId);
    if (plugin) {
      const impl = new AnalysisPluginImplementation(plugin.config);
      setImplementation(impl);

      // Load config values
      setAutoAnalyze(plugin.config.autoAnalyze || true);
      setSecurityRules(plugin.config.securityRules || true);
      setGasOptimizationRules(plugin.config.gasOptimizationRules || true);
      setStyleRules(plugin.config.styleRules || true);
      setBestPracticeRules(plugin.config.bestPracticeRules || true);

      // Set filter options based on config
      setShowErrors(plugin.config.severityLevels?.error || true);
      setShowWarnings(plugin.config.severityLevels?.warning || true);
      setShowInfo(plugin.config.severityLevels?.info || true);

      // Load last analysis if available
      const lastAnalysis = impl.getLastAnalysis();
      if (lastAnalysis) {
        setAnalysisSummary(lastAnalysis);
        filterResults(lastAnalysis.results);
      }
    }
  }, [pluginId, getPlugin]);

  // Filter results based on selected options
  const filterResults = (results: any[]) => {
    if (!results) return;

    const filtered = results.filter((result) => {
      // Filter by severity
      if (result.severity === AnalysisSeverity.ERROR && !showErrors) return false;
      if (result.severity === AnalysisSeverity.WARNING && !showWarnings) return false;
      if (result.severity === AnalysisSeverity.INFO && !showInfo) return false;

      // Filter by category
      if (result.category === 'security' && !showSecurityIssues) return false;
      if (result.category === 'gas' && !showGasIssues) return false;
      if (result.category === 'style' && !showStyleIssues) return false;
      if (result.category === 'best-practice' && !showBestPracticeIssues) return false;

      // Filter by file if a file is selected
      if (selectedFile && result.file !== selectedFile) return false;

      return true;
    });

    setFilteredResults(filtered);
  };

  // Effect to filter results when filters or selected file changes
  useEffect(() => {
    if (analysisSummary && analysisSummary.results) {
      filterResults(analysisSummary.results);
    }
  }, [
    analysisSummary,
    selectedFile,
    showErrors,
    showWarnings,
    showInfo,
    showSecurityIssues,
    showGasIssues,
    showStyleIssues,
    showBestPracticeIssues,
  ]);

  // Run analysis on all files
  const handleRunAnalysis = async () => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      // Convert files to a Map<string, string> for analysis
      const filesToAnalyze = new Map<string, string>();
      Array.from(files.entries()).forEach(([path, file]) => {
        if (file.type === 'file') {
          filesToAnalyze.set(path, file.content);
        }
      });

      const summary = await implementation.analyzeFiles(filesToAnalyze);
      setAnalysisSummary(summary);
      filterResults(summary.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run analysis');
    } finally {
      setIsLoading(false);
    }
  };

  // Save configuration
  const handleSaveConfig = () => {
    if (!implementation) return;

    const config = {
      autoAnalyze,
      securityRules,
      gasOptimizationRules,
      styleRules,
      bestPracticeRules,
      severityLevels: {
        error: showErrors,
        warning: showWarnings,
        info: showInfo,
      },
    };

    updatePluginConfig(pluginId, config);

    // Update implementation config
    implementation.updateConfig(config);

    setShowConfig(false);
  };

  // Get severity badge color
  const getSeverityBadgeColor = (severity: AnalysisSeverity) => {
    switch (severity) {
      case AnalysisSeverity.ERROR:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case AnalysisSeverity.WARNING:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case AnalysisSeverity.INFO:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Get category badge color
  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'security':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'gas':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'style':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'best-practice':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'custom':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Get Solidity files from files
  const getSolidityFiles = () => {
    return Array.from(files.entries())
      .filter(([path, file]) => file.type === 'file' && path.endsWith('.sol'))
      .map(([path]) => path);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Code Analysis & Linting</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Analysis Controls */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Analysis Controls</h3>
          <button
            onClick={handleRunAnalysis}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={isLoading}
          >
            Run Analysis
          </button>
        </div>

        {/* File Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Filter by File</label>
          <select
            value={selectedFile || ''}
            onChange={(e) => setSelectedFile(e.target.value || null)}
            className="w-full p-2 border rounded"
          >
            <option value="">All Files</option>
            {getSolidityFiles().map((path) => (
              <option key={path} value={path}>
                {path}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Options */}
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4">
          <h4 className="font-medium mb-2">Filter Options</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium mb-1">Severity</h5>
              <div className="space-y-1">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showErrors}
                    onChange={(e) => setShowErrors(e.target.checked)}
                    className="mr-2"
                  />
                  Errors
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showWarnings}
                    onChange={(e) => setShowWarnings(e.target.checked)}
                    className="mr-2"
                  />
                  Warnings
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showInfo}
                    onChange={(e) => setShowInfo(e.target.checked)}
                    className="mr-2"
                  />
                  Info
                </label>
              </div>
            </div>
            <div>
              <h5 className="font-medium mb-1">Category</h5>
              <div className="space-y-1">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showSecurityIssues}
                    onChange={(e) => setShowSecurityIssues(e.target.checked)}
                    className="mr-2"
                  />
                  Security
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showGasIssues}
                    onChange={(e) => setShowGasIssues(e.target.checked)}
                    className="mr-2"
                  />
                  Gas Optimization
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showStyleIssues}
                    onChange={(e) => setShowStyleIssues(e.target.checked)}
                    className="mr-2"
                  />
                  Style
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showBestPracticeIssues}
                    onChange={(e) => setShowBestPracticeIssues(e.target.checked)}
                    className="mr-2"
                  />
                  Best Practices
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Summary */}
      {analysisSummary && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Analysis Summary</h3>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                <div className="text-lg font-bold text-red-600">{analysisSummary.errors}</div>
                <div className="text-sm">Errors</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                <div className="text-lg font-bold text-yellow-600">{analysisSummary.warnings}</div>
                <div className="text-sm">Warnings</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                <div className="text-lg font-bold text-blue-600">{analysisSummary.infos}</div>
                <div className="text-sm">Info</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded shadow">
                <div className="text-lg font-bold">{analysisSummary.files}</div>
                <div className="text-sm">Files Analyzed</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Analysis completed in {(analysisSummary.duration / 1000).toFixed(2)} seconds at{' '}
              {new Date(analysisSummary.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {filteredResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">
            Analysis Results ({filteredResults.length})
          </h3>
          <div className="space-y-4">
            {filteredResults.map((result, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 border rounded shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{result.name}</h4>
                    <div className="text-sm text-gray-500">
                      {result.file}:{result.line}:{result.column}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${getSeverityBadgeColor(result.severity)}`}
                    >
                      {result.severity}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${getCategoryBadgeColor(result.category)}`}
                    >
                      {result.category}
                    </span>
                  </div>
                </div>
                <p className="text-sm mb-2">{result.description}</p>
                {result.impact && (
                  <div className="text-sm mb-1">
                    <span className="font-medium">Impact:</span> {result.impact}
                  </div>
                )}
                {result.recommendation && (
                  <div className="text-sm">
                    <span className="font-medium">Recommendation:</span> {result.recommendation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {analysisSummary && filteredResults.length === 0 && (
        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No issues found matching the current filters.
          </p>
        </div>
      )}

      {/* Configuration */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Configuration</h3>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-blue-500 hover:text-blue-700"
          >
            {showConfig ? 'Hide' : 'Show'}
          </button>
        </div>

        {showConfig && (
          <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-700 rounded">
            <div className="mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoAnalyze}
                  onChange={(e) => setAutoAnalyze(e.target.checked)}
                  className="mr-2"
                />
                Auto-analyze on file save
              </label>
            </div>

            <h4 className="font-medium mb-2">Rule Categories</h4>
            <div className="space-y-2 mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={securityRules}
                  onChange={(e) => setSecurityRules(e.target.checked)}
                  className="mr-2"
                />
                Security Rules
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={gasOptimizationRules}
                  onChange={(e) => setGasOptimizationRules(e.target.checked)}
                  className="mr-2"
                />
                Gas Optimization Rules
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={styleRules}
                  onChange={(e) => setStyleRules(e.target.checked)}
                  className="mr-2"
                />
                Style Rules
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={bestPracticeRules}
                  onChange={(e) => setBestPracticeRules(e.target.checked)}
                  className="mr-2"
                />
                Best Practice Rules
              </label>
            </div>

            <button
              onClick={handleSaveConfig}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save Configuration
            </button>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <p>Analyzing code...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisPluginUI;
