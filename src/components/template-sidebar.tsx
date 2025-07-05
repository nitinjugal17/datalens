
'use client';
import { SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction } from "@/components/ui/sidebar";
import { templates } from "@/lib/templates";
import type { SavedDashboard, Template } from "@/lib/types";
import { LayoutGrid, AppWindow, Save, Trash2, Archive, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "./ui/separator";

interface TemplateSidebarProps {
    selectedItem: Template | SavedDashboard | null;
    onSelectTemplate: (template: Template | null) => void;
    onSelectSavedDashboard: (dashboard: SavedDashboard) => void;
    refreshKey?: number;
}

export function TemplateSidebar({ selectedItem, onSelectTemplate, onSelectSavedDashboard, refreshKey }: TemplateSidebarProps) {
    const [savedDashboards, setSavedDashboards] = useState<SavedDashboard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dashboardToDelete, setDashboardToDelete] = useState<SavedDashboard | null>(null);

    const fetchDashboards = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/dashboards');
            if (response.ok) {
                const data = await response.json();
                setSavedDashboards(data);
            } else {
                console.error("Failed to fetch dashboards");
                setSavedDashboards([]);
            }
        } catch (error) {
            console.error("Error fetching dashboards:", error);
            setSavedDashboards([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboards();
    }, [refreshKey]);

    const handleDeleteDashboard = async () => {
        if (!dashboardToDelete) return;
        
        try {
            const response = await fetch(`/api/dashboards/${dashboardToDelete.id}`, { method: 'DELETE' });
            if (response.ok) {
                if (selectedItem?.id === dashboardToDelete.id) {
                    onSelectTemplate(null); 
                }
                fetchDashboards();
            } else {
                 console.error("Failed to delete dashboard");
            }
        } catch (error) {
            console.error("Error deleting dashboard:", error);
        } finally {
             setDashboardToDelete(null);
        }
    };

    const isTemplate = selectedItem && 'requiredFields' in selectedItem;
    const isSavedDashboard = selectedItem && 'createdAt' in selectedItem;

    return (
        <>
            <SidebarContent>
                 <SidebarHeader>
                    <h2 className="text-lg font-semibold px-2">Templates</h2>
                </SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => onSelectTemplate(null)}
                            isActive={selectedItem === null}
                            tooltip="Build from scratch"
                        >
                            <LayoutGrid />
                            <span>Custom Dashboard</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    {templates.map((template) => (
                        <SidebarMenuItem key={template.id}>
                            <SidebarMenuButton
                                onClick={() => onSelectTemplate(template)}
                                isActive={isTemplate && selectedItem?.id === template.id}
                                tooltip={template.name}
                            >
                                <AppWindow />
                                <span>{template.name}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>

                <Separator className="my-2" />
                
                <SidebarHeader>
                    <h2 className="text-lg font-semibold px-2">My Dashboards</h2>
                </SidebarHeader>
                 <SidebarMenu>
                    {isLoading ? (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                    ) : savedDashboards.length === 0 ? (
                        <p className="px-4 text-xs text-sidebar-foreground/70">You haven't saved any dashboards yet.</p>
                    ) : (
                        savedDashboards.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((dashboard) => {
                            const Icon = dashboard.isSnapshot ? Archive : Save;
                            const tooltip = dashboard.isSnapshot ? `${dashboard.name} (Snapshot)` : `${dashboard.name} (Layout)`;
                            
                            return (
                                <SidebarMenuItem key={dashboard.id}>
                                    <SidebarMenuButton
                                        onClick={() => onSelectSavedDashboard(dashboard)}
                                        isActive={isSavedDashboard && selectedItem?.id === dashboard.id}
                                        tooltip={tooltip}
                                    >
                                        <Icon />
                                        <span>{dashboard.name}</span>
                                    </SidebarMenuButton>
                                    <SidebarMenuAction showOnHover={true} onClick={(e) => { e.stopPropagation(); setDashboardToDelete(dashboard); }}>
                                        <Trash2 />
                                    </SidebarMenuAction>
                                </SidebarMenuItem>
                            )
                        })
                    )}
                </SidebarMenu>
            </SidebarContent>

            <AlertDialog open={!!dashboardToDelete} onOpenChange={(open) => !open && setDashboardToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the "{dashboardToDelete?.name}" dashboard. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDashboardToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteDashboard} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
