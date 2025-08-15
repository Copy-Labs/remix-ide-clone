import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Coins, FileCode, Trash2, Copy, ChevronRight, Sparkles } from 'lucide-react';
import { tokenCreatorPlugin } from '@/plugins/tokenCreatorPlugin';
import { useFileStore } from '@/stores/fileStore';

interface TokenTemplate {
  id: string;
  name: string;
  description: string;
  standard: 'ERC-20' | 'ERC-721' | 'ERC-1155' | 'Custom';
  features: string[];
  template: string;
  constructor: {
    name: string;
    type: string;
    description: string;
    required: boolean;
    default?: any;
  }[];
}

interface TokenConfig {
  templateId: string;
  name: string;
  symbol: string;
  decimals?: number;
  totalSupply?: string;
  maxSupply?: string;
  mintable?: boolean;
  burnable?: boolean;
  pausable?: boolean;
  ownable?: boolean;
  permit?: boolean;
  snapshot?: boolean;
  votes?: boolean;
  flashMinting?: boolean;
  customFeatures?: string[];
}

interface GeneratedToken {
  id: string;
  name: string;
  filename: string;
  sourceCode: string;
  abi: any[];
  config: TokenConfig;
  createdAt: Date;
}

const TokenCreatorPluginUI: React.FC = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [selectedTemplate, setSelectedTemplate] = useState<TokenTemplate | null>(null);
  const [tokenConfig, setTokenConfig] = useState<TokenConfig>({
    templateId: '',
    name: '',
    symbol: '',
    decimals: 18,
    totalSupply: '1000000',
  });
  const [templates, setTemplates] = useState<TokenTemplate[]>([]);
  const [generatedTokens, setGeneratedTokens] = useState<GeneratedToken[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewCode, setPreviewCode] = useState('');

  const { createFile, openFile } = useFileStore();

  useEffect(() => {
    // Load templates and generated tokens
    const loadedTemplates = (tokenCreatorPlugin as any).getTemplates();
    const loadedTokens = (tokenCreatorPlugin as any).getGeneratedTokens();
    setTemplates(loadedTemplates);
    setGeneratedTokens(loadedTokens);
  }, []);

  useEffect(() => {
    // Update preview when template or config changes
    if (selectedTemplate) {
      try {
        const preview = selectedTemplate.template.replace(
          /{{TOKEN_NAME}}/g,
          tokenConfig.name.replace(/[^a-zA-Z0-9]/g, '') || 'TokenName',
        );
        setPreviewCode(preview);
      } catch {
        setPreviewCode('// Error generating preview');
      }
    } else {
      setPreviewCode('// Select a template to see preview');
    }
  }, [selectedTemplate, tokenConfig]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setTokenConfig((prev) => ({
        ...prev,
        templateId,
      }));
    }
  };

  const handleConfigChange = (field: keyof TokenConfig, value: any) => {
    setTokenConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const generateToken = async () => {
    if (!selectedTemplate || !tokenConfig.name || !tokenConfig.symbol) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);
    try {
      const generatedToken = (tokenCreatorPlugin as any).generateToken(tokenConfig);
      setGeneratedTokens((prev) => [...prev, generatedToken]);

      // Create file in the editor
      const contractPath = `/contracts/tokens/${generatedToken.filename}`;
      void createFile(contractPath, generatedToken.sourceCode);

      toast.success(`Token "${tokenConfig.name}" generated successfully!`);

      // Reset form
      setTokenConfig({
        templateId: '',
        name: '',
        symbol: '',
        decimals: 18,
        totalSupply: '1000000',
      });
      setSelectedTemplate(null);
      setActiveTab('library');
    } catch (error) {
      toast.error(`Failed to generate token: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const openTokenInEditor = (token: GeneratedToken) => {
    const contractPath = `/contracts/tokens/${token.filename}`;
    void openFile(contractPath);
    toast.success(`Opened ${token.name} in editor`);
  };

  const copyTokenCode = (token: GeneratedToken) => {
    void navigator.clipboard.writeText(token.sourceCode);
    toast.success('Token code copied to clipboard');
  };

  const deleteToken = (tokenId: string) => {
    if ((tokenCreatorPlugin as any).deleteGeneratedToken(tokenId)) {
      setGeneratedTokens((prev) => prev.filter((t) => t.id !== tokenId));
      toast.success('Token deleted successfully');
    } else {
      toast.error('Failed to delete token');
    }
  };

  const getStandardColor = (standard: string) => {
    switch (standard) {
      case 'ERC-20': return 'bg-blue-100 text-blue-800';
      case 'ERC-721': return 'bg-green-100 text-green-800';
      case 'ERC-1155': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <Coins className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Token Creator</h2>
        <Badge variant="secondary">v1.0.0</Badge>
      </div>

      <p className="text-muted-foreground">
        Create customized tokens with various standards and features, similar to createmytoken.com
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Token</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="library">Token Library</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Template</CardTitle>
                <CardDescription>Choose a token standard and template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="h-240">
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'bg-primary/5 border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-semibold">{template.name}</h4>
                                <Badge className={getStandardColor(template.standard)}>
                                  {template.standard}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {template.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {template.features.slice(0, 3).map((feature) => (
                                  <Badge key={feature} variant="outline" className="text-xs">
                                    {feature}
                                  </Badge>
                                ))}
                                {template.features.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{template.features.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {selectedTemplate?.id === template.id && (
                              <ChevronRight className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Token Configuration</CardTitle>
                <CardDescription>Configure your token parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedTemplate ? (
                  <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      Select a template first to configure your token
                    </AlertDescription>
                  </Alert>
                ) : (
                  <ScrollArea className="h-80">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="token-name">Token Name *</Label>
                        <Input
                          id="token-name"
                          placeholder="e.g., My Awesome Token"
                          value={tokenConfig.name}
                          onChange={(e) => handleConfigChange('name', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="token-symbol">Token Symbol *</Label>
                        <Input
                          id="token-symbol"
                          placeholder="e.g., MAT"
                          value={tokenConfig.symbol}
                          onChange={(e) => handleConfigChange('symbol', e.target.value.toUpperCase())}
                        />
                      </div>

                      {selectedTemplate.constructor.map((param) => {
                        if (param.name === 'name' || param.name === 'symbol') return null;

                        return (
                          <div key={param.name} className="space-y-2">
                            <Label htmlFor={param.name}>
                              {param.description} {param.required && '*'}
                            </Label>
                            {param.type === 'uint256' || param.type === 'uint8' ? (
                              <Input
                                id={param.name}
                                type="number"
                                placeholder={param.default?.toString() || ''}
                                value={(tokenConfig as any)[param.name] || param.default || ''}
                                onChange={(e) => handleConfigChange(param.name as keyof TokenConfig, e.target.value)}
                              />
                            ) : (
                              <Input
                                id={param.name}
                                placeholder={param.default || ''}
                                value={(tokenConfig as any)[param.name] || param.default || ''}
                                onChange={(e) => handleConfigChange(param.name as keyof TokenConfig, e.target.value)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  onClick={() => void generateToken()}
                  disabled={!selectedTemplate || !tokenConfig.name || !tokenConfig.symbol || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? 'Generating...' : 'Generate Token'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Code Preview</CardTitle>
              <CardDescription>
                Preview of the generated Solidity contract
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={previewCode}
                readOnly
                className="font-mono text-sm min-h-[400px]"
                placeholder="Select a template and configure parameters to see preview"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Generated Tokens</h3>
              <p className="text-sm text-muted-foreground">
                Manage your created tokens
              </p>
            </div>
            <Badge variant="secondary">
              {generatedTokens.length} token{generatedTokens.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          <ScrollArea className="h-96">
            <div className="space-y-3">
              {generatedTokens.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <FileCode className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No tokens generated yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create your first token to see it here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                generatedTokens.map((token) => (
                  <Card key={token.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold">{token.name}</h4>
                            <Badge className={getStandardColor(token.config.templateId.split('-')[0].toUpperCase())}>
                              {token.config.templateId.split('-')[0].toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Symbol: {token.config.symbol} | File: {token.filename}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {token.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openTokenInEditor(token)}
                          >
                            <FileCode className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyTokenCode(token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteToken(token.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TokenCreatorPluginUI;
