import { FileText, Sun, Moon, X, History, Search } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Logo } from './Logo';

interface SidebarProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  closeSidebar: () => void;
}

export function Sidebar({ theme, toggleTheme, closeSidebar }: SidebarProps) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
      isActive
        ? "bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm border border-[var(--color-border)]"
        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)]"
    );

  return (
    <div className="h-full bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border)] flex flex-col">
      <div className="p-4 md:p-6 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <Logo size={32} />
          <span className="font-serif font-medium text-lg tracking-tight whitespace-nowrap">SACR Cyber Intel</span>
        </div>
        <button
          className="md:hidden p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover)] rounded-md"
          onClick={closeSidebar}
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        <NavLink to="/" end className={linkClass} onClick={closeSidebar}>
          <History size={16} />
          News History
        </NavLink>

        <NavLink to="/briefing" className={linkClass} onClick={closeSidebar}>
          <FileText size={16} />
          Today's Briefing
        </NavLink>

        <NavLink to="/search" className={linkClass} onClick={closeSidebar}>
          <Search size={16} />
          Search
        </NavLink>
      </nav>

      <div className="p-4 border-t border-[var(--color-border)] space-y-4">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <span className="flex items-center gap-3">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>
      </div>
    </div>
  );
}
