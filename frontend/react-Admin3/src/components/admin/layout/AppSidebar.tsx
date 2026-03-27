import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  CalendarDays,
  Package,
  Link as LinkIcon,
  Layers,
  Gift,
  Store,
  DollarSign,
  BoxesIcon,
  Star,
  Settings,
  FileText,
  ListOrdered,
  Paperclip,
  Scale,
  Code,
  PenLine,
  Users,
  BadgeCheck,
  SlidersHorizontal,
  Mail,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/admin/ui/sidebar';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Users',
    items: [
      { label: 'User Profiles', path: '/admin/user-profiles', icon: Users },
      { label: 'Staff', path: '/admin/staff', icon: BadgeCheck },
    ],
  },
  {
    label: 'Email System',
    items: [
      { label: 'Settings', path: '/admin/email/settings', icon: Settings },
      { label: 'Templates', path: '/admin/email/templates', icon: FileText },
      { label: 'Queue', path: '/admin/email/queue', icon: ListOrdered },
      { label: 'Batches', path: '/admin/email/batches', icon: Mail },
      { label: 'Attachments', path: '/admin/email/attachments', icon: Paperclip },
      { label: 'Content Rules', path: '/admin/email/content-rules', icon: Scale },
      { label: 'Placeholders', path: '/admin/email/placeholders', icon: Code },
      { label: 'Salutations', path: '/admin/email/closing-salutations', icon: PenLine },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Subjects', path: '/admin/subjects', icon: GraduationCap },
      { label: 'Exam Sessions', path: '/admin/exam-sessions', icon: CalendarDays },
      { label: 'Products', path: '/admin/products', icon: Package },
      { label: 'ESS Links', path: '/admin/exam-session-subjects', icon: LinkIcon },
      { label: 'Variations', path: '/admin/product-variations', icon: Layers },
      { label: 'Product Bundles', path: '/admin/product-bundles', icon: Gift },
    ],
  },
  {
    label: 'Store',
    items: [
      { label: 'Store Products', path: '/admin/store-products', icon: Store },
      { label: 'Prices', path: '/admin/prices', icon: DollarSign },
      { label: 'Store Bundles', path: '/admin/store-bundles', icon: BoxesIcon },
      { label: 'Recommendations', path: '/admin/recommendations', icon: Star },
    ],
  },
  
  
  {
    label: 'Setup',
    items: [
      { label: 'New Session Setup', path: '/admin/new-session-setup', icon: SlidersHorizontal },
    ],
  },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();

  const isActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="tw:flex tw:aspect-square tw:size-8 tw:items-center tw:justify-center tw:rounded-lg tw:bg-sidebar-primary tw:text-sidebar-primary-foreground tw:font-bold tw:text-sm">
                  A
                </div>
                <div className="tw:flex tw:flex-col tw:gap-0.5 tw:leading-none">
                  <span className="tw:font-semibold">ActEd</span>
                  <span className="tw:text-xs tw:text-muted-foreground">ActEd Management System</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.path)}
                      tooltip={item.label}
                    >
                      <Link to={item.path}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
