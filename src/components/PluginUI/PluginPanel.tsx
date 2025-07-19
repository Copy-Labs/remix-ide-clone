import React, { useState, useMemo } from 'react';
import { usePluginStore } from '@/stores/pluginStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Search, Settings, Zap, Shield, Palette, Code, Bug, Rocket, GitBranch, TestTube } from 'lucide-react';
import CollaborationPluginUI from './CollaborationPluginUI';
import BackupPluginUI from './BackupPluginUI';
import CustomThemePluginUI from './CustomThemePluginUI';
import AnalysisPluginUI from './AnalysisPluginUI';
import DebuggerPluginUI from './DebuggerPluginUI';
import DeploymentPluginUI from './DeploymentPluginUI';
import GitPluginUI from './GitPluginUI';
import TestingPluginUI from './TestingPluginUI';

// Plugin icon mapping
const getPluginIcon = (pluginId: string) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    'collaboration': Zap,
    'backup-sync': Shield,
    'custom-theme-ui': Palette,
    'code-analysis': Code,
    'solidity-debugger': Bug,
    'deployment-automation': Rocket,
    'git-integration': GitBranch,
    'testing-framework': TestTube,
  };
  return iconMap[pluginId] || Settings;
};

const PluginPanel: React.FC = () => {
  const { plugins, enablePlugin, disablePlugin } = usePluginStore();
  const [activePluginId, setActivePluginId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Filter and search plugins
  const filteredPlugins = useMemo(() => {
    return plugins.filter((plugin) => {
      const matchesSearch = plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           plugin.author.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = filterStatus === 'all' ||
                           (filterStatus === 'enabled' && plugin.enabled) ||
                           (filterStatus === 'disabled' && !plugin.enabled);

      return matchesSearch && matchesFilter;
    });
  }, [plugins, searchQuery, filterStatus]);

  // Get plugin statistics
  const pluginStats = useMemo(() => {
    const total = plugins.length;
    const enabled = plugins.filter(p => p.enabled).length;
    const disabled = total - enabled;
    return { total, enabled, disabled };
  }, [plugins]);

  // Handle plugin selection
  const handlePluginSelect = (pluginId: string) => {
    setActivePluginId(pluginId === activePluginId ? null : pluginId);
  };

  // Toggle plugin enabled state
  const handleTogglePlugin = (pluginId: string, isCurrentlyEnabled: boolean) => {
    if (isCurrentlyEnabled) {
      disablePlugin(pluginId);
    } else {
      enablePlugin(pluginId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header Section */}
      <div className="border-b bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Plugin Manager</h1>
            <p className="text-muted-foreground">
              Manage and configure your development plugins
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {pluginStats.total} Total
            </Badge>
            <Badge variant="default" className="text-xs">
              {pluginStats.enabled} Active
            </Badge>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search plugins by name, description, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              All
            </Button>
            <Button
              variant={filterStatus === 'enabled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('enabled')}
            >
              Enabled
            </Button>
            <Button
              variant={filterStatus === 'disabled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('disabled')}
            >
              Disabled
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Plugin List Section */}
        <div className="w-1/2 border-r bg-card/50">
          <div className="p-4">
            {filteredPlugins.length === 0 ? (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No plugins found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try adjusting your search terms' : 'No plugins match the current filter'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlugins.map((plugin) => {
                  const IconComponent = getPluginIcon(plugin.id);
                  const isActive = activePluginId === plugin.id;

                  return (
                    <Card
                      key={plugin.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isActive ? 'ring-2 ring-primary shadow-md' : ''
                      } ${!plugin.enabled ? 'opacity-60' : ''}`}
                      onClick={() => plugin.enabled && handlePluginSelect(plugin.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              plugin.enabled 
                                ? 'bg-primary/10 text-primary' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{plugin.name}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant={plugin.enabled ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {plugin.enabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  v{plugin.version}
                                </span>
                              </div>
                            </div>
                          </div>
                          <CardAction>
                            <Switch
                              checked={plugin.enabled}
                              onCheckedChange={() => handleTogglePlugin(plugin.id, plugin.enabled)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </CardAction>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <CardDescription className="text-sm line-clamp-2">
                          {plugin.description}
                        </CardDescription>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <span className="text-xs text-muted-foreground">
                            by {plugin.author}
                          </span>
                          {plugin.enabled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePluginSelect(plugin.id);
                              }}
                            >
                              {isActive ? 'Hide' : 'Configure'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Plugin Content Section */}
        <div className="flex-1 bg-background">
          {activePluginId ? (
            <div className="h-full">
              {activePluginId === 'collaboration' && (
                <CollaborationPluginUI pluginId={activePluginId} />
              )}
              {activePluginId === 'backup-sync' && <BackupPluginUI pluginId={activePluginId} />}
              {activePluginId === 'custom-theme-ui' && (
                <CustomThemePluginUI pluginId={activePluginId} />
              )}
              {activePluginId === 'code-analysis' && (
                <AnalysisPluginUI pluginId={activePluginId} />
              )}
              {activePluginId === 'solidity-debugger' && (
                <DebuggerPluginUI pluginId={activePluginId} />
              )}
              {activePluginId === 'deployment-automation' && (
                <DeploymentPluginUI pluginId={activePluginId} />
              )}
              {activePluginId === 'git-integration' && (
                <GitPluginUI pluginId={activePluginId} />
              )}
              {activePluginId === 'testing-framework' && (
                <TestingPluginUI pluginId={activePluginId} />
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                  <Settings className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">
                  Select a Plugin to Configure
                </h3>
                <p className="text-muted-foreground mb-6">
                  Choose an enabled plugin from the list to view its configuration options and settings.
                </p>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Enable plugins using the toggle switches</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Click on enabled plugins to configure them</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PluginPanel;
