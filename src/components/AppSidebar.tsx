import * as React from 'react';
import {
  ArchiveX,
  Command,
  File,
  Inbox,
  LucideFile,
  LucidePlay,
  LucidePlug2,
  LucideRefreshCw,
  Send,
  Trash2,
} from 'lucide-react';

import { NavUser } from '@/components/NavUser';
import { Label } from '@/components/ui/label';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import FileExplorer from '@/components/FileExplorer/FileExplorer.tsx';
import ErrorBoundary from '@/components/ErrorBoundary.tsx';
import CompilerPanel from '@/components/Compiler/CompilerPanel.tsx';
import DeploymentPanel from '@/components/Deployment/DeploymentPanel.tsx';
import PluginPanel from '@/components/PluginUI/PluginPanel.tsx';

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
          <CompilerPanel/>
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
          <DeploymentPanel/>
        </ErrorBoundary>
      ),
    },
    {
      key: 'plugin',
      title: 'Plugins',
      url: '#',
      icon: LucidePlug2,
      isActive: false,
      component: (
        <ErrorBoundary>
          <PluginPanel />
        </ErrorBoundary>
      ),
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Note: I'm using state to show active item.
  // IRL you should use the url/router.
  const [activeItem, setActiveItem] = React.useState(data.navMain[0]);
  const { setOpen } = useSidebar();

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
                <a href="#">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Command className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Acme Inc</span>
                    <span className="truncate text-xs">Enterprise</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {data.navMain.map((item) => (
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
          <NavUser user={data.user} />
        </SidebarFooter>
      </Sidebar>

      {/* This is the second sidebar */}
      {/* We disable collapsible and let it fill remaining space */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex w-full overflow-x-auto">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">{activeItem?.title}</div>
            <Label className="flex items-center gap-2 text-sm">
              <span>Unreads</span>
              <Switch className="shadow-none" />
            </Label>
          </div>
          <SidebarInput placeholder="Type to search..." />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent className={'max-w-full md:max-w-[calc(var(--sidebar-width)-1rem)]'}>
              {data.navMain.find((item) => item.title === activeItem?.title)?.component}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  );
}
