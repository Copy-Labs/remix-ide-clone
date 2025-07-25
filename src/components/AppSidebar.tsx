import * as React from 'react';
import {
  Bug,
  Code,
  Command,
  GitBranch,
  LucideFile,
  LucidePlay,
  LucideRefreshCw,
  Palette,
  Rocket,
  Settings,
  Shield,
  TestTube,
  Zap,
} from 'lucide-react';

import { NavUser } from '@/components/NavUser';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import FileExplorer from '@/components/FileExplorer/FileExplorer.tsx';
import ErrorBoundary from '@/components/ErrorBoundary.tsx';
import CompilerPanel from '@/components/Compiler/CompilerPanel.tsx';
import DeploymentPanel from '@/components/Deployment/DeploymentPanel.tsx';
import GitPanel from '@/components/Git/GitPanel.tsx';
// import DebuggerPluginUI from '@/components/PluginUI/DebuggerPluginUI.tsx';
import DebuggerPanel from '@/components/Debugger/DebuggerPanel.tsx';
import CollaborationPluginUI from '@/components/PluginUI/CollaborationPluginUI.tsx';
import BackupPluginUI from '@/components/PluginUI/BackupPluginUI.tsx';
import AnalysisPluginUI from '@/components/PluginUI/AnalysisPluginUI.tsx';
import DeploymentPluginUI from '@/components/PluginUI/DeploymentPluginUI.tsx';
import GitPluginUI from '@/components/PluginUI/GitPluginUI.tsx';
import TestingPluginUI from '@/components/PluginUI/TestingPluginUI.tsx';
import { usePluginStore } from '@/stores/pluginStore';
import ImprovedCustomThemePluginUI from '@/components/PluginUI/ImprovedCustomThemePluginUI.tsx';

// Plugin icon mapping
const getPluginIcon = (pluginId: string) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    collaboration: Zap,
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

// Plugin UI component mapping
const getPluginComponent = (pluginId: string) => {
  const componentMap: Record<string, React.ComponentType<{ pluginId: string }>> = {
    collaboration: CollaborationPluginUI,
    'backup-sync': BackupPluginUI,
    'custom-theme-ui': ImprovedCustomThemePluginUI, // CustomThemePluginUI,
    'code-analysis': AnalysisPluginUI,
    'solidity-debugger': DebuggerPanel,
    'deployment-automation': DeploymentPluginUI,
    'git-integration': GitPluginUI,
    'testing-framework': TestingPluginUI,
  };
  return componentMap[pluginId];
};

// This is sample data
const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navMain: [
    {
      key: 'file_explorer',
      title: 'File Explorer',
      url: '#',
      icon: LucideFile,
      isActive: true,
      component: (
        <ErrorBoundary>
          <FileExplorer />
        </ErrorBoundary>
      ),
    },
    {
      key: 'compiler',
      title: 'Compiler',
      url: '#',
      icon: LucideRefreshCw,
      isActive: false,
      component: (
        <ErrorBoundary>
          <CompilerPanel />
        </ErrorBoundary>
      ),
    },
    {
      key: 'deployment',
      title: 'Deploy Your Contract',
      url: '#',
      icon: LucidePlay,
      isActive: false,
      component: (
        <ErrorBoundary>
          <DeploymentPanel />
        </ErrorBoundary>
      ),
    },
    {
      key: 'git',
      title: 'Git',
      url: '#',
      icon: GitBranch,
      isActive: false,
      component: (
        <ErrorBoundary>
          <GitPanel />
        </ErrorBoundary>
      ),
    },
    /*{
      key: 'debugger',
      title: 'Debugger',
      url: '#',
      icon: Bug,
      isActive: false,
      component: (
        <ErrorBoundary>
          <DebuggerPanel />
        </ErrorBoundary>
      ),
    },*/
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Note: I'm using state to show active item.
  // IRL you should use the url/router.
  const { plugins } = usePluginStore();
  const { setOpen } = useSidebar();

  // Create dynamic navigation items
  const navItems = React.useMemo(() => {
    const baseItems = [...data.navMain];

    // Add all enabled plugins to sidebar
    const enabledPlugins = plugins.filter((plugin) => plugin.enabled);

    enabledPlugins.forEach((plugin, index) => {
      const PluginComponent = getPluginComponent(plugin.id);
      const PluginIcon = getPluginIcon(plugin.id);

      if (PluginComponent) {
        const pluginItem = {
          key: plugin.id,
          title: plugin.name,
          url: '#',
          icon: PluginIcon,
          isActive: false,
          component: (
            <ErrorBoundary>
              <PluginComponent pluginId={plugin.id} />
            </ErrorBoundary>
          ),
        };

        // Insert plugins after the base items (file explorer, compiler, deployment, git)
        // This ensures plugins appear at the end of the sidebar
        baseItems.push(pluginItem);
      }
    });

    return baseItems;
  }, [plugins]);

  const [activeItem, setActiveItem] = React.useState(navItems[0]);

  // Update active item when navItems change (e.g., debugger enabled/disabled)
  React.useEffect(() => {
    if (activeItem && !navItems.find((item) => item.key === activeItem.key)) {
      // If current active item is no longer available, switch to first item
      setActiveItem(navItems[0]);
    }
  }, [navItems, activeItem]);

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* This is the first sidebar */}
      {/* We disable collapsible and adjust width to icon. */}
      {/* This will make the sidebar appear as icons. */}
      <Sidebar collapsible="none" className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <div>
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Acme Inc</span>
                    <span className="truncate text-xs">Enterprise</span>
                  </div>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        setActiveItem(item);
                        setOpen(true);
                      }}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          {/*<NavUser user={data.user} />*/}
        </SidebarFooter>
      </Sidebar>

      {/* This is the second sidebar */}
      {/* We disable collapsible and let it fill remaining space */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex w-full overflow-x-auto">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">{activeItem?.title}</div>
            {/*<Label className="flex items-center gap-2 text-sm">
              <span>Unreads</span>
              <Switch className="shadow-none" />
            </Label>*/}
          </div>
          {/*<SidebarInput placeholder="Type to search..." />*/}
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent
              className={'max-w-full md:max-w-[calc(var(--sidebar-width)-1rem)]'}
            >
              {navItems.find((item) => item.title === activeItem?.title)?.component}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  );
}
