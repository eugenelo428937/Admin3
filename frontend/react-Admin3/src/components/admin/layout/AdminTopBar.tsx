import { PanelLeft, Search, Sun, Moon, Settings, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from './DarkModeProvider';
import { useSidebar } from '@/components/admin/ui/sidebar';
import { Button } from '@/components/admin/ui/button';
import { Input } from '@/components/admin/ui/input';
import { Separator } from '@/components/admin/ui/separator';

export function AdminTopBar() {
  const { toggleSidebar } = useSidebar();
  const { mode, toggleMode } = useDarkMode();
  const { user, isAuthenticated } = useAuth() as any;

  const userInitials = user
    ? `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || 'U'
    : '';

  return (
    <header className="tw:flex tw:h-12 tw:shrink-0 tw:items-center tw:justify-between tw:border-b tw:border-border tw:px-4">
      {/* Left: sidebar toggle */}
      <div className="tw:flex tw:items-center tw:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="tw:h-8 tw:w-8"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="tw:h-4 tw:w-4" />
        </Button>
        <Separator orientation="vertical" className="tw:h-4" />
      </div>

      {/* Right: search, dark mode, settings, avatar */}
      <div className="tw:flex tw:items-center tw:gap-2">
        <div className="tw:relative">
          <Search className="tw:absolute tw:left-2.5 tw:top-1/2 tw:-translate-y-1/2 tw:h-3.5 tw:w-3.5 tw:text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="tw:h-8 tw:w-40 tw:pl-8 tw:text-sm"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMode}
          className="tw:h-8 tw:w-8"
          aria-label={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {mode === 'light' ? (
            <Moon className="tw:h-4 tw:w-4" />
          ) : (
            <Sun className="tw:h-4 tw:w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="tw:h-8 tw:w-8"
          aria-label="Settings"
        >
          <Settings className="tw:h-4 tw:w-4" />
        </Button>

        {isAuthenticated && user ? (
          <div className="tw:flex tw:h-8 tw:w-8 tw:items-center tw:justify-center tw:rounded-full tw:bg-primary tw:text-primary-foreground tw:text-xs tw:font-bold">
            {userInitials}
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="tw:h-8 tw:w-8" aria-label="Log in">
            <LogIn className="tw:h-4 tw:w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
