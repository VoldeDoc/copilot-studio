'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Terminal, 
  GitBranch, 
  History, 
  Settings, 
  FileCode,
  Zap,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Command
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: number;
  isCollapsed?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, isActive, badge, isCollapsed, onClick }: NavItemProps) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
        'hover:bg-zinc-800/50',
        isActive 
          ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' 
          : 'text-zinc-400 hover:text-zinc-200'
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <AnimatePresence>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex-1 text-left truncate"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {!isCollapsed && badge !== undefined && (
        <Badge variant="info" size="sm">
          {badge}
        </Badge>
      )}
    </motion.button>
  );
}

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const mainNavItems = [
    { id: 'commands', icon: <Terminal size={18} />, label: 'Commands', badge: undefined },
    { id: 'generate', icon: <Sparkles size={18} />, label: 'Generate', badge: undefined },
    { id: 'explain', icon: <BookOpen size={18} />, label: 'Explain', badge: undefined },
    { id: 'refactor', icon: <Zap size={18} />, label: 'Refactor', badge: undefined },
  ];

  const secondaryNavItems = [
    { id: 'files', icon: <FileCode size={18} />, label: 'Files', badge: 3 },
    { id: 'git', icon: <GitBranch size={18} />, label: 'Git', badge: undefined },
    { id: 'history', icon: <History size={18} />, label: 'History', badge: 12 },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 64 : 240 }}
      className="h-screen bg-zinc-950 border-r border-zinc-800/50 flex flex-col"
    >
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800/50">
        <motion.div 
          className="flex items-center gap-2"
          animate={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Command size={16} className="text-white" />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-zinc-100 tracking-tight"
              >
                Copilot Studio
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {/* Main Nav */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              AI Commands
            </span>
          )}
          <div className="mt-2 space-y-0.5">
            {mainNavItems.map((item) => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                isActive={activeSection === item.id}
                badge={item.badge}
                isCollapsed={isCollapsed}
                onClick={() => onSectionChange(item.id)}
              />
            ))}
          </div>
        </div>

        {/* Secondary Nav */}
        <div className="space-y-1">
          {!isCollapsed && (
            <span className="px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Workspace
            </span>
          )}
          <div className="mt-2 space-y-0.5">
            {secondaryNavItems.map((item) => (
              <NavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                isActive={activeSection === item.id}
                badge={item.badge}
                isCollapsed={isCollapsed}
                onClick={() => onSectionChange(item.id)}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-zinc-800/50 space-y-1">
        <NavItem
          icon={<Settings size={18} />}
          label="Settings"
          isActive={activeSection === 'settings'}
          isCollapsed={isCollapsed}
          onClick={() => onSectionChange('settings')}
        />
        
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!isCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
