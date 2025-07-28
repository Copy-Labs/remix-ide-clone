import type { Plugin, PluginConfig } from '@/types';

/**
 * Custom theme and UI plugin for Remix IDE Clone
 * Provides functionality for customizing the IDE's appearance and user interface,
 * including themes, layouts, and UI components.
 */
export const themePlugin: Omit<Plugin, 'api'> = {
  id: 'custom-theme-ui',
  name: 'Custom Theme & UI',
  version: '1.0.0',
  description: 'Customize the appearance and user interface of the IDE',
  author: 'Remix IDE Clone Team',
  enabled: false,
  config: {
    theme: 'default', // default, dark, light, custom
    customTheme: {
      name: 'Custom Theme',
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        background: '#FFFFFF',
        surface: '#F3F4F6',
        text: '#1F2937',
        border: '#E5E7EB',
        error: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#3B82F6',
      },
      fonts: {
        main: 'Inter, sans-serif',
        code: 'JetBrains Mono, monospace',
        size: 14,
      },
      spacing: {
        unit: 4,
        small: 8,
        medium: 16,
        large: 24,
      },
      borderRadius: {
        small: 4,
        medium: 8,
        large: 12,
      },
    },
    layout: {
      sidebarPosition: 'left', // left, right
      sidebarWidth: 280,
      showTabs: true,
      showStatusBar: true,
      showBreadcrumbs: true,
      compactMode: false,
    },
    animations: {
      enabled: true,
      speed: 'normal', // slow, normal, fast
    },
    customCSS: '',
  },
};

/**
 * Theme interface
 */
interface Theme {
  id: string;
  name: string;
  description: string;
  author: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  isBuiltIn: boolean;
}

/**
 * Theme colors interface
 */
interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  [key: string]: string;
}

/**
 * Theme fonts interface
 */
interface ThemeFonts {
  main: string;
  code: string;
  size: number;
}

/**
 * Theme spacing interface
 */
interface ThemeSpacing {
  unit: number;
  small: number;
  medium: number;
  large: number;
}

/**
 * Theme border radius interface
 */
interface ThemeBorderRadius {
  small: number;
  medium: number;
  large: number;
}

/**
 * Layout interface
 */
interface Layout {
  id: string;
  name: string;
  description: string;
  sidebarPosition: 'left' | 'right';
  sidebarWidth: number;
  showTabs: boolean;
  showStatusBar: boolean;
  showBreadcrumbs: boolean;
  compactMode: boolean;
  isBuiltIn: boolean;
}

/**
 * Custom theme and UI plugin functionality
 * This would be implemented with real theme and UI customization in a production environment
 */
export class ThemePluginImplementation {
  private config: PluginConfig;
  private themes: Map<string, Theme> = new Map();
  private layouts: Map<string, Layout> = new Map();
  private activeTheme: string;
  private activeLayout: string;
  private styleElement: HTMLStyleElement | null = null;

  constructor(config: PluginConfig) {
    // Create a deep copy of the config to avoid readonly property issues
    this.config = JSON.parse(JSON.stringify(config));
    this.activeTheme = config.theme || 'default';
    this.activeLayout = 'default';

    // Initialize built-in themes
    this.initializeBuiltInThemes();

    // Initialize built-in layouts
    this.initializeBuiltInLayouts();

    // Apply the active theme and layout
    this.applyTheme(this.activeTheme);
    this.applyLayout(this.activeLayout);
  }

  /**
   * Initialize built-in themes
   */
  private initializeBuiltInThemes(): void {
    // Default theme
    this.themes.set('default', {
      id: 'default',
      name: 'Default',
      description: 'The default theme for Remix IDE Clone',
      author: 'Remix IDE Clone Team',
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        background: '#FFFFFF',
        surface: '#F3F4F6',
        text: '#1F2937',
        border: '#E5E7EB',
        error: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#3B82F6',
      },
      fonts: {
        main: 'Inter, sans-serif',
        code: 'JetBrains Mono, monospace',
        size: 14,
      },
      spacing: {
        unit: 4,
        small: 8,
        medium: 16,
        large: 24,
      },
      borderRadius: {
        small: 4,
        medium: 8,
        large: 12,
      },
      isBuiltIn: true,
    });

    // Dark theme
    this.themes.set('dark', {
      id: 'dark',
      name: 'Dark',
      description: 'A dark theme for Remix IDE Clone',
      author: 'Remix IDE Clone Team',
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        background: '#1F2937',
        surface: '#374151',
        text: '#F9FAFB',
        border: '#4B5563',
        error: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#3B82F6',
      },
      fonts: {
        main: 'Inter, sans-serif',
        code: 'JetBrains Mono, monospace',
        size: 14,
      },
      spacing: {
        unit: 4,
        small: 8,
        medium: 16,
        large: 24,
      },
      borderRadius: {
        small: 4,
        medium: 8,
        large: 12,
      },
      isBuiltIn: true,
    });

    // Light theme
    this.themes.set('light', {
      id: 'light',
      name: 'Light',
      description: 'A light theme for Remix IDE Clone',
      author: 'Remix IDE Clone Team',
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        background: '#F9FAFB',
        surface: '#FFFFFF',
        text: '#1F2937',
        border: '#E5E7EB',
        error: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#3B82F6',
      },
      fonts: {
        main: 'Inter, sans-serif',
        code: 'JetBrains Mono, monospace',
        size: 14,
      },
      spacing: {
        unit: 4,
        small: 8,
        medium: 16,
        large: 24,
      },
      borderRadius: {
        small: 4,
        medium: 8,
        large: 12,
      },
      isBuiltIn: true,
    });

    // Custom theme
    this.themes.set('custom', {
      id: 'custom',
      name: this.config.customTheme.name,
      description: 'A custom theme',
      author: 'User',
      colors: this.config.customTheme.colors,
      fonts: this.config.customTheme.fonts,
      spacing: this.config.customTheme.spacing,
      borderRadius: this.config.customTheme.borderRadius,
      isBuiltIn: false,
    });
  }

  /**
   * Initialize built-in layouts
   */
  private initializeBuiltInLayouts(): void {
    // Default layout
    this.layouts.set('default', {
      id: 'default',
      name: 'Default',
      description: 'The default layout for Remix IDE Clone',
      sidebarPosition: 'left',
      sidebarWidth: 280,
      showTabs: true,
      showStatusBar: true,
      showBreadcrumbs: true,
      compactMode: false,
      isBuiltIn: true,
    });

    // Compact layout
    this.layouts.set('compact', {
      id: 'compact',
      name: 'Compact',
      description: 'A compact layout with smaller UI elements',
      sidebarPosition: 'left',
      sidebarWidth: 220,
      showTabs: true,
      showStatusBar: false,
      showBreadcrumbs: false,
      compactMode: true,
      isBuiltIn: true,
    });

    // Expanded layout
    this.layouts.set('expanded', {
      id: 'expanded',
      name: 'Expanded',
      description: 'An expanded layout with larger UI elements',
      sidebarPosition: 'left',
      sidebarWidth: 320,
      showTabs: true,
      showStatusBar: true,
      showBreadcrumbs: true,
      compactMode: false,
      isBuiltIn: true,
    });

    // Right sidebar layout
    this.layouts.set('right-sidebar', {
      id: 'right-sidebar',
      name: 'Right Sidebar',
      description: 'A layout with the sidebar on the right',
      sidebarPosition: 'right',
      sidebarWidth: 280,
      showTabs: true,
      showStatusBar: true,
      showBreadcrumbs: true,
      compactMode: false,
      isBuiltIn: true,
    });

    // Custom layout
    this.layouts.set('custom', {
      id: 'custom',
      name: 'Custom',
      description: 'A custom layout',
      sidebarPosition: this.config.layout.sidebarPosition,
      sidebarWidth: this.config.layout.sidebarWidth,
      showTabs: this.config.layout.showTabs,
      showStatusBar: this.config.layout.showStatusBar,
      showBreadcrumbs: this.config.layout.showBreadcrumbs,
      compactMode: this.config.layout.compactMode,
      isBuiltIn: false,
    });
  }

  /**
   * Get all themes
   */
  getThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  /**
   * Get a theme by ID
   * @param themeId Theme ID
   */
  getTheme(themeId: string): Theme | undefined {
    return this.themes.get(themeId);
  }

  /**
   * Get the active theme
   */
  getActiveTheme(): Theme | undefined {
    return this.themes.get(this.activeTheme);
  }

  /**
   * Apply a theme
   * @param themeId Theme ID
   */
  applyTheme(themeId: string): boolean {
    const theme = this.themes.get(themeId);
    if (!theme) {
      console.error(`Theme ${themeId} not found`);
      return false;
    }

    console.log(`Applying theme: ${theme.name} (${themeId})`);

    // In a real implementation, this would apply the theme to the UI
    // This is a mock implementation that simulates theme application

    // Update active theme
    this.activeTheme = themeId;

    // Update config
    this.config.theme = themeId;

    // Apply CSS variables
    this.applyThemeCSS(theme);

    return true;
  }

  /**
   * Apply theme CSS variables
   * @param theme Theme to apply
   */
  private applyThemeCSS(theme: Theme): void {
    // Create or get the style element
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'remix-ide-theme';
      document.head.appendChild(this.styleElement);
    }

    // Generate CSS variables
    const css = `
      :root {
        /* Colors */
        --color-primary: ${theme.colors.primary};
        --color-secondary: ${theme.colors.secondary};
        --color-background: ${theme.colors.background};
        --color-surface: ${theme.colors.surface};
        --color-text: ${theme.colors.text};
        --color-border: ${theme.colors.border};
        --color-error: ${theme.colors.error};
        --color-warning: ${theme.colors.warning};
        --color-success: ${theme.colors.success};
        --color-info: ${theme.colors.info};

        /* Fonts */
        --font-main: ${theme.fonts.main};
        --font-code: ${theme.fonts.code};
        --font-size: ${theme.fonts.size}px;

        /* Spacing */
        --spacing-unit: ${theme.spacing.unit}px;
        --spacing-small: ${theme.spacing.small}px;
        --spacing-medium: ${theme.spacing.medium}px;
        --spacing-large: ${theme.spacing.large}px;

        /* Border Radius */
        --border-radius-small: ${theme.borderRadius.small}px;
        --border-radius-medium: ${theme.borderRadius.medium}px;
        --border-radius-large: ${theme.borderRadius.large}px;
      }

      /* Custom CSS */
      ${this.config.customCSS}
    `;

    // Apply CSS
    this.styleElement.textContent = css;
  }

  /**
   * Create a new theme
   * @param theme Theme data
   */
  createTheme(theme: Omit<Theme, 'id' | 'isBuiltIn'>): Theme {
    const themeId = 'theme-' + Math.random().toString(36).substring(2, 9);

    const newTheme: Theme = {
      id: themeId,
      ...theme,
      isBuiltIn: false,
    };

    this.themes.set(themeId, newTheme);
    console.log(`Created theme: ${newTheme.name} (${themeId})`);

    return newTheme;
  }

  /**
   * Update a theme
   * @param themeId Theme ID
   * @param updates Theme updates
   */
  updateTheme(themeId: string, updates: Partial<Omit<Theme, 'id' | 'isBuiltIn'>>): boolean {
    const theme = this.themes.get(themeId);
    if (!theme) {
      console.error(`Theme ${themeId} not found`);
      return false;
    }

    if (theme.isBuiltIn) {
      console.error(`Cannot update built-in theme: ${theme.name} (${themeId})`);
      return false;
    }

    // Update theme
    this.themes.set(themeId, {
      ...theme,
      ...updates,
      colors: {
        ...theme.colors,
        ...(updates.colors || {}),
      },
      fonts: {
        ...theme.fonts,
        ...(updates.fonts || {}),
      },
      spacing: {
        ...theme.spacing,
        ...(updates.spacing || {}),
      },
      borderRadius: {
        ...theme.borderRadius,
        ...(updates.borderRadius || {}),
      },
    });

    console.log(`Updated theme: ${theme.name} (${themeId})`);

    // If this is the active theme, apply the updates
    if (this.activeTheme === themeId) {
      this.applyTheme(themeId);
    }

    return true;
  }

  /**
   * Delete a theme
   * @param themeId Theme ID
   */
  deleteTheme(themeId: string): boolean {
    const theme = this.themes.get(themeId);
    if (!theme) {
      console.error(`Theme ${themeId} not found`);
      return false;
    }

    if (theme.isBuiltIn) {
      console.error(`Cannot delete built-in theme: ${theme.name} (${themeId})`);
      return false;
    }

    // If this is the active theme, switch to default
    if (this.activeTheme === themeId) {
      this.applyTheme('default');
    }

    // Delete theme
    this.themes.delete(themeId);
    console.log(`Deleted theme: ${theme.name} (${themeId})`);

    return true;
  }

  /**
   * Get all layouts
   */
  getLayouts(): Layout[] {
    return Array.from(this.layouts.values());
  }

  /**
   * Get a layout by ID
   * @param layoutId Layout ID
   */
  getLayout(layoutId: string): Layout | undefined {
    return this.layouts.get(layoutId);
  }

  /**
   * Get the active layout
   */
  getActiveLayout(): Layout | undefined {
    return this.layouts.get(this.activeLayout);
  }

  /**
   * Apply a layout
   * @param layoutId Layout ID
   */
  applyLayout(layoutId: string): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) {
      console.error(`Layout ${layoutId} not found`);
      return false;
    }

    console.log(`Applying layout: ${layout.name} (${layoutId})`);

    // In a real implementation, this would apply the layout to the UI
    // This is a mock implementation that simulates layout application

    // Update active layout
    this.activeLayout = layoutId;

    // Update config
    this.config.layout = {
      sidebarPosition: layout.sidebarPosition,
      sidebarWidth: layout.sidebarWidth,
      showTabs: layout.showTabs,
      showStatusBar: layout.showStatusBar,
      showBreadcrumbs: layout.showBreadcrumbs,
      compactMode: layout.compactMode,
    };

    // Apply layout CSS
    this.applyLayoutCSS(layout);

    return true;
  }

  /**
   * Apply layout CSS
   * @param layout Layout to apply
   */
  private applyLayoutCSS(layout: Layout): void {
    // Create or get the style element
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'remix-ide-theme';
      document.head.appendChild(this.styleElement);
    }

    // Generate CSS variables for layout
    const css = `
      :root {
        /* Layout */
        --sidebar-position: ${layout.sidebarPosition};
        --sidebar-width: ${layout.sidebarWidth}px;
        --show-tabs: ${layout.showTabs ? 'block' : 'none'};
        --show-status-bar: ${layout.showStatusBar ? 'block' : 'none'};
        --show-breadcrumbs: ${layout.showBreadcrumbs ? 'block' : 'none'};
        --compact-mode: ${layout.compactMode ? '0.9' : '1'};
      }
    `;

    // Append to existing CSS
    this.styleElement.textContent += css;
  }

  /**
   * Create a new layout
   * @param layout Layout data
   */
  createLayout(layout: Omit<Layout, 'id' | 'isBuiltIn'>): Layout {
    const layoutId = 'layout-' + Math.random().toString(36).substring(2, 9);

    const newLayout: Layout = {
      id: layoutId,
      ...layout,
      isBuiltIn: false,
    };

    this.layouts.set(layoutId, newLayout);
    console.log(`Created layout: ${newLayout.name} (${layoutId})`);

    return newLayout;
  }

  /**
   * Update a layout
   * @param layoutId Layout ID
   * @param updates Layout updates
   */
  updateLayout(layoutId: string, updates: Partial<Omit<Layout, 'id' | 'isBuiltIn'>>): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) {
      console.error(`Layout ${layoutId} not found`);
      return false;
    }

    if (layout.isBuiltIn) {
      console.error(`Cannot update built-in layout: ${layout.name} (${layoutId})`);
      return false;
    }

    // Update layout
    this.layouts.set(layoutId, {
      ...layout,
      ...updates,
    });

    console.log(`Updated layout: ${layout.name} (${layoutId})`);

    // If this is the active layout, apply the updates
    if (this.activeLayout === layoutId) {
      this.applyLayout(layoutId);
    }

    return true;
  }

  /**
   * Delete a layout
   * @param layoutId Layout ID
   */
  deleteLayout(layoutId: string): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) {
      console.error(`Layout ${layoutId} not found`);
      return false;
    }

    if (layout.isBuiltIn) {
      console.error(`Cannot delete built-in layout: ${layout.name} (${layoutId})`);
      return false;
    }

    // If this is the active layout, switch to default
    if (this.activeLayout === layoutId) {
      this.applyLayout('default');
    }

    // Delete layout
    this.layouts.delete(layoutId);
    console.log(`Deleted layout: ${layout.name} (${layoutId})`);

    return true;
  }

  /**
   * Update custom CSS
   * @param css Custom CSS
   */
  updateCustomCSS(css: string): void {
    console.log('Updating custom CSS');

    // Update config
    this.config.customCSS = css;

    // Apply the active theme to update CSS
    this.applyTheme(this.activeTheme);
  }

  /**
   * Update animation settings
   * @param enabled Whether animations are enabled
   * @param speed Animation speed
   */
  updateAnimations(enabled: boolean, speed: 'slow' | 'normal' | 'fast'): void {
    console.log(`Updating animations: enabled=${enabled}, speed=${speed}`);

    // Update config
    this.config.animations = {
      enabled,
      speed,
    };

    // Apply animation settings
    this.applyAnimationCSS();
  }

  /**
   * Apply animation CSS
   */
  private applyAnimationCSS(): void {
    // Create or get the style element
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'remix-ide-theme';
      document.head.appendChild(this.styleElement);
    }

    // Generate CSS variables for animations
    const speedMap = {
      slow: '0.5s',
      normal: '0.3s',
      fast: '0.1s',
    };

    const css = `
      :root {
        /* Animations */
        --animation-enabled: ${this.config.animations.enabled ? '1' : '0'};
        --animation-speed: ${speedMap[this.config.animations.speed]};
      }

      * {
        transition-duration: var(--animation-speed);
        transition-property: ${this.config.animations.enabled ? 'background-color, color, border-color, box-shadow, transform, opacity' : 'none'};
      }
    `;

    // Append to existing CSS
    this.styleElement.textContent += css;
  }

  /**
   * Update theme configuration
   * @param newConfig New configuration
   */
  updateConfig(newConfig: Partial<PluginConfig>): void {
    // Update config
    this.config = {
      ...this.config,
      ...newConfig,
      customTheme: {
        ...this.config.customTheme,
        ...(newConfig.customTheme || {}),
      },
      layout: {
        ...this.config.layout,
        ...(newConfig.layout || {}),
      },
      animations: {
        ...this.config.animations,
        ...(newConfig.animations || {}),
      },
    };

    console.log('Updated theme configuration');

    // Update custom theme
    if (newConfig.customTheme) {
      this.themes.set('custom', {
        ...this.themes.get('custom')!,
        name: this.config.customTheme.name,
        colors: this.config.customTheme.colors,
        fonts: this.config.customTheme.fonts,
        spacing: this.config.customTheme.spacing,
        borderRadius: this.config.customTheme.borderRadius,
      });
    }

    // Update custom layout
    if (newConfig.layout) {
      this.layouts.set('custom', {
        ...this.layouts.get('custom')!,
        sidebarPosition: this.config.layout.sidebarPosition,
        sidebarWidth: this.config.layout.sidebarWidth,
        showTabs: this.config.layout.showTabs,
        showStatusBar: this.config.layout.showStatusBar,
        showBreadcrumbs: this.config.layout.showBreadcrumbs,
        compactMode: this.config.layout.compactMode,
      });
    }

    // Apply the active theme and layout
    this.applyTheme(this.activeTheme);
    this.applyLayout(this.activeLayout);

    // Apply animation settings
    if (newConfig.animations) {
      this.applyAnimationCSS();
    }
  }

  /**
   * Clean up resources when the plugin is disabled
   */
  cleanup(): void {
    // Remove the style element
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    console.log('Theme plugin cleaned up');
  }
}
