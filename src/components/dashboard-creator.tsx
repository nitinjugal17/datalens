
'use client';
import { useState, useEffect } from 'react';
import type { DashboardChart, Template, ColumnMapping, SavedDashboard } from '@/lib/types';
import { DashboardStepper } from './dashboard-stepper';
import { Step1Upload } from './step-1-upload';
import { Step2Mapping } from './step-2-mapping';
import { Step3Dashboard } from './step-3-dashboard';
import { AnimatePresence, motion } from 'framer-motion';
import { getAISuggestions } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AIRequestPreviewDialog } from './ai-request-preview-dialog';

interface DashboardCreatorProps {
    selection: Template | SavedDashboard | null;
    onDashboardSave: () => void;
}

const generateChartsFromTemplate = (template: Template, mapping: ColumnMapping): DashboardChart[] => {
    return template.charts.map((chartDef, index) => {
        const dimension = mapping[chartDef.dimensionKey] ?? '';
        const measures = chartDef.measureKeys.map(key => mapping[key] ?? '').filter(Boolean);
        return {
            id: `chart_${Date.now()}_${index}`,
            title: chartDef.title,
            chartType: chartDef.chartType,
            dimension: dimension,
            measures: measures,
            isStacked: chartDef.isStacked,
        };
    }).filter(chart => chart.dimension && chart.measures.length > 0);
};

export function DashboardCreator({ selection, onDashboardSave }: DashboardCreatorProps) {
    const [step, setStep] = useState(1);
    const [uploadedData, setUploadedData] = useState<any[] | null>(null);
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [charts, setCharts] = useState<DashboardChart[]>([]);
    const [initialChartsForStep2, setInitialChartsForStep2] = useState<DashboardChart[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Pre-configuring Dashboard...');
    const { toast } = useToast();

    const [isAIPreviewOpen, setIsAIPreviewOpen] = useState(false);
    const [aiRequestData, setAiRequestData] = useState<{ headers: string[], templateFields: string[] } | null>(null);
    const [isSnapshotView, setIsSnapshotView] = useState(false);

    useEffect(() => {
        const loadSavedDashboard = async (dashboard: SavedDashboard) => {
            setIsLoading(true);
            setLoadingMessage('Loading saved dashboard...');
            try {
                const response = await fetch(`/api/dashboards/${dashboard.id}`);
                if (!response.ok) throw new Error('Failed to fetch dashboard data');
                
                const fullDashboard: SavedDashboard = await response.json();
    
                setUploadedData(fullDashboard.data!);
                setFileHeaders(fullDashboard.fileHeaders!);
                setCharts(fullDashboard.charts);
                setStep(3);
                toast({
                    title: "Snapshot Loaded",
                    description: `Loaded the saved dashboard snapshot "${fullDashboard.name}".`
                });
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
                toast({
                    variant: "destructive",
                    title: "Failed to Load Dashboard",
                    description: "Could not retrieve the saved dashboard data from the server.",
                });
                setStep(1); // Reset
            } finally {
                setIsLoading(false);
            }
        };
    
        const isSavedDashboard = selection && 'createdAt' in selection;
        setIsSnapshotView(false);
        
        if (isSavedDashboard) {
            const savedDashboard = selection as SavedDashboard;
            if (savedDashboard.isSnapshot) {
                // It's a snapshot, it needs to be fetched from the server
                setIsSnapshotView(true);
                loadSavedDashboard(savedDashboard);
            } else {
                // It's a layout, go to step 1 for data upload, but prepare for step 2
                setStep(1);
                setUploadedData(null);
                setFileHeaders([]);
                setCharts([]);
                setInitialChartsForStep2(savedDashboard.charts.map(c => ({...c, id: `chart_${Date.now()}_${Math.random()}`})));
                toast({
                    title: "Layout Loaded",
                    description: `Upload a new data file to use the "${savedDashboard.name}" layout.`,
                });
            }
        } else {
            // Reset state for new creation flow (template or custom)
            setStep(1);
            setUploadedData(null);
            setFileHeaders([]);
            setCharts([]);
            setInitialChartsForStep2(null);
        }
    }, [selection, toast]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            // Modern browsers show a generic message, but this is required to trigger it.
            event.returnValue = 'You have unsaved changes that will be lost. Are you sure you want to leave?';
        };

        const hasUnsavedWork = uploadedData && !isSnapshotView;

        if (hasUnsavedWork) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [uploadedData, isSnapshotView]);


    const handleStep1Complete = async (data: any[], headers:string[]) => {
        setUploadedData(data);
        setFileHeaders(headers);
        setCharts([]); 

        const isTemplate = selection && 'requiredFields' in selection;
        const isSavedLayout = selection && 'createdAt' in selection && !(selection as SavedDashboard).isSnapshot;

        if (isTemplate) {
            const template = selection as Template;
            setAiRequestData({ headers, templateFields: template.requiredFields.map(f => f.key) });
            setIsAIPreviewOpen(true);
        } else if (isSavedLayout) {
             toast({
                variant: "default",
                title: "Saved Layout Loaded",
                description: "Map your new data to the saved chart configurations.",
            });
            setStep(2);
        }
        else {
            // Custom dashboard flow
            setInitialChartsForStep2([{ id: `chart_initial`, title: 'My First Chart', chartType: 'bar', dimension: '', measures: [] }]);
            setStep(2);
        }
    };

    const handleAISuggestionSubmit = async (editedHeaders: string[], editedTemplateFieldKeys: string[]) => {
        setIsLoading(true);
        setLoadingMessage('Pre-configuring Dashboard...');
        setIsAIPreviewOpen(false);

        const template = selection as Template;

        if (!template || !('requiredFields' in template)) {
            toast({ variant: "destructive", title: "Error", description: "Template not found." });
            setIsLoading(false);
            return;
        }

        const aiResult = await getAISuggestions({ columnHeaders: editedHeaders, templateFields: editedTemplateFieldKeys });

        if (aiResult.error) {
            toast({
                variant: "destructive",
                title: "AI Configuration Failed",
                description: "There was an error getting AI suggestions. Please configure charts manually.",
            });
            setInitialChartsForStep2([{ id: `chart_initial`, title: 'My First Chart', chartType: 'bar', dimension: '', measures: [] }]);
        } else {
            const initialCharts = generateChartsFromTemplate(template, aiResult.suggestedMappings);

            if(initialCharts.length === 0) {
                 toast({
                    variant: "default",
                    title: "Could Not Generate Charts",
                    description: "AI couldn't confidently map your columns to the template. Please configure charts manually.",
                });
            } else {
                 toast({
                    variant: "default",
                    title: "Dashboard Pre-configured!",
                    description: "We've created some charts for you based on the template. You can customize them now.",
                });
            }

            setInitialChartsForStep2(initialCharts.length > 0 ? initialCharts : [{ id: `chart_initial`, title: 'My First Chart', chartType: 'bar', dimension: '', measures: [] }]);
        }

        setIsLoading(false);
        setStep(2);
    };
    
    const handleCancelAISuggestions = () => {
        setIsAIPreviewOpen(false);
        setInitialChartsForStep2([{ id: `chart_initial`, title: 'My First Chart', chartType: 'bar', dimension: '', measures: [] }]);
        setStep(2);
    };

    const handleStep2Complete = (newCharts: DashboardChart[]) => {
        setCharts(newCharts);
        setStep(3);
    };
    
    const handleBackToStep1 = () => {
        setStep(1);
        setUploadedData(null);
        setFileHeaders([]);
        setCharts([]);
        setInitialChartsForStep2(null);
    }

    const handleBackToStep2 = () => {
        setInitialChartsForStep2(charts);
        setStep(2);
    }
    
    const pageVariants = {
      initial: { opacity: 0, x: 50 },
      in: { opacity: 1, x: 0 },
      out: { opacity: 0, x: -50 },
    };

    const pageTransition = {
      type: "tween",
      ease: "anticipate",
      duration: 0.5,
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 text-center p-8 border-2 border-dashed rounded-lg h-96">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <h2 className="text-xl font-semibold">{loadingMessage}</h2>
                <p className="text-muted-foreground">
                    {loadingMessage === 'Pre-configuring Dashboard...' 
                        ? 'The AI is analyzing your columns and building initial charts. Please wait a moment.' 
                        : 'Fetching your saved data from the server...'}
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <DashboardStepper currentStep={step} />
                {selection && 'requiredFields' in selection && aiRequestData && (
                    <AIRequestPreviewDialog
                        isOpen={isAIPreviewOpen}
                        onOpenChange={(open) => {
                            if (!open) {
                                handleCancelAISuggestions();
                            } else {
                                setIsAIPreviewOpen(true);
                            }
                        }}
                        columnHeaders={aiRequestData.headers}
                        templateFields={aiRequestData.templateFields}
                        onSubmit={handleAISuggestionSubmit}
                        onCancel={handleCancelAISuggestions}
                    />
                )}
                <AnimatePresence mode="wait">
                    {step === 1 && (
                         <motion.div
                            key="step1"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={pageVariants}
                            transition={pageTransition}
                         >
                            <Step1Upload onComplete={handleStep1Complete} />
                        </motion.div>
                    )}
                    {step === 2 && initialChartsForStep2 && (
                        <motion.div
                            key="step2"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={pageVariants}
                            transition={pageTransition}
                        >
                            <Step2Mapping 
                                headers={fileHeaders} 
                                onBack={handleBackToStep1} 
                                onComplete={handleStep2Complete}
                                initialCharts={initialChartsForStep2}
                            />
                        </motion.div>
                    )}
                    {step === 3 && uploadedData && charts.length > 0 && (
                        <motion.div
                            key="step3"
                            initial="initial"
                            animate="in"
                            exit="out"
                            variants={pageVariants}
                            transition={pageTransition}
                        >
                           <Step3Dashboard 
                                data={uploadedData}
                                charts={charts}
                                onBack={handleBackToStep2}
                                fileHeaders={fileHeaders}
                                isSnapshotView={isSnapshotView}
                                onDashboardSave={onDashboardSave}
                           />
                        </motion.div>
                    )}
                </AnimatePresence>
        </div>
    );
}
