import React, { useState, useEffect, useCallback } from 'react';
import { usePluginStore } from '@/stores/pluginStore';
import { useFileStore } from '@/stores/fileStore';
import { TestingPluginImplementation } from '@/plugins/testingPlugin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play,
  PlayCircle,
  Settings,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  ChevronDown,
  ChevronRight,
  TestTube,
  BarChart3,
  Loader2
} from 'lucide-react';

interface TestingPluginUIProps {
  pluginId: string;
}

const TestingPluginUI: React.FC<TestingPluginUIProps> = ({ pluginId }) => {
  const { getPlugin, updatePluginConfig } = usePluginStore();
  const { files } = useFileStore();

  const [implementation, setImplementation] = useState<TestingPluginImplementation | null>(null);
  const [testResults, setTestResults] = useState<Map<string, any>>(new Map());
  const [coverageData, setCoverageData] = useState<Map<string, any>>(new Map());
  const [selectedContract, setSelectedContract] = useState('');
  const [testName, setTestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Config options
  const [testFolder, setTestFolder] = useState('/tests');
  const [autoRunOnSave, setAutoRunOnSave] = useState(false);
  const [gasLimit, setGasLimit] = useState(6000000);
  const [showCoverage, setShowCoverage] = useState(true);
  const [testTimeout, setTestTimeout] = useState(5000);
  const [testFramework, setTestFramework] = useState('mocha');

  // Initialize the implementation when the component mounts
  useEffect(() => {
    const plugin = getPlugin(pluginId);
    if (plugin) {
      const impl = new TestingPluginImplementation(plugin.config);
      setImplementation(impl);

      // Load config values
      setTestFolder(plugin.config.testFolder || '/tests');
      setAutoRunOnSave(plugin.config.autoRunOnSave || false);
      setGasLimit(plugin.config.gasLimit || 6000000);
      setShowCoverage(plugin.config.showCoverage || true);
      setTestTimeout(plugin.config.testTimeout || 5000);
      setTestFramework(plugin.config.testFramework || 'mocha');

      // Load initial test results if available
      loadTestResults(impl);
    }
  }, [pluginId, getPlugin]);

  // Load test results
  const loadTestResults = async (impl: TestingPluginImplementation | null = implementation) => {
    if (!impl) return;

    try {
      const results = await impl.getTestResults();
      setTestResults(results);

      if (showCoverage) {
        const coverage = await impl.getCoverageData();
        setCoverageData(coverage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test results');
    }
  };

  // Get Solidity contracts from files
  const getSolidityContracts = () => {
    return Array.from(files.entries())
      .filter(([path, file]) => file.type === 'file' && path.endsWith('.sol'))
      .map(([path, file]) => {
        // Extract contract name from path
        const parts = path.split('/');
        const fileName = parts[parts.length - 1];
        const contractName = fileName.replace('.sol', '');
        return { path, contractName };
      });
  };

  // Run all tests
  const handleRunAllTests = async () => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.runAllTests();
      await loadTestResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run tests');
    } finally {
      setIsLoading(false);
    }
  };

  // Run a specific test
  const handleRunTest = async (testPath: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.runTest(testPath);
      await loadTestResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to run test: ${testPath}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new test file
  const handleCreateTestFile = async () => {
    if (!implementation || !selectedContract || !testName) return;

    setIsLoading(true);
    setError(null);

    try {
      const testPath = await implementation.createTestFile(
        `${testName}.test.js`,
        selectedContract
      );

      setTestName('');
      setSelectedContract('');

      // Refresh test results
      await loadTestResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create test file');
    } finally {
      setIsLoading(false);
    }
  };

  // Save configuration
  const handleSaveConfig = () => {
    if (!implementation) return;

    const config = {
      testFolder,
      autoRunOnSave,
      gasLimit,
      showCoverage,
      testTimeout,
      testFramework,
    };

    updatePluginConfig(pluginId, config);

    // Update implementation config
    implementation.updateConfig(config);

    setShowConfig(false);
  };

  // Format duration in ms to readable format
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Keyboard shortcuts for better IDE integration
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'Enter':
            event.preventDefault();
            handleRunAllTests();
            break;
          case 't':
            event.preventDefault();
            // Focus on test name input
            const testNameInput = document.querySelector('input[placeholder="Enter test name"]') as HTMLInputElement;
            testNameInput?.focus();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2">
        <TestTube className="h-6 w-6" />
        <h2 className="text-xl font-bold">Testing Framework</h2>
        <Badge variant="secondary" className="ml-auto">
          {testResults.size} suites
        </Badge>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              <CardTitle>Test Controls</CardTitle>
            </div>
            <Button
              onClick={handleRunAllTests}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              {isLoading ? 'Running...' : 'Run All Tests'}
            </Button>
          </div>
          <CardDescription>
            Execute tests for your smart contracts. Use Ctrl+Enter to run all tests.
          </CardDescription>
        </CardHeader>

        {/* Test Results Summary */}
        {testResults.size > 0 && (
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4" />
                <h4 className="font-medium">Test Results Summary</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-lg font-bold">{Array.from(testResults.values()).reduce((sum, result) => sum + result.passed, 0)}</div>
                      <div className="text-xs text-green-600">Tests Passed</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <div>
                      <div className="text-lg font-bold">{Array.from(testResults.values()).reduce((sum, result) => sum + result.failed, 0)}</div>
                      <div className="text-xs text-red-600">Tests Failed</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-lg font-bold">{testResults.size}</div>
                      <div className="text-xs text-muted-foreground">Test Suites</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="text-lg font-bold">
                        {formatDuration(Array.from(testResults.values()).reduce((sum, result) => sum + result.duration, 0))}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Duration</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Create Test */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Create Test</CardTitle>
          </div>
          <CardDescription>
            Generate a new test file for your smart contracts. Use Ctrl+T to focus on test name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contract-select">Contract to Test</Label>
            <Select value={selectedContract} onValueChange={setSelectedContract}>
              <SelectTrigger id="contract-select">
                <SelectValue placeholder="Select a contract" />
              </SelectTrigger>
              <SelectContent>
                {getSolidityContracts().map(({ path, contractName }) => (
                  <SelectItem key={path} value={contractName}>
                    {contractName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-name">Test Name</Label>
            <Input
              id="test-name"
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="Enter test name"
              disabled={isLoading}
            />
          </div>

          <Button
            onClick={handleCreateTestFile}
            disabled={isLoading || !selectedContract || !testName}
            className="w-full gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {isLoading ? 'Creating...' : 'Create Test File'}
          </Button>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.size > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              <CardTitle>Test Results</CardTitle>
              <Badge variant="outline" className="ml-auto">
                {Array.from(testResults.values()).reduce((sum, result) => sum + result.tests.length, 0)} tests
              </Badge>
            </div>
            <CardDescription>
              Detailed results from your test executions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from(testResults.entries()).map(([testPath, result]) => (
              <Collapsible key={testPath} defaultOpen>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 transition-transform data-[state=open]:rotate-90" />
                          <div>
                            <CardTitle className="text-base">{result.name}</CardTitle>
                            <CardDescription className="text-xs">{testPath}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={result.failed > 0 ? "destructive" : "default"} className="gap-1">
                            {result.failed > 0 ? (
                              <XCircle className="h-3 w-3" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            {result.passed}/{result.passed + result.failed}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(result.duration)}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunTest(testPath);
                            }}
                            disabled={isLoading}
                            className="gap-1"
                          >
                            {isLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            Run
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {result.tests.map((test: any, index: number) => (
                          <Card key={index} className={`p-3 ${test.passed ? 'border-green-200 bg-green-50 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:bg-red-950'}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                {test.passed ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <div>
                                  <div className="font-medium text-sm">{test.name}</div>
                                  {!test.passed && test.error && (
                                    <div className="mt-1 text-xs text-red-600 font-mono bg-red-100 dark:bg-red-900 p-1 rounded">
                                      {test.error}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(test.duration)}
                              </Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Coverage Data */}
      {showCoverage && coverageData.size > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Coverage Report</CardTitle>
              <Badge variant="outline" className="ml-auto">
                {coverageData.size} contracts
              </Badge>
            </div>
            <CardDescription>
              Code coverage analysis for your smart contracts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Array.from(coverageData.entries()).map(([contractName, data]) => (
              <Card key={contractName}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{contractName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          Lines
                        </span>
                        <span className="font-medium">{data.lines.percentage}%</span>
                      </div>
                      <Progress value={data.lines.percentage} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {data.lines.covered}/{data.lines.total} lines covered
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          Functions
                        </span>
                        <span className="font-medium">{data.functions.percentage}%</span>
                      </div>
                      <Progress value={data.functions.percentage} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {data.functions.covered}/{data.functions.total} functions covered
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          Branches
                        </span>
                        <span className="font-medium">{data.branches.percentage}%</span>
                      </div>
                      <Progress value={data.branches.percentage} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {data.branches.covered}/{data.branches.total} branches covered
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          Statements
                        </span>
                        <span className="font-medium">{data.statements.percentage}%</span>
                      </div>
                      <Progress value={data.statements.percentage} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {data.statements.covered}/{data.statements.total} statements covered
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Configuration */}
      <Collapsible open={showConfig} onOpenChange={setShowConfig}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <CardTitle>Configuration</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Settings</Badge>
                  <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                </div>
              </div>
              <CardDescription>
                Customize testing framework settings and behavior
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="space-y-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="execution">Execution</TabsTrigger>
                  <TabsTrigger value="reporting">Reporting</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-folder">Test Folder</Label>
                    <Input
                      id="test-folder"
                      type="text"
                      value={testFolder}
                      onChange={(e) => setTestFolder(e.target.value)}
                      placeholder="/tests"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="test-framework">Test Framework</Label>
                    <Select value={testFramework} onValueChange={setTestFramework}>
                      <SelectTrigger id="test-framework">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mocha">Mocha</SelectItem>
                        <SelectItem value="truffle">Truffle</SelectItem>
                        <SelectItem value="hardhat">Hardhat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="execution" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gas-limit">Gas Limit</Label>
                    <Input
                      id="gas-limit"
                      type="number"
                      value={gasLimit}
                      onChange={(e) => setGasLimit(parseInt(e.target.value))}
                      min="1000000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="test-timeout">Test Timeout (ms)</Label>
                    <Input
                      id="test-timeout"
                      type="number"
                      value={testTimeout}
                      onChange={(e) => setTestTimeout(parseInt(e.target.value))}
                      min="1000"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="auto-run"
                      checked={autoRunOnSave}
                      onCheckedChange={setAutoRunOnSave}
                    />
                    <Label htmlFor="auto-run" className="text-sm font-normal">
                      Auto-run tests on file save
                    </Label>
                  </div>
                </TabsContent>

                <TabsContent value="reporting" className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-coverage"
                      checked={showCoverage}
                      onCheckedChange={setShowCoverage}
                    />
                    <Label htmlFor="show-coverage" className="text-sm font-normal">
                      Show coverage report
                    </Label>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSaveConfig} className="gap-2">
                  <Settings className="h-4 w-4" />
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Loading indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6 min-w-[200px]">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div>
                <p className="font-medium">Processing...</p>
                <p className="text-sm text-muted-foreground">Running tests and analyzing results</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TestingPluginUI;
