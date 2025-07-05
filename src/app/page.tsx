'use client';
import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { DashboardCreator } from '@/components/dashboard-creator';
import { Toaster } from "@/components/ui/toaster";
import { Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { TemplateSidebar } from '@/components/template-sidebar';
import { templates } from '@/lib/templates';
import type { SavedDashboard, Template } from '@/lib/types';

export default function Home() {
  const [selectedItem, setSelectedItem] = useState<Template | SavedDashboard | null>(templates[0]);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const handleDashboardSave = () => {
    setSidebarRefreshKey(key => key + 1);
  };

  return (
    <>
      <Sidebar variant="floating">
        <TemplateSidebar 
          selectedItem={selectedItem}
          onSelectTemplate={setSelectedItem} 
          onSelectSavedDashboard={setSelectedItem}
          refreshKey={sidebarRefreshKey}
        />
      </Sidebar>
      <SidebarInset className="flex flex-col min-h-screen bg-background text-foreground font-body antialiased">
        <Header />
        <main className="flex-grow container mx-auto py-8 px-4">
          <DashboardCreator 
            key={(selectedItem as any)?.id || 'custom'} 
            selection={selectedItem} 
            onDashboardSave={handleDashboardSave}
          />
        </main>
        <Toaster />
      </SidebarInset>
    </>
  );
}
