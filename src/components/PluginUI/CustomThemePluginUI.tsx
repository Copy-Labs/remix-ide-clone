import React, { useState, useEffect } from 'react';
import { usePluginStore } from '@/stores/pluginStore';
import { ThemePluginImplementation } from '@/plugins/themePlugin';

interface CustomThemePluginUIProps {
  pluginId: string;
}

const CustomThemePluginUI: React.FC<CustomThemePluginUIProps> = ({ pluginId }) => {
  const { getPlugin, updatePluginConfig } = usePluginStore();

  const [implementation, setImplementation] = useState<ThemePluginImplementation | null>(null);
  const [themes, setThemes] = useState<any[]>([]);
  const [layouts, setLayouts] = useState<any[]>([]);
  const [activeTheme, setActiveTheme] = useState<any>(null);
  const [activeLayout, setActiveLayout] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomTheme, setShowCustomTheme] = useState(false);
  const [showCustomLayout, setShowCustomLayout] = useState(false);
  const [showCustomCSS, setShowCustomCSS] = useState(false);

  // Theme form states
  const [selectedThemeId, setSelectedThemeId] = useState('default');
  const [customThemeName, setCustomThemeName] = useState('Custom Theme');

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

  // Layout form states
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
      setShowTabs(plugin.config.layout?.showTabs !== undefined ? plugin.config.layout.showTabs : true);
      setShowStatusBar(plugin.config.layout?.showStatusBar !== undefined ? plugin.config.layout.showStatusBar : true);
      setShowBreadcrumbs(plugin.config.layout?.showBreadcrumbs !== undefined ? plugin.config.layout.showBreadcrumbs : true);
      setCompactMode(plugin.config.layout?.compactMode !== undefined ? plugin.config.layout.compactMode : false);

      // Load animation settings
      setAnimationsEnabled(plugin.config.animations?.enabled !== undefined ? plugin.config.animations.enabled : true);
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
      // Get themes
      const themes = impl.getThemes();
      setThemes(themes);

      // Get active theme
      const activeTheme = impl.getActiveTheme();
      setActiveTheme(activeTheme);

      // Get layouts
      const layouts = impl.getLayouts();
      setLayouts(layouts);

      // Get active layout
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

      // Refresh theme data
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

      // Refresh layout data
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
      // Update custom theme in config
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

      // Update plugin config
      updatePluginConfig(pluginId, { customTheme });

      // Update implementation config
      implementation.updateConfig({ customTheme });

      // Apply custom theme
      handleApplyTheme('custom');

      setShowCustomTheme(false);
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
      // Update layout in config
      const layout = {
        sidebarPosition,
        sidebarWidth,
        showTabs,
        showStatusBar,
        showBreadcrumbs,
        compactMode,
      };

      // Update plugin config
      updatePluginConfig(pluginId, { layout });

      // Update implementation config
      implementation.updateConfig({ layout });

      // Apply custom layout
      handleApplyLayout('custom');

      setShowCustomLayout(false);
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
      // Update plugin config
      updatePluginConfig(pluginId, { customCSS });

      // Update implementation
      implementation.updateCustomCSS(customCSS);

      setShowCustomCSS(false);
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

      // Update plugin config
      updatePluginConfig(pluginId, { animations });

      // Update implementation
      implementation.updateAnimations(animationsEnabled, animationSpeed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update animations');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Custom Theme & UI</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {/* Theme Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Theme</h3>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4">
          <h4 className="font-medium mb-2">Select Theme</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {themes.map(theme => (
              <div
                key={theme.id}
                className={`p-3 rounded border cursor-pointer ${
                  selectedThemeId === theme.id 
                    ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-700' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => handleApplyTheme(theme.id)}
              >
                <h5 className="font-medium">{theme.name}</h5>
                <p className="text-sm text-gray-500 dark:text-gray-400">{theme.description}</p>
                <div className="mt-2 flex space-x-1">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors.primary }}></div>
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors.secondary }}></div>
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors.background }}></div>
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors.text }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <h4 className="font-medium">Customize Theme</h4>
            <button
              onClick={() => setShowCustomTheme(!showCustomTheme)}
              className="text-blue-500 hover:text-blue-700"
            >
              {showCustomTheme ? 'Hide' : 'Show'}
            </button>
          </div>

          {showCustomTheme && (
            <div className="mt-2 border-t pt-4">
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Theme Name</label>
                <input
                  type="text"
                  value={customThemeName}
                  onChange={(e) => setCustomThemeName(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>

              <h5 className="font-medium mb-2">Colors</h5>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Primary</label>
                  <div className="flex">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 p-0 border rounded-l"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 p-2 border-t border-r border-b rounded-r"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Secondary</label>
                  <div className="flex">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 p-0 border rounded-l"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 p-2 border-t border-r border-b rounded-r"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Background</label>
                  <div className="flex">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-10 h-10 p-0 border rounded-l"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1 p-2 border-t border-r border-b rounded-r"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Surface</label>
                  <div className="flex">
                    <input
                      type="color"
                      value={surfaceColor}
                      onChange={(e) => setSurfaceColor(e.target.value)}
                      className="w-10 h-10 p-0 border rounded-l"
                    />
                    <input
                      type="text"
                      value={surfaceColor}
                      onChange={(e) => setSurfaceColor(e.target.value)}
                      className="flex-1 p-2 border-t border-r border-b rounded-r"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Text</label>
                  <div className="flex">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-10 h-10 p-0 border rounded-l"
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="flex-1 p-2 border-t border-r border-b rounded-r"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Border</label>
                  <div className="flex">
                    <input
                      type="color"
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      className="w-10 h-10 p-0 border rounded-l"
                    />
                    <input
                      type="text"
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      className="flex-1 p-2 border-t border-r border-b rounded-r"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Error</label>
                  <div className="flex">
                    <input
                      type="color"
                      value={errorColor}
                      onChange={(e) => setErrorColor(e.target.value)}
                      className="w-10 h-10 p-0 border rounded-l"
                    />
                    <input
                      type="text"
                      value={errorColor}
                      onChange={(e) => setErrorColor(e.target.value)}
                      className="flex-1 p-2 border-t border-r border-b rounded-r"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Warning</label>
                  <div className="flex">
                    <input
                      type="color"
                      value={warningColor}
                      onChange={(e) => setWarningColor(e.target.value)}
                      className="w-10 h-10 p-0 border rounded-l"
                    />
                    <input
                      type="text"
                      value={warningColor}
                      onChange={(e) => setWarningColor(e.target.value)}
                      className="flex-1 p-2 border-t border-r border-b rounded-r"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Success</label>
                  <div className="flex">
                    <input
                      type="color"
                      value={successColor}
                      onChange={(e) => setSuccessColor(e.target.value)}
                      className="w-10 h-10 p-0 border rounded-l"
                    />
                    <input
                      type="text"
                      value={successColor}
                      onChange={(e) => setSuccessColor(e.target.value)}
                      className="flex-1 p-2 border-t border-r border-b rounded-r"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Info</label>
                  <div className="flex">
                    <input
                      type="color"
                      value={infoColor}
                      onChange={(e) => setInfoColor(e.target.value)}
                      className="w-10 h-10 p-0 border rounded-l"
                    />
                    <input
                      type="text"
                      value={infoColor}
                      onChange={(e) => setInfoColor(e.target.value)}
                      className="flex-1 p-2 border-t border-r border-b rounded-r"
                    />
                  </div>
                </div>
              </div>

              <h5 className="font-medium mb-2">Fonts</h5>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Main Font</label>
                  <input
                    type="text"
                    value={mainFont}
                    onChange={(e) => setMainFont(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Code Font</label>
                  <input
                    type="text"
                    value={codeFont}
                    onChange={(e) => setCodeFont(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Font Size (px)</label>
                  <input
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value) || 14)}
                    className="w-full p-2 border rounded"
                    min="10"
                    max="24"
                  />
                </div>
              </div>

              <h5 className="font-medium mb-2">Spacing</h5>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Unit (px)</label>
                  <input
                    type="number"
                    value={spacingUnit}
                    onChange={(e) => setSpacingUnit(parseInt(e.target.value) || 4)}
                    className="w-full p-2 border rounded"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Small (px)</label>
                  <input
                    type="number"
                    value={spacingSmall}
                    onChange={(e) => setSpacingSmall(parseInt(e.target.value) || 8)}
                    className="w-full p-2 border rounded"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Medium (px)</label>
                  <input
                    type="number"
                    value={spacingMedium}
                    onChange={(e) => setSpacingMedium(parseInt(e.target.value) || 16)}
                    className="w-full p-2 border rounded"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Large (px)</label>
                  <input
                    type="number"
                    value={spacingLarge}
                    onChange={(e) => setSpacingLarge(parseInt(e.target.value) || 24)}
                    className="w-full p-2 border rounded"
                    min="1"
                  />
                </div>
              </div>

              <h5 className="font-medium mb-2">Border Radius</h5>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Small (px)</label>
                  <input
                    type="number"
                    value={borderRadiusSmall}
                    onChange={(e) => setBorderRadiusSmall(parseInt(e.target.value) || 4)}
                    className="w-full p-2 border rounded"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Medium (px)</label>
                  <input
                    type="number"
                    value={borderRadiusMedium}
                    onChange={(e) => setBorderRadiusMedium(parseInt(e.target.value) || 8)}
                    className="w-full p-2 border rounded"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Large (px)</label>
                  <input
                    type="number"
                    value={borderRadiusLarge}
                    onChange={(e) => setBorderRadiusLarge(parseInt(e.target.value) || 12)}
                    className="w-full p-2 border rounded"
                    min="0"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveCustomTheme}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={isLoading}
              >
                Save Custom Theme
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Layout Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Layout</h3>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded mb-4">
          <h4 className="font-medium mb-2">Select Layout</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {layouts.map(layout => (
              <div
                key={layout.id}
                className={`p-3 rounded border cursor-pointer ${
                  selectedLayoutId === layout.id 
                    ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-700' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => handleApplyLayout(layout.id)}
              >
                <h5 className="font-medium">{layout.name}</h5>
                <p className="text-sm text-gray-500 dark:text-gray-400">{layout.description}</p>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <div>Sidebar: {layout.sidebarPosition}, {layout.sidebarWidth}px</div>
                  <div>
                    {layout.showTabs ? 'Tabs' : 'No Tabs'} •
                    {layout.showStatusBar ? ' Status Bar' : ' No Status Bar'} •
                    {layout.compactMode ? ' Compact' : ' Normal'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <h4 className="font-medium">Customize Layout</h4>
            <button
              onClick={() => setShowCustomLayout(!showCustomLayout)}
              className="text-blue-500 hover:text-blue-700"
            >
              {showCustomLayout ? 'Hide' : 'Show'}
            </button>
          </div>

          {showCustomLayout && (
            <div className="mt-2 border-t pt-4">
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Sidebar Position</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={sidebarPosition === 'left'}
                      onChange={() => setSidebarPosition('left')}
                      className="mr-2"
                    />
                    Left
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={sidebarPosition === 'right'}
                      onChange={() => setSidebarPosition('right')}
                      className="mr-2"
                    />
                    Right
                  </label>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Sidebar Width (px)</label>
                <input
                  type="number"
                  value={sidebarWidth}
                  onChange={(e) => setSidebarWidth(parseInt(e.target.value) || 280)}
                  className="w-full p-2 border rounded"
                  min="200"
                  max="500"
                />
              </div>

              <div className="mb-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showTabs}
                    onChange={(e) => setShowTabs(e.target.checked)}
                    className="mr-2"
                  />
                  Show Tabs
                </label>
              </div>

              <div className="mb-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showStatusBar}
                    onChange={(e) => setShowStatusBar(e.target.checked)}
                    className="mr-2"
                  />
                  Show Status Bar
                </label>
              </div>

              <div className="mb-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showBreadcrumbs}
                    onChange={(e) => setShowBreadcrumbs(e.target.checked)}
                    className="mr-2"
                  />
                  Show Breadcrumbs
                </label>
              </div>

              <div className="mb-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={compactMode}
                    onChange={(e) => setCompactMode(e.target.checked)}
                    className="mr-2"
                  />
                  Compact Mode
                </label>
              </div>

              <button
                onClick={handleSaveCustomLayout}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={isLoading}
              >
                Save Custom Layout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Animations</h3>
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
          <div className="mb-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={(e) => setAnimationsEnabled(e.target.checked)}
                className="mr-2"
              />
              Enable Animations
            </label>
          </div>

          {animationsEnabled && (
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Animation Speed</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={animationSpeed === 'slow'}
                    onChange={() => setAnimationSpeed('slow')}
                    className="mr-2"
                  />
                  Slow
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={animationSpeed === 'normal'}
                    onChange={() => setAnimationSpeed('normal')}
                    className="mr-2"
                  />
                  Normal
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={animationSpeed === 'fast'}
                    onChange={() => setAnimationSpeed('fast')}
                    className="mr-2"
                  />
                  Fast
                </label>
              </div>
            </div>
          )}

          <button
            onClick={handleUpdateAnimations}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={isLoading}
          >
            Update Animation Settings
          </button>
        </div>
      </div>

      {/* Custom CSS */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Custom CSS</h3>
          <button
            onClick={() => setShowCustomCSS(!showCustomCSS)}
            className="text-blue-500 hover:text-blue-700"
          >
            {showCustomCSS ? 'Hide' : 'Show'}
          </button>
        </div>

        {showCustomCSS && (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Add custom CSS to override the default styles. This CSS will be applied globally.
            </p>
            <textarea
              value={customCSS}
              onChange={(e) => setCustomCSS(e.target.value)}
              className="w-full p-2 border rounded font-mono text-sm"
              rows={10}
              placeholder="/* Add your custom CSS here */
.my-custom-class {
  color: red;
}"
            />
            <button
              onClick={handleSaveCustomCSS}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={isLoading}
            >
              Apply Custom CSS
            </button>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg">
            <p>Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomThemePluginUI;
