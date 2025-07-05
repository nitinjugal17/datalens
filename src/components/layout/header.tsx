import { Presentation } from 'lucide-react';
import { SidebarTrigger } from '../ui/sidebar';

export function Header() {
  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center gap-4">
        <SidebarTrigger />
        <div className="flex items-center">
            <Presentation className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold ml-2 text-primary font-headline">DataLens Dashboard</h1>
        </div>
      </div>
    </header>
  );
}
