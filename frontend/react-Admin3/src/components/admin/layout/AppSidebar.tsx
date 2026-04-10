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
  Archive,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
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
      label: "Overview",
      items: [
         {
            label: "Dashboard",
            path: "/admin/dashboard",
            icon: LayoutDashboard,
         },
      ],
   },
   {
      label: "Users",
      items: [
         // { label: 'User Profiles', path: '/admin/user-profiles', icon: Users },
         { label: "Staff", path: "/admin/staff", icon: BadgeCheck },
         { label: "Students", path: "/admin/students", icon: GraduationCap },
      ],
   },
   {
      label: "Email System",
      items: [
         { label: "Batches", path: "/admin/email/batches", icon: Mail },
         { label: "Queue", path: "/admin/email/queue", icon: ListOrdered },
         { label: "Templates", path: "/admin/email/templates", icon: FileText },
         {
            label: "Salutations",
            path: "/admin/email/closing-salutations",
            icon: PenLine,
         },
         {
            label: "Attachments",
            path: "/admin/email/attachments",
            icon: Paperclip,
         },
         {
            label: "Content Rules",
            path: "/admin/email/content-rules",
            icon: Scale,
         },
         {
            label: "Placeholders",
            path: "/admin/email/placeholders",
            icon: Code,
         },
         { label: "Settings", path: "/admin/email/settings", icon: Settings },
      ],
   },
   {
      label: "Archive",
      items: [
         {
            label: "Legacy Products",
            path: "/admin/legacy-products",
            icon: Archive,
         },
      ],
   },
  //  {
  //     label: "Catalog",
  //     items: [
  //        { label: "Subjects", path: "/admin/subjects", icon: GraduationCap },
  //        {
  //           label: "Exam Sessions",
  //           path: "/admin/exam-sessions",
  //           icon: CalendarDays,
  //        },
        //  { label: "Products", path: "/admin/products", icon: Package },
        //  {
        //     label: "ESS Links",
        //     path: "/admin/exam-session-subjects",
        //     icon: LinkIcon,
        //  },
        //  {
        //     label: "Variations",
        //     path: "/admin/product-variations",
        //     icon: Layers,
        //  },
        //  {
        //     label: "Product Bundles",
        //     path: "/admin/product-bundles",
        //     icon: Gift,
        //  },
  //     ],
  //  },
  //  {
  //     label: "Store",
  //     items: [
  //        {
  //           label: "Store Products",
  //           path: "/admin/store-products",
  //           icon: Store,
  //        },
  //        { label: "Prices", path: "/admin/prices", icon: DollarSign },
  //        {
  //           label: "Store Bundles",
  //           path: "/admin/store-bundles",
  //           icon: BoxesIcon,
  //        },
  //        {
  //           label: "Recommendations",
  //           path: "/admin/recommendations",
  //           icon: Star,
  //        },
  //     ],
  //  },

  //  {
  //     label: "Setup",
  //     items: [
  //        {
  //           label: "New Session Setup",
  //           path: "/admin/new-session-setup",
  //           icon: SlidersHorizontal,
  //        },
  //     ],
  //  },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const { user } = useAuth() as any;
  const initials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || 'A'
    : 'A';
  const displayName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Admin' : 'Admin';

  const isActive = (path: string): boolean => {
    if (path === '/admin/dashboard') {
      return location.pathname === '/' || location.pathname === '/admin/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/admin/dashboard">
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

      <SidebarFooter>
        <div className="tw:flex tw:items-center tw:gap-2.5 tw:px-2 tw:py-1">
          <div className="tw:flex tw:size-7 tw:items-center tw:justify-center tw:rounded-full tw:bg-[rgba(0,0,0,0.06)] tw:text-[10px] tw:font-semibold tw:text-muted-foreground">
            {initials}
          </div>
          <div className="tw:flex tw:flex-col tw:leading-none tw:group-data-[collapsible=icon]:hidden">
            <span className="tw:text-xs tw:font-medium">{displayName}</span>
            <span className="tw:text-[10px] tw:text-muted-foreground">Admin</span>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
