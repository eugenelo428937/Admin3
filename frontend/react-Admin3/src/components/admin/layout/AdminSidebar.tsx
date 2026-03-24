import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
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
  Mail,
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/components/admin/styles/cn';
import { ScrollArea } from '@/components/admin/ui/scroll-area';
import { Separator } from '@/components/admin/ui/separator';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Catalog',
    icon: GraduationCap,
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
    icon: Store,
    items: [
      { label: 'Store Products', path: '/admin/store-products', icon: Store },
      { label: 'Prices', path: '/admin/prices', icon: DollarSign },
      { label: 'Store Bundles', path: '/admin/store-bundles', icon: BoxesIcon },
      { label: 'Recommendations', path: '/admin/recommendations', icon: Star },
    ],
  },
  {
    label: 'Email System',
    icon: Mail,
    items: [
      { label: 'Settings', path: '/admin/email/settings', icon: Settings },
      { label: 'Templates', path: '/admin/email/templates', icon: FileText },
      { label: 'Queue', path: '/admin/email/queue', icon: ListOrdered },
      { label: 'Attachments', path: '/admin/email/attachments', icon: Paperclip },
      { label: 'Content Rules', path: '/admin/email/content-rules', icon: Scale },
      { label: 'Placeholders', path: '/admin/email/placeholders', icon: Code },
      { label: 'Salutations', path: '/admin/email/closing-salutations', icon: PenLine },
    ],
  },
  {
    label: 'Users',
    icon: Users,
    items: [
      { label: 'User Profiles', path: '/admin/user-profiles', icon: Users },
      { label: 'Staff', path: '/admin/staff', icon: BadgeCheck },
    ],
  },
  {
    label: 'Setup',
    icon: SlidersHorizontal,
    items: [
      { label: 'New Session Setup', path: '/admin/new-session-setup', icon: SlidersHorizontal },
    ],
  },
];

function getInitialOpenGroups(pathname: string): Record<string, boolean> {
  const openGroups: Record<string, boolean> = {};
  navGroups.forEach((group) => {
    openGroups[group.label] = group.items.some((item) =>
      pathname.startsWith(item.path)
    );
  });
  return openGroups;
}

export function AdminSidebar() {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => getInitialOpenGroups(location.pathname)
  );

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string): boolean => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside
      className={cn(
        'tw:fixed tw:inset-y-0 tw:left-0 tw:z-30',
        'tw:w-[var(--admin-sidebar-width)] tw:border-r tw:border-admin-border',
        'tw:bg-admin-sidebar-bg'
      )}
    >
      <div className="tw:flex tw:h-14 tw:items-center tw:px-4">
        <span className="tw:text-sm tw:font-semibold tw:text-admin-fg">
          Admin
        </span>
      </div>

      <Separator />

      <ScrollArea className="tw:h-[calc(100vh-3.5rem)]">
        <nav className="tw:flex tw:flex-col tw:gap-1 tw:p-2">
          {navGroups.map((group) => {
            const GroupIcon = group.icon;
            const isOpen = openGroups[group.label] ?? false;

            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    'tw:flex tw:w-full tw:items-center tw:gap-2 tw:rounded-[var(--admin-radius)]',
                    'tw:px-2 tw:py-1.5 tw:text-sm tw:font-medium',
                    'tw:text-admin-sidebar-fg tw:hover:bg-admin-bg-muted',
                    'tw:transition-colors tw:cursor-pointer'
                  )}
                >
                  <GroupIcon className="tw:h-4 tw:w-4" />
                  <span className="tw:flex-1 tw:text-left">{group.label}</span>
                  {isOpen ? (
                    <ChevronDown className="tw:h-4 tw:w-4" />
                  ) : (
                    <ChevronRight className="tw:h-4 tw:w-4" />
                  )}
                </button>

                {isOpen && (
                  <div className="tw:ml-4 tw:mt-0.5 tw:flex tw:flex-col tw:gap-0.5">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = isActive(item.path);

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            'tw:flex tw:items-center tw:gap-2 tw:rounded-[var(--admin-radius)]',
                            'tw:px-2 tw:py-1.5 tw:text-[0.8125rem] tw:no-underline',
                            'tw:transition-colors',
                            active
                              ? 'tw:bg-admin-sidebar-active tw:text-admin-sidebar-active-fg tw:font-medium'
                              : 'tw:text-admin-sidebar-fg tw:hover:bg-admin-bg-muted'
                          )}
                        >
                          <ItemIcon className="tw:h-3.5 tw:w-3.5" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
