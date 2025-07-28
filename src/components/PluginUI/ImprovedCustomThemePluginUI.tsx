import React, { useState, useEffect } from 'react';
import { usePluginStore } from '@/stores/pluginStore';
import { ThemePluginImplementation } from '@/plugins/themePlugin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Palette,
  Layout,
  Settings,
  Code,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Eye,
  Save,
  RefreshCw,
} from 'lucide-react';

interface CustomThemePluginUIProps {
  pluginId: string;
}

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

const ColorInput: React.FC<ColorInputProps> = ({ label, value, onChange, description }) => (
  <div className="space-y-2">
    <Label htmlFor={`color-${label.toLowerCase()}`} className="text-sm font-medium">
      {label}
    </Label>
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
    <div className="flex gap-2">
      <div className="relative">
        <input
          id={`color-${label.toLowerCase()}`}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded-md border border-input cursor-pointer"
          aria-label={`${label} color picker`}
        />
      </div>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 font-mono text-sm"
        placeholder="#000000"
        aria-label={`${label} color value`}
      />
    </div>
  </div>
);

const ImprovedCustomThemePluginUI: React.FC<CustomThemePluginUIProps> = ({ pluginId }) => {
  const { getPlugin, updatePluginConfig } = usePluginStore();

  // Core state
  const [implementation, setImplementation] = useState<ThemePluginImplementation | null>(null);
  const [themes, setThemes] = useState<any[]>([]);
  const [layouts, setLayouts] = useState<any[]>([]);
  const [activeTheme, setActiveTheme] = useState<any>(null);
  const [activeLayout, setActiveLayout] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Theme states
  const [selectedThemeId, setSelectedThemeId] = useState('default');
  const [customThemeName, setCustomThemeName] = useState('Custom Theme');
  const [showPreview, setShowPreview] = useState(false);

  // Custom theme colors
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('#10B981');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [surfaceColor, setSurfaceColor] = useState('#F3F4F6');
  const [textColor, setTextColor] = useState('#1F2937');
  const [borderColor, setBorderColor] = useState('#E5E7EB');
  const [errorColor, setErrorColor] = useState('#EF4444');
  const [warningColor, setWarningColor] = useState('#F59E0B');
  const [successColor, setSuccessColor] = useState('#10B981');
  const [infoColor, setInfoColor] = useState('#3B82F6');

  // Custom theme fonts
  const [mainFont, setMainFont] = useState('Inter, sans-serif');
  const [codeFont, setCodeFont] = useState('JetBrains Mono, monospace');
  const [fontSize, setFontSize] = useState(14);

  // Custom theme spacing
  const [spacingUnit, setSpacingUnit] = useState(4);
  const [spacingSmall, setSpacingSmall] = useState(8);
  const [spacingMedium, setSpacingMedium] = useState(16);
  const [spacingLarge, setSpacingLarge] = useState(24);

  // Custom theme border radius
  const [borderRadiusSmall, setBorderRadiusSmall] = useState(4);
  const [borderRadiusMedium, setBorderRadiusMedium] = useState(8);
  const [borderRadiusLarge, setBorderRadiusLarge] = useState(12);

  // Layout states
  const [selectedLayoutId, setSelectedLayoutId] = useState('default');
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('left');
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [showTabs, setShowTabs] = useState(true);
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // Animation settings
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');

  // Custom CSS
  const [customCSS, setCustomCSS] = useState('');

  // Collapsible states
  const [isColorsOpen, setIsColorsOpen] = useState(true);
  const [isFontsOpen, setIsFontsOpen] = useState(false);
  const [isSpacingOpen, setIsSpacingOpen] = useState(false);
  const [isBorderRadiusOpen, setIsBorderRadiusOpen] = useState(false);

  // Initialize the implementation when the component mounts
  useEffect(() => {
    const plugin = getPlugin(pluginId);
    if (plugin) {
      const impl = new ThemePluginImplementation(plugin.config);
      setImplementation(impl);

      // Load themes and layouts
      loadThemeData(impl);

      // Load config values
      setSelectedThemeId(plugin.config.theme || 'default');
      setCustomThemeName(plugin.config.customTheme?.name || 'Custom Theme');

      // Load custom theme colors
      setPrimaryColor(plugin.config.customTheme?.colors?.primary || '#3B82F6');
      setSecondaryColor(plugin.config.customTheme?.colors?.secondary || '#10B981');
      setBackgroundColor(plugin.config.customTheme?.colors?.background || '#FFFFFF');
      setSurfaceColor(plugin.config.customTheme?.colors?.surface || '#F3F4F6');
      setTextColor(plugin.config.customTheme?.colors?.text || '#1F2937');
      setBorderColor(plugin.config.customTheme?.colors?.border || '#E5E7EB');
      setErrorColor(plugin.config.customTheme?.colors?.error || '#EF4444');
      setWarningColor(plugin.config.customTheme?.colors?.warning || '#F59E0B');
      setSuccessColor(plugin.config.customTheme?.colors?.success || '#10B981');
      setInfoColor(plugin.config.customTheme?.colors?.info || '#3B82F6');

      // Load custom theme fonts
      setMainFont(plugin.config.customTheme?.fonts?.main || 'Inter, sans-serif');
      setCodeFont(plugin.config.customTheme?.fonts?.code || 'JetBrains Mono, monospace');
      setFontSize(plugin.config.customTheme?.fonts?.size || 14);

      // Load custom theme spacing
      setSpacingUnit(plugin.config.customTheme?.spacing?.unit || 4);
      setSpacingSmall(plugin.config.customTheme?.spacing?.small || 8);
      setSpacingMedium(plugin.config.customTheme?.spacing?.medium || 16);
      setSpacingLarge(plugin.config.customTheme?.spacing?.large || 24);

      // Load custom theme border radius
      setBorderRadiusSmall(plugin.config.customTheme?.borderRadius?.small || 4);
      setBorderRadiusMedium(plugin.config.customTheme?.borderRadius?.medium || 8);
      setBorderRadiusLarge(plugin.config.customTheme?.borderRadius?.large || 12);

      // Load layout settings
      setSidebarPosition(plugin.config.layout?.sidebarPosition || 'left');
      setSidebarWidth(plugin.config.layout?.sidebarWidth || 280);
      setShowTabs(
        plugin.config.layout?.showTabs !== undefined ? plugin.config.layout.showTabs : true,
      );
      setShowStatusBar(
        plugin.config.layout?.showStatusBar !== undefined
          ? plugin.config.layout.showStatusBar
          : true,
      );
      setShowBreadcrumbs(
        plugin.config.layout?.showBreadcrumbs !== undefined
          ? plugin.config.layout.showBreadcrumbs
          : true,
      );
      setCompactMode(
        plugin.config.layout?.compactMode !== undefined ? plugin.config.layout.compactMode : false,
      );

      // Load animation settings
      setAnimationsEnabled(
        plugin.config.animations?.enabled !== undefined ? plugin.config.animations.enabled : true,
      );
      setAnimationSpeed(plugin.config.animations?.speed || 'normal');

      // Load custom CSS
      setCustomCSS(plugin.config.customCSS || '');
    }
  }, [pluginId, getPlugin]);

  // Load theme data
  const loadThemeData = (impl: ThemePluginImplementation | null = implementation) => {
    if (!impl) return;

    setIsLoading(true);
    setError(null);

    try {
      const themes = impl.getThemes();
      setThemes(themes);

      const activeTheme = impl.getActiveTheme();
      setActiveTheme(activeTheme);

      const layouts = impl.getLayouts();
      setLayouts(layouts);

      const activeLayout = impl.getActiveLayout();
      setActiveLayout(activeLayout);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load theme data');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply a theme
  const handleApplyTheme = (themeId: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      implementation.applyTheme(themeId);
      setSelectedThemeId(themeId);
      loadThemeData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to apply theme: ${themeId}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply a layout
  const handleApplyLayout = (layoutId: string) => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      implementation.applyLayout(layoutId);
      setSelectedLayoutId(layoutId);
      loadThemeData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to apply layout: ${layoutId}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Save custom theme
  const handleSaveCustomTheme = () => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      const customTheme = {
        name: customThemeName,
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          background: backgroundColor,
          surface: surfaceColor,
          text: textColor,
          border: borderColor,
          error: errorColor,
          warning: warningColor,
          success: successColor,
          info: infoColor,
        },
        fonts: {
          main: mainFont,
          code: codeFont,
          size: fontSize,
        },
        spacing: {
          unit: spacingUnit,
          small: spacingSmall,
          medium: spacingMedium,
          large: spacingLarge,
        },
        borderRadius: {
          small: borderRadiusSmall,
          medium: borderRadiusMedium,
          large: borderRadiusLarge,
        },
      };

      updatePluginConfig(pluginId, { customTheme });
      implementation.updateConfig({ customTheme });
      handleApplyTheme('custom');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save custom theme');
    } finally {
      setIsLoading(false);
    }
  };

  // Save custom layout
  const handleSaveCustomLayout = () => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      const layout = {
        sidebarPosition,
        sidebarWidth,
        showTabs,
        showStatusBar,
        showBreadcrumbs,
        compactMode,
      };

      updatePluginConfig(pluginId, { layout });
      implementation.updateConfig({ layout });
      handleApplyLayout('custom');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save custom layout');
    } finally {
      setIsLoading(false);
    }
  };

  // Save custom CSS
  const handleSaveCustomCSS = () => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      updatePluginConfig(pluginId, { customCSS });
      implementation.updateCustomCSS(customCSS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save custom CSS');
    } finally {
      setIsLoading(false);
    }
  };

  // Update animation settings
  const handleUpdateAnimations = () => {
    if (!implementation) return;

    setIsLoading(true);
    setError(null);

    try {
      const animations = {
        enabled: animationsEnabled,
        speed: animationSpeed,
      };

      updatePluginConfig(pluginId, { animations });
      implementation.updateAnimations(animationsEnabled, animationSpeed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update animations');
    } finally {
      setIsLoading(false);
    }
  };

  const colorInputs = [
    {
      label: 'Primary',
      value: primaryColor,
      onChange: setPrimaryColor,
      description: 'Main brand color',
    },
    {
      label: 'Secondary',
      value: secondaryColor,
      onChange: setSecondaryColor,
      description: 'Accent color',
    },
    {
      label: 'Background',
      value: backgroundColor,
      onChange: setBackgroundColor,
      description: 'Main background',
    },
    {
      label: 'Surface',
      value: surfaceColor,
      onChange: setSurfaceColor,
      description: 'Card backgrounds',
    },
    { label: 'Text', value: textColor, onChange: setTextColor, description: 'Primary text color' },
    {
      label: 'Border',
      value: borderColor,
      onChange: setBorderColor,
      description: 'Border and dividers',
    },
    { label: 'Error', value: errorColor, onChange: setErrorColor, description: 'Error states' },
    {
      label: 'Warning',
      value: warningColor,
      onChange: setWarningColor,
      description: 'Warning states',
    },
    {
      label: 'Success',
      value: successColor,
      onChange: setSuccessColor,
      description: 'Success states',
    },
    { label: 'Info', value: infoColor, onChange: setInfoColor, description: 'Information states' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Theme Customization</h1>
            <p className="text-sm text-muted-foreground">
              Customize your IDE's appearance and layout
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadThemeData()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="m-6 mb-0">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs defaultValue="themes" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="themes" className="gap-2">
                <Palette className="h-4 w-4" />
                Themes
              </TabsTrigger>
              <TabsTrigger value="layout" className="gap-2">
                <Layout className="h-4 w-4" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="animations" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Animations
              </TabsTrigger>
              <TabsTrigger value="css" className="gap-2">
                <Code className="h-4 w-4" />
                Custom CSS
              </TabsTrigger>
            </TabsList>

            <TabsContent value="themes" className="space-y-6">
              {/* Built-in Themes */}
              <Card>
                <CardHeader>
                  <CardTitle>Built-in Themes</CardTitle>
                  <CardDescription>Choose from our pre-designed themes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {themes.map((theme) => (
                      <Card
                        key={theme.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedThemeId === theme.id
                            ? 'ring-2 ring-primary shadow-md'
                            : 'hover:shadow-sm'
                        }`}
                        onClick={() => handleApplyTheme(theme.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">{theme.name}</h4>
                            {selectedThemeId === theme.id && (
                              <Badge variant="default">Active</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{theme.description}</p>
                          <div className="flex gap-1">
                            {Object.entries(theme.colors)
                              .slice(0, 4)
                              .map(([key, color]) => (
                                <div
                                  key={key}
                                  className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                                  style={{ backgroundColor: color as string }}
                                  title={`${key}: ${color}`}
                                />
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Custom Theme */}
              <Card>
                <CardHeader>
                  <CardTitle>Custom Theme</CardTitle>
                  <CardDescription>Create your own personalized theme</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="theme-name">Theme Name</Label>
                    <Input
                      id="theme-name"
                      value={customThemeName}
                      onChange={(e) => setCustomThemeName(e.target.value)}
                      placeholder="Enter theme name"
                    />
                  </div>

                  {/* Colors Section */}
                  <Collapsible open={isColorsOpen} onOpenChange={setIsColorsOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                        <h4 className="text-lg font-semibold">Colors</h4>
                        {isColorsOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {colorInputs.map((colorInput) => (
                          <ColorInput key={colorInput.label} {...colorInput} />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {/* Fonts Section */}
                  <Collapsible open={isFontsOpen} onOpenChange={setIsFontsOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                        <h4 className="text-lg font-semibold">Typography</h4>
                        {isFontsOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="main-font">Main Font</Label>
                          <Input
                            id="main-font"
                            value={mainFont}
                            onChange={(e) => setMainFont(e.target.value)}
                            placeholder="Inter, sans-serif"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="code-font">Code Font</Label>
                          <Input
                            id="code-font"
                            value={codeFont}
                            onChange={(e) => setCodeFont(e.target.value)}
                            placeholder="JetBrains Mono, monospace"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="font-size">Font Size (px)</Label>
                          <Input
                            id="font-size"
                            type="number"
                            value={fontSize}
                            onChange={(e) => setFontSize(parseInt(e.target.value) || 14)}
                            min="10"
                            max="24"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {/* Spacing Section */}
                  <Collapsible open={isSpacingOpen} onOpenChange={setIsSpacingOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                        <h4 className="text-lg font-semibold">Spacing</h4>
                        {isSpacingOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="spacing-unit">Unit (px)</Label>
                          <Input
                            id="spacing-unit"
                            type="number"
                            value={spacingUnit}
                            onChange={(e) => setSpacingUnit(parseInt(e.target.value) || 4)}
                            min="1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="spacing-small">Small (px)</Label>
                          <Input
                            id="spacing-small"
                            type="number"
                            value={spacingSmall}
                            onChange={(e) => setSpacingSmall(parseInt(e.target.value) || 8)}
                            min="1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="spacing-medium">Medium (px)</Label>
                          <Input
                            id="spacing-medium"
                            type="number"
                            value={spacingMedium}
                            onChange={(e) => setSpacingMedium(parseInt(e.target.value) || 16)}
                            min="1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="spacing-large">Large (px)</Label>
                          <Input
                            id="spacing-large"
                            type="number"
                            value={spacingLarge}
                            onChange={(e) => setSpacingLarge(parseInt(e.target.value) || 24)}
                            min="1"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {/* Border Radius Section */}
                  <Collapsible open={isBorderRadiusOpen} onOpenChange={setIsBorderRadiusOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                        <h4 className="text-lg font-semibold">Border Radius</h4>
                        {isBorderRadiusOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="border-radius-small">Small (px)</Label>
                          <Input
                            id="border-radius-small"
                            type="number"
                            value={borderRadiusSmall}
                            onChange={(e) => setBorderRadiusSmall(parseInt(e.target.value) || 4)}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="border-radius-medium">Medium (px)</Label>
                          <Input
                            id="border-radius-medium"
                            type="number"
                            value={borderRadiusMedium}
                            onChange={(e) => setBorderRadiusMedium(parseInt(e.target.value) || 8)}
                            min="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="border-radius-large">Large (px)</Label>
                          <Input
                            id="border-radius-large"
                            type="number"
                            value={borderRadiusLarge}
                            onChange={(e) => setBorderRadiusLarge(parseInt(e.target.value) || 12)}
                            min="0"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveCustomTheme} disabled={isLoading} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save Custom Theme
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="layout" className="space-y-6">
              {/* Built-in Layouts */}
              <Card>
                <CardHeader>
                  <CardTitle>Built-in Layouts</CardTitle>
                  <CardDescription>Choose from our pre-configured layouts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {layouts.map((layout) => (
                      <Card
                        key={layout.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedLayoutId === layout.id
                            ? 'ring-2 ring-primary shadow-md'
                            : 'hover:shadow-sm'
                        }`}
                        onClick={() => handleApplyLayout(layout.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">{layout.name}</h4>
                            {selectedLayoutId === layout.id && (
                              <Badge variant="default">Active</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{layout.description}</p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>
                              Sidebar: {layout.sidebarPosition}, {layout.sidebarWidth}px
                            </div>
                            <div className="flex gap-2">
                              {layout.showTabs && (
                                <Badge variant="secondary" className="text-xs">
                                  Tabs
                                </Badge>
                              )}
                              {layout.showStatusBar && (
                                <Badge variant="secondary" className="text-xs">
                                  Status Bar
                                </Badge>
                              )}
                              {layout.compactMode && (
                                <Badge variant="secondary" className="text-xs">
                                  Compact
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Custom Layout */}
              <Card>
                <CardHeader>
                  <CardTitle>Custom Layout</CardTitle>
                  <CardDescription>Configure your preferred layout settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label>Sidebar Position</Label>
                        <Select
                          value={sidebarPosition}
                          onValueChange={(value: 'left' | 'right') => setSidebarPosition(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="sidebar-width">Sidebar Width (px)</Label>
                        <Input
                          id="sidebar-width"
                          type="number"
                          value={sidebarWidth}
                          onChange={(e) => setSidebarWidth(parseInt(e.target.value) || 280)}
                          min="200"
                          max="500"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-tabs">Show Tabs</Label>
                        <Switch id="show-tabs" checked={showTabs} onCheckedChange={setShowTabs} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-status-bar">Show Status Bar</Label>
                        <Switch
                          id="show-status-bar"
                          checked={showStatusBar}
                          onCheckedChange={setShowStatusBar}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="show-breadcrumbs">Show Breadcrumbs</Label>
                        <Switch
                          id="show-breadcrumbs"
                          checked={showBreadcrumbs}
                          onCheckedChange={setShowBreadcrumbs}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="compact-mode">Compact Mode</Label>
                        <Switch
                          id="compact-mode"
                          checked={compactMode}
                          onCheckedChange={setCompactMode}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveCustomLayout} disabled={isLoading} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save Custom Layout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="animations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Animation Settings</CardTitle>
                  <CardDescription>Configure animations and transitions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="animations-enabled">Enable Animations</Label>
                      <p className="text-sm text-muted-foreground">
                        Turn on/off all animations and transitions
                      </p>
                    </div>
                    <Switch
                      id="animations-enabled"
                      checked={animationsEnabled}
                      onCheckedChange={setAnimationsEnabled}
                    />
                  </div>

                  {animationsEnabled && (
                    <div className="space-y-3">
                      <Label>Animation Speed</Label>
                      <Select
                        value={animationSpeed}
                        onValueChange={(value: 'slow' | 'normal' | 'fast') =>
                          setAnimationSpeed(value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="slow">Slow</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="fast">Fast</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleUpdateAnimations} disabled={isLoading} className="gap-2">
                      <Settings className="h-4 w-4" />
                      Update Animation Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="css" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Custom CSS</CardTitle>
                  <CardDescription>Add custom CSS to override default styles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom-css">CSS Code</Label>
                    <textarea
                      id="custom-css"
                      value={customCSS}
                      onChange={(e) => setCustomCSS(e.target.value)}
                      className="w-full h-64 p-3 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="/* Add your custom CSS here */
.my-custom-class {
  color: red;
  background: blue;
}"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveCustomCSS} disabled={isLoading} className="gap-2">
                      <Code className="h-4 w-4" />
                      Apply Custom CSS
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <p>Processing...</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ImprovedCustomThemePluginUI;
