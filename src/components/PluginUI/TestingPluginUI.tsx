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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Loader2,
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

    // Reset selected test path when running all tests
    setSelectedTestPath('');

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
      const testPath = await implementation.createTestFile(`${testName}`, selectedContract);

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

  // State for selected test
  const [selectedTestPath, setSelectedTestPath] = useState<string>('');

  // Keyboard shortcuts for better IDE integration
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'Enter':
            if (event.shiftKey && selectedTestPath) {
              // Run selected test with Ctrl+Shift+Enter
              event.preventDefault();
              handleRunTest(selectedTestPath);
            } else {
              // Run all tests with Ctrl+Enter
              event.preventDefault();
              handleRunAllTests();
            }
            break;
          case 't':
            event.preventDefault();
            // Focus on test name input
            const testNameInput = document.querySelector(
              'input[placeholder="Enter test name"]',
            ) as HTMLInputElement;
            testNameInput?.focus();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedTestPath]);

  return (
    <div className="p-1 space-y-3 overflow-hidden">

      {/* Create Test */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between bg-muted/50 p-2 rounded-md cursor-pointer hover:bg-muted">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span className="text-xs font-medium">Create Test</span>
            </div>
            <ChevronRight className="h-3 w-3 transition-transform data-[state=open]:rotate-90" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="py-0 shadow-none mt-2">
            <CardContent className="p-3 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="contract-select" className="text-xs">Contract</Label>
                <Select value={selectedContract} onValueChange={setSelectedContract}>
                  <SelectTrigger id="contract-select" className="h-7 text-xs">
                    <SelectValue placeholder="Select contract" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSolidityContracts().map(({ path, contractName }) => (
                      <SelectItem key={path} value={contractName} className="text-xs">
                        {contractName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="test-name" className="text-xs">Test Name</Label>
                <Input
                  id="test-name"
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Enter test name"
                  disabled={isLoading}
                  className="h-9 text-xs"
                />
              </div>

              <Button
                onClick={handleCreateTestFile}
                disabled={isLoading || !selectedContract || !testName}
                className="w-full h-7 text-xs gap-1"
                size="sm"
              >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                {isLoading ? 'Creating...' : 'Create Test'}
              </Button>
              <p className="text-[10px] text-muted-foreground">Use Ctrl+T to focus on test name</p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      <div className={'flex flex-col gap-1 px-1'}>
        <Button onClick={handleRunAllTests} disabled={isLoading} size="lg" className="w-full text-xs gap-1">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <PlayCircle className="h-3 w-3" />
          )}
          {isLoading ? 'Running...' : 'Run All'}
        </Button>
      </div>
      <Separator className={'my-4'} />
      <div className={'px-1'}>Run Single Test</div>
      <div className="flex items-center justify-between gap-1">
        {/*<TestTube className="h-4 w-4" />*/}
        {/*<h2 className="text-base font-bold">Testing Framework</h2>*/}
        <div className="flex items-center gap-2">
          <Select
            disabled={isLoading}
            value={selectedTestPath}
            onValueChange={(value) => {
              // Only update if the value has changed
              if (value !== selectedTestPath) {
                setSelectedTestPath(value);
                handleRunTest(value);
              }
            }}
          >
            <SelectTrigger className="!h-8 text-xs min-w-[120px]">
              <SelectValue placeholder="Select Single Test" />
            </SelectTrigger>
            <SelectContent>
              {Array.from(files.entries())
                .filter(([path, file]) =>
                  file.type === 'file' &&
                  path.startsWith(testFolder) &&
                  path.endsWith('.test.js')
                )
                .map(([path]) => (
                  <SelectItem key={path} value={path} className="text-xs">
                    {path.split('/').pop()?.replace('.test.js', '')}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary" className="text-xs">
          {testResults.size} suites
        </Badge>
      </div>

      {error && (
        <div className="text-sm p-2 bg-red-50 border border-red-200 rounded-md text-red-600 flex items-center gap-1">
          <XCircle className="h-3 w-3 flex-shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Test Controls */}
      <Card className="border-0 shadow-none p-0">
        {/*<CardHeader className="hidden p-0 pb-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1">
              <Play className="h-4 w-4" />
              <CardTitle className="text-sm">Test Controls</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select
                disabled={isLoading}
                value={selectedTestPath}
                onValueChange={(value) => {
                  // Only update if the value has changed
                  if (value !== selectedTestPath) {
                    setSelectedTestPath(value);
                    handleRunTest(value);
                  }
                }}
              >
                <SelectTrigger className="h-7 text-xs w-[120px]">
                  <SelectValue placeholder="Run Single Test" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(files.entries())
                    .filter(([path, file]) =>
                      file.type === 'file' &&
                      path.startsWith(testFolder) &&
                      path.endsWith('.test.js')
                    )
                    .map(([path]) => (
                      <SelectItem key={path} value={path} className="text-xs">
                        {path.split('/').pop()?.replace('.test.js', '')}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button onClick={handleRunAllTests} disabled={isLoading} size="sm" className="h-7 text-xs gap-1">
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <PlayCircle className="h-3 w-3" />
                )}
                {isLoading ? 'Running...' : 'Run All'}
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            Ctrl+Enter to run all tests, Ctrl+Shift+Enter to run selected test
          </CardDescription>
        </CardHeader>*/}

        {/* Test Results Summary */}
        {testResults.size > 0 && (
          <CardContent className="p-3 pt-2">
            <div className="space-y-2">
              <div className="flex items-center gap-1 mb-1">
                <BarChart3 className="h-3 w-3" />
                <h4 className="text-xs font-medium">Results Summary</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-card border rounded-md">
                  <div className="relative flex items-start gap-1.5">
                    <CheckCircle size={16} className="text-green-600" />
                    <div className={''}>
                      <div className="text-xl font-bold">
                        {Array.from(testResults.values()).reduce(
                          (sum, result) => sum + result.passed,
                          0,
                        )}
                      </div>
                      <div className="text-xs text-green-600">Passed</div>
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-card border rounded-md">
                  <div className="relative flex items-start gap-1.5">
                    <XCircle size={16} className="text-red-600" />
                    <div className={''}>
                      <div className="text-xl font-bold">
                        {Array.from(testResults.values()).reduce(
                          (sum, result) => sum + result.failed,
                          0,
                        )}
                      </div>
                      <div className="text-xs text-red-600">Failed</div>
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-card border rounded-md">
                  <div className="relative flex items-start gap-1.5">
                    <FileText size={16} className="text-blue-600" />
                    <div className={''}>
                      <div className="text-xl font-bold">{testResults.size}</div>
                      <div className="text-xs text-muted-foreground">Suites</div>
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-card border rounded-md">
                  <div className="relative flex items-start gap-1.5">
                    <Clock size={16} className="text-purple-600" />
                    <div className={''}>
                      <div className="text-xl font-bold">
                        {formatDuration(
                          Array.from(testResults.values()).reduce(
                            (sum, result) => sum + result.duration,
                            0,
                          ),
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <div className={'space-y-4'}>
        {/* Test Results */}
        {testResults.size > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between bg-muted/50 p-2 rounded-md cursor-pointer hover:bg-muted">
                <div className="flex items-center gap-1">
                  <TestTube className="h-3 w-3" />
                  <span className="text-xs font-medium">Test Results</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {Array.from(testResults.values()).reduce(
                      (sum, result) => sum + result.tests.length,
                      0,
                    )} tests
                  </Badge>
                  <ChevronRight className="h-3 w-3 transition-transform data-[state=open]:rotate-90" />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {Array.from(testResults.entries()).map(([testPath, result]) => (
                  <Collapsible key={testPath}>
                    <CollapsibleTrigger asChild>
                      <div className="border rounded-md p-2 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <ChevronRight className="h-3 w-3 transition-transform data-[state=open]:rotate-90" />
                            <div className="truncate max-w-[150px]">
                              <div className="text-xs font-medium">{result.name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">{testPath}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant={result.failed > 0 ? 'destructive' : 'default'}
                              className="gap-1 text-[10px] px-1 py-0 h-4"
                            >
                              {result.failed > 0 ? (
                                <XCircle className="h-2 w-2" />
                              ) : (
                                <CheckCircle className="h-2 w-2" />
                              )}
                              {result.passed}/{result.passed + result.failed}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Only update if the value has changed
                                if (testPath !== selectedTestPath) {
                                  setSelectedTestPath(testPath);
                                  handleRunTest(testPath);
                                }
                              }}
                              disabled={isLoading}
                              className="h-5 w-5 p-0"
                            >
                              {isLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Play className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="pl-3 pr-1 py-1 space-y-1 border-l border-l-muted ml-2 mt-1">
                        {result.tests.map((test: any, index: number) => (
                          <div
                            key={index}
                            className={`p-1.5 rounded-sm text-xs ${
                              test.passed 
                                ? 'bg-green-50 border-l-2 border-l-green-500 dark:bg-green-950/30' 
                                : 'bg-red-50 border-l-2 border-l-red-500 dark:bg-red-950/30'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-start gap-1">
                                {test.passed ? (
                                  <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-600 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-[11px] truncate">{test.name}</div>
                                  {!test.passed && test.error && (
                                    <div className="mt-1 text-[10px] text-red-600 font-mono bg-red-100/50 dark:bg-red-900/50 p-1 rounded overflow-x-auto whitespace-pre-wrap">
                                      {test.error}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-[10px] text-muted-foreground whitespace-nowrap ml-1">
                                {formatDuration(test.duration)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Coverage Data */}
        {showCoverage && coverageData.size > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between bg-muted/50 p-2 rounded-md cursor-pointer hover:bg-muted">
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  <span className="text-xs font-medium">Coverage Report</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {coverageData.size} contracts
                  </Badge>
                  <ChevronRight className="h-3 w-3 transition-transform data-[state=open]:rotate-90" />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {Array.from(coverageData.entries()).map(([contractName, data]) => (
                  <Collapsible key={contractName}>
                    <CollapsibleTrigger asChild>
                      <div className="border rounded-md p-2 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex justify-between items-center">
                          <div className="text-xs font-medium truncate">{contractName}</div>
                          <ChevronRight className="h-3 w-3 transition-transform data-[state=open]:rotate-90" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-2 space-y-2 border-x border-b rounded-b-md">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-[11px]">Lines</span>
                            </span>
                            <span className="text-[11px] font-medium">{data.lines.percentage}%</span>
                          </div>
                          <Progress value={data.lines.percentage} className="h-1.5" />
                          <div className="text-[10px] text-muted-foreground">
                            {data.lines.covered}/{data.lines.total} lines
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-[11px]">Functions</span>
                            </span>
                            <span className="text-[11px] font-medium">{data.functions.percentage}%</span>
                          </div>
                          <Progress value={data.functions.percentage} className="h-1.5" />
                          <div className="text-[10px] text-muted-foreground">
                            {data.functions.covered}/{data.functions.total} functions
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <span className="text-[11px]">Branches</span>
                            </span>
                            <span className="text-[11px] font-medium">{data.branches.percentage}%</span>
                          </div>
                          <Progress value={data.branches.percentage} className="h-1.5" />
                          <div className="text-[10px] text-muted-foreground">
                            {data.branches.covered}/{data.branches.total} branches
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-[11px]">Statements</span>
                            </span>
                            <span className="text-[11px] font-medium">{data.statements.percentage}%</span>
                          </div>
                          <Progress value={data.statements.percentage} className="h-1.5" />
                          <div className="text-[10px] text-muted-foreground">
                            {data.statements.covered}/{data.statements.total} statements
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Configuration */}
        <Collapsible open={showConfig} onOpenChange={setShowConfig}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between bg-muted/50 p-2 rounded-md cursor-pointer hover:bg-muted">
              <div className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                <span className="text-xs font-medium">Settings</span>
              </div>
              <ChevronRight className="h-3 w-3 transition-transform data-[state=open]:rotate-90" />
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="mt-2 p-2 border rounded-md space-y-3">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-8">
                  <TabsTrigger value="general" className="text-[10px] py-1">General</TabsTrigger>
                  <TabsTrigger value="execution" className="text-[10px] py-1">Execution</TabsTrigger>
                  <TabsTrigger value="reporting" className="text-[10px] py-1">Reporting</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-2 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="test-folder" className="text-xs">Test Folder</Label>
                    <Input
                      id="test-folder"
                      type="text"
                      value={testFolder}
                      onChange={(e) => setTestFolder(e.target.value)}
                      placeholder="/tests"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="test-framework" className="text-xs">Framework</Label>
                    <Select value={testFramework} onValueChange={setTestFramework}>
                      <SelectTrigger id="test-framework" className="!h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mocha" className="text-xs">Mocha</SelectItem>
                        <SelectItem value="truffle" className="text-xs">Truffle</SelectItem>
                        <SelectItem value="hardhat" className="text-xs">Hardhat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="execution" className="space-y-2 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="gas-limit" className="text-xs">Gas Limit</Label>
                    <Input
                      id="gas-limit"
                      type="number"
                      value={gasLimit}
                      onChange={(e) => setGasLimit(parseInt(e.target.value))}
                      min="1000000"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="test-timeout" className="text-xs">Timeout (ms)</Label>
                    <Input
                      id="test-timeout"
                      type="number"
                      value={testTimeout}
                      onChange={(e) => setTestTimeout(parseInt(e.target.value))}
                      min="1000"
                      className="text-xs"
                    />
                  </div>

                  <div className="flex items-center space-x-1 pt-1">
                    <Checkbox
                      id="auto-run"
                      checked={autoRunOnSave}
                      onCheckedChange={setAutoRunOnSave}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="auto-run" className="text-xs font-normal">
                      Auto-run tests on file save
                    </Label>
                  </div>
                </TabsContent>

                <TabsContent value="reporting" className="space-y-2 mt-2">
                  <div className="flex items-center space-x-1">
                    <Checkbox
                      id="show-coverage"
                      checked={showCoverage}
                      onCheckedChange={setShowCoverage}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="show-coverage" className="text-xs font-normal">
                      Show coverage report
                    </Label>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="pt-1">
                <Button onClick={handleSaveConfig} className="w-full h-7 text-xs gap-1" size="sm">
                  <Settings className="h-3 w-3" />
                  Save Settings
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div className="bg-card border rounded-md p-2 shadow-sm">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <div>
                <p className="text-xs font-medium">Running tests...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestingPluginUI;
