import React, { useState, useEffect } from 'react';
import { usePluginStore } from '@/stores/pluginStore';
import { DebuggerPluginImplementation } from '@/plugins/debuggerPlugin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  Square,
  LucideArrowDownToDot,
  LucideBetweenHorizontalStart,
  LucideArrowUpFromDot,
  SkipForward,
  Plus,
  X,
  Settings,
  AlertCircle,
  Bug,
  RefreshCw,
} from 'lucide-react';

interface DebuggerPanelProps {
  pluginId?: string;
}

const DebuggerPanel: React.FC<DebuggerPanelProps> = ({ pluginId = 'solidity-debugger' }) => {
  const { getPlugin, updatePluginConfig } = usePluginStore();

  const [implementation, setImplementation] = useState<DebuggerPluginImplementation | null>(null);
  const [debugState, setDebugState] = useState<any>(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [breakpoints, setBreakpoints] = useState<number[]>([]);
  const [newBreakpoint, setNewBreakpoint] = useState<string>('');
  const [expression, setExpression] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // Config options
  const [showLocalVariables, setShowLocalVariables] = useState(true);
  const [showStateVariables, setShowStateVariables] = useState(true);
  const [showCallStack, setShowCallStack] = useState(true);
  const [showMemory, setShowMemory] = useState(true);
  const [showStorage, setShowStorage] = useState(true);
  const [autoBreakOnError, setAutoBreakOnError] = useState(true);

  // Initialize the implementation when the component mounts
  useEffect(() => {
    const plugin = getPlugin(pluginId);
    if (plugin) {
      const impl = new DebuggerPluginImplementation(plugin.config);
      setImplementation(impl);

      // Load config values
      setShowLocalVariables(plugin.config.showLocalVariables ?? true);
      setShowStateVariables(plugin.config.showStateVariables ?? true);
      setShowCallStack(plugin.config.showCallStack ?? true);
      setShowMemory(plugin.config.showMemory ?? true);
      setShowStorage(plugin.config.showStorage ?? true);
      setAutoBreakOnError(plugin.config.autoBreakOnError ?? true);

      // Load breakpoints
      loadBreakpoints(impl);
    }
  }, [pluginId, getPlugin]);

  // Load breakpoints
  const loadBreakpoints = async (impl: DebuggerPluginImplementation | null = implementation) => {
    if (!impl) return;

    try {
      const breakpoints = await impl.getBreakpoints();
      setBreakpoints(breakpoints);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load breakpoints');
    }
  };

  // Update debug state
  const updateDebugState = async () => {
    if (!implementation || !isDebugging) return;

    try {
      const state = await implementation.getDebugState();
      setDebugState(state);
      setIsDebugging(state.isDebugging);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update debug state');
    }
  };

  // Start debugging
  const handleStartDebugging = async () => {
    if (!implementation || !transactionHash) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.startDebugging(transactionHash);
      setIsDebugging(true);
      await updateDebugState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start debugging');
    } finally {
      setIsLoading(false);
    }
  };

  // Stop debugging
  const handleStopDebugging = async () => {
    if (!implementation || !isDebugging) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.stopDebugging();
      setIsDebugging(false);
      setDebugState(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop debugging');
    } finally {
      setIsLoading(false);
    }
  };

  // Step controls
  const handleStepInto = async () => {
    if (!implementation || !isDebugging) return;
    setIsLoading(true);
    try {
      await implementation.stepInto();
      await updateDebugState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to step into');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepOver = async () => {
    if (!implementation || !isDebugging) return;
    setIsLoading(true);
    try {
      await implementation.stepOver();
      await updateDebugState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to step over');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepOut = async () => {
    if (!implementation || !isDebugging) return;
    setIsLoading(true);
    try {
      await implementation.stepOut();
      await updateDebugState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to step out');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!implementation || !isDebugging) return;
    setIsLoading(true);
    try {
      await implementation.continue();
      await updateDebugState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue');
    } finally {
      setIsLoading(false);
    }
  };

  // Breakpoint management
  const handleAddBreakpoint = async () => {
    if (!implementation || !newBreakpoint) return;
    const lineNumber = parseInt(newBreakpoint);
    if (isNaN(lineNumber) || lineNumber <= 0) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.addBreakpoint(lineNumber);
      await loadBreakpoints();
      setNewBreakpoint('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add breakpoint');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveBreakpoint = async (line: number) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      await implementation.removeBreakpoint(line);
      await loadBreakpoints();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove breakpoint');
    } finally {
      setIsLoading(false);
    }
  };

  // Expression evaluation
  const handleEvaluateExpression = async () => {
    if (!implementation || !isDebugging || !expression) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await implementation.evaluateExpression(expression);
      setEvaluationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate expression');
    } finally {
      setIsLoading(false);
    }
  };

  // Save configuration
  const handleSaveConfig = () => {
    if (!implementation) return;

    const config = {
      showLocalVariables,
      showStateVariables,
      showCallStack,
      showMemory,
      showStorage,
      autoBreakOnError,
    };

    updatePluginConfig(pluginId, config);
    setShowConfig(false);
  };

  return (
    <div className="h-full max-w-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Solidity Debugger
            </h2>
            {isDebugging && <Badge variant="secondary">Active</Badge>}
          </div>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="sm" onClick={() => setShowConfig(!showConfig)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                loadBreakpoints();
                updateDebugState();
              }}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Configuration Panel */}
        {showConfig && (
          <Card className={'bg-transparent p-1 shadow-none border-0'}>
            <CardHeader>
              <CardTitle className="text-sm">Debugger Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="local-vars"
                    checked={showLocalVariables}
                    onCheckedChange={setShowLocalVariables}
                  />
                  <Label htmlFor="local-vars" className="text-xs">
                    Local Variables
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="state-vars"
                    checked={showStateVariables}
                    onCheckedChange={setShowStateVariables}
                  />
                  <Label htmlFor="state-vars" className="text-xs">
                    State Variables
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="call-stack"
                    checked={showCallStack}
                    onCheckedChange={setShowCallStack}
                  />
                  <Label htmlFor="call-stack" className="text-xs">
                    Call Stack
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="memory" checked={showMemory} onCheckedChange={setShowMemory} />
                  <Label htmlFor="memory" className="text-xs">
                    Memory
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="storage" checked={showStorage} onCheckedChange={setShowStorage} />
                  <Label htmlFor="storage" className="text-xs">
                    Storage
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-break"
                    checked={autoBreakOnError}
                    onCheckedChange={setAutoBreakOnError}
                  />
                  <Label htmlFor="auto-break" className="text-xs">
                    Auto Break on Error
                  </Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveConfig}>
                  Save Configuration
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowConfig(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
            <Separator />
          </Card>
        )}

        {/* Debug Session Control */}
        <Card className={'bg-transparent p-0 shadow-none border-0'}>
          <CardHeader>
            <CardTitle className="text-sm">Debug Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-2">
            <div className="space-y-2">
              <Label htmlFor="tx-hash" className="text-xs">
                Transaction Hash
              </Label>
              <div className="flex gap-2">
                <Input
                  id="tx-hash"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  placeholder="Enter transaction hash to debug..."
                  disabled={isDebugging}
                  className="text-xs"
                />
                {!isDebugging ? (
                  <Button
                    onClick={handleStartDebugging}
                    disabled={isLoading || !transactionHash}
                    size="sm"
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </Button>
                ) : (
                  <Button
                    onClick={handleStopDebugging}
                    disabled={isLoading}
                    variant="destructive"
                    size="sm"
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop
                  </Button>
                )}
              </div>
            </div>

            {/* Step Controls */}
            {isDebugging && (
              <div className="space-y-2">
                <Label className="text-xs">Step Controls</Label>
                <div className="flex gap-2">
                  <Button onClick={handleStepInto} disabled={isLoading} size="sm" variant="outline">
                    <LucideArrowDownToDot className="h-4 w-4 mr-1" />
                    Into
                  </Button>
                  <Button onClick={handleStepOver} disabled={isLoading} size="sm" variant="outline">
                    <LucideBetweenHorizontalStart className="h-4 w-4 mr-1" />
                    Over
                  </Button>
                  <Button onClick={handleStepOut} disabled={isLoading} size="sm" variant="outline">
                    <LucideArrowUpFromDot className="h-4 w-4 mr-1" />
                    Out
                  </Button>
                  <Button onClick={handleContinue} disabled={isLoading} size="sm">
                    <SkipForward className="h-4 w-4 mr-1" />
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Breakpoints */}
        <Card className={'bg-transparent p-0 shadow-none border-0'}>
          <CardHeader>
            <CardTitle className="text-sm">Breakpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-2">
            <div className="flex gap-2">
              <Input
                value={newBreakpoint}
                onChange={(e) => setNewBreakpoint(e.target.value)}
                placeholder="Line number"
                type="number"
                min="1"
                className="text-xs"
              />
              <Button
                onClick={handleAddBreakpoint}
                disabled={isLoading || !newBreakpoint}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {breakpoints.length > 0 ? (
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {breakpoints.map((line) => (
                    <div
                      key={line}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="text-xs">Line {line}</span>
                      <Button
                        onClick={() => handleRemoveBreakpoint(line)}
                        disabled={isLoading}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground">No breakpoints set</p>
            )}
          </CardContent>
        </Card>

        {/* Debug State */}
        {isDebugging && debugState && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="debug-state">
              <AccordionTrigger className="text-sm">Debug State</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <Label>Current Line</Label>
                      <p className="font-mono">{debugState.currentLine || 'N/A'}</p>
                    </div>
                    <div>
                      <Label>Contract Address</Label>
                      <p className="font-mono text-xs break-all">
                        {debugState.contractAddress || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Local Variables */}
                  {showLocalVariables && debugState.localVariables && (
                    <div>
                      <Label className="text-xs">Local Variables</Label>
                      {Object.keys(debugState.localVariables).length > 0 ? (
                        <ScrollArea className="h-24 mt-2">
                          <div className="space-y-1">
                            {Object.entries(debugState.localVariables).map(([name, value]) => (
                              <div key={name} className="flex justify-between text-xs font-mono">
                                <span>{name}:</span>
                                <span className="text-muted-foreground">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-2">No local variables</p>
                      )}
                    </div>
                  )}

                  {/* State Variables */}
                  {showStateVariables && debugState.stateVariables && (
                    <div>
                      <Label className="text-xs">State Variables</Label>
                      {Object.keys(debugState.stateVariables).length > 0 ? (
                        <ScrollArea className="h-24 mt-2">
                          <div className="space-y-1">
                            {Object.entries(debugState.stateVariables).map(([name, value]) => (
                              <div key={name} className="flex justify-between text-xs font-mono">
                                <span>{name}:</span>
                                <span className="text-muted-foreground">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-2">No state variables</p>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Expression Evaluator */}
        {isDebugging && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Expression Evaluator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  placeholder="Enter expression to evaluate..."
                  className="text-xs"
                />
                <Button
                  onClick={handleEvaluateExpression}
                  disabled={isLoading || !expression}
                  size="sm"
                >
                  Evaluate
                </Button>
              </div>

              {evaluationResult !== null && (
                <div className="p-2 bg-muted rounded">
                  <Label className="text-xs">Result:</Label>
                  <p className="text-xs font-mono mt-1">{String(evaluationResult)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DebuggerPanel;
