'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuthStore } from '@/stores';

interface MainLayoutProps {
  children: React.ReactNode;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

export function MainLayout({ children, activeSection = 'commands', onSectionChange }: MainLayoutProps) {
  const { user, selectedRepository, selectedBranch } = useAuthStore();

  const handleSectionChange = (section: string) => {
    if (onSectionChange) {
      onSectionChange(section);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header 
          user={user}
          repoName={selectedRepository ? `${selectedRepository.owner}/${selectedRepository.name}` : undefined}
          branch={selectedBranch || 'main'}
          syncStatus="synced"
          lastSync="2 min ago"
        />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
