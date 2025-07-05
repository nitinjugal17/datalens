
'use client';
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ArrowRight, PlusCircle, Trash2, ChevronDown, BarChart, LineChart, PieChart, AreaChart, ScatterChart, Radar, Waypoints, SquareStack, Grid, GanttChart, Target, ListOrdered } from 'lucide-react';
import type { DashboardChart, KpiAggregation } from '@/lib/types';
import { HowToAccordion } from './how-to-accordion';
import { Switch } from './ui/switch';

interface Step2ConfigureProps {
    headers: string[];
    onBack: () => void;
    onComplete: (charts: DashboardChart[]) => void;
    initialCharts: DashboardChart[];
}

interface ChartEditorProps {
    chart: DashboardChart;
    headers: string[];
    onUpdate: (id: string, newConfig: Partial<DashboardChart>) => void;
    onRemove: (id: string) => void;
    isOnlyChart: boolean;
}

const chartTypeDetails: Record<DashboardChart['chartType'], { icon: React.ElementType, label: string, description: string, req: {dim: number, mea: number} }> = {
    bar: { icon: BarChart, label: 'Bar Chart', description: 'Compares values across categories. Can be stacked. Requires 1 dimension and 1+ measures.', req: {dim: 1, mea: 1}},
    line: { icon: LineChart, label: 'Line Chart', description: 'Shows trends over time. Requires 1 dimension and 1+ measures.', req: {dim: 1, mea: 1}},
    pie: { icon: PieChart, label: 'Pie/Donut Chart', description: 'Shows parts of a whole. Can be displayed as a donut. Requires 1 dimension and 1 measure.', req: {dim: 1, mea: 1}},
    area: { icon: AreaChart, label: 'Area Chart', description: 'Shows volume over time. Can be stacked. Requires 1 dimension and 1+ measures.', req: {dim: 1, mea: 1}},
    scatter: { icon: ScatterChart, label: 'Scatter Plot', description: 'Shows relationship between two measures. Requires 2+ measures.', req: {dim: 0, mea: 2}},
    radar: { icon: Radar, label: 'Radar Chart', description: 'Compares multiple variables. Requires 1 dimension and 1+ measures.', req: {dim: 1, mea: 1}},
    funnel: { icon: Waypoints, label: 'Funnel Chart', description: 'Shows stages in a process. Requires 1 dimension and 1 measure.', req: {dim: 1, mea: 1}},
    treemap: { icon: SquareStack, label: 'Treemap', description: 'Shows hierarchical data. Requires 1 dimension and 1 measure.', req: {dim: 1, mea: 1}},
    heatmap: { icon: Grid, label: 'Heatmap', description: 'Use color intensity to represent values in a matrix. Requires 2 dimensions and 1 measure.', req: {dim: 2, mea: 1}},
    gantt: { icon: GanttChart, label: 'Gantt Chart', description: 'Visualizes project schedules. Requires 1 task dimension, a start date, and an end date.', req: {dim: 1, mea: 2}},
    kpi: { icon: Target, label: 'KPI Card', description: 'Displays a single key metric against an optional target. Requires 1 measure.', req: {dim: 0, mea: 1}},
    'value-summary': { icon: ListOrdered, label: 'Value Summary', description: 'Displays a summary table of unique values and their counts for a selected column, including blank entries.', req: {dim: 1, mea: 0}},
};

function MultiSelectMeasures({ headers, selectedMeasures, onSelectionChange }: { headers: string[], selectedMeasures: string[], onSelectionChange: (newMeasures: string[]) => void }) {
    const [isOpen, setIsOpen] = useState(false);

    const handleMeasureChange = (header: string, checked: boolean) => {
        if (checked) {
            onSelectionChange([...selectedMeasures, header]);
        } else {
            onSelectionChange(selectedMeasures.filter(m => m !== header));
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                    <span>{selectedMeasures.length > 0 ? `${selectedMeasures.length} selected` : "Select measures..."}</span>
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <ScrollArea className="h-48">
                    <div className="p-4 space-y-2">
                        {headers.map(header => (
                            <div key={header} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`measure-${header}`}
                                    checked={selectedMeasures.includes(header)}
                                    onCheckedChange={(checked) => handleMeasureChange(header, !!checked)}
                                />
                                <Label htmlFor={`measure-${header}`} className="font-normal">{header}</Label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}


function ChartEditor({ chart, headers, onUpdate, onRemove, isOnlyChart }: ChartEditorProps) {
    const details = chartTypeDetails[chart.chartType];
    
    const onChartTypeChange = (value: DashboardChart['chartType']) => {
        const newDetails = chartTypeDetails[value];
        const newConfig: Partial<DashboardChart> = { chartType: value };

        if (value === 'kpi') {
            newConfig.dimension = '';
            newConfig.dimension2 = undefined;
            newConfig.isStacked = undefined;
            newConfig.isDonut = undefined;
            newConfig.measures = chart.measures.slice(0, 1);
            newConfig.kpiAggregation = 'sum';
        } else if (value === 'value-summary') {
            newConfig.dimension2 = undefined;
            newConfig.measures = [];
            newConfig.isStacked = undefined;
            newConfig.isDonut = undefined;
            newConfig.kpiTarget = undefined;
            newConfig.kpiAggregation = undefined;
        } else {
            newConfig.kpiTarget = undefined;
            newConfig.kpiAggregation = undefined;
            
            if (newDetails.req.dim < 2) newConfig.dimension2 = undefined;
            if (value !== 'bar' && value !== 'area') newConfig.isStacked = undefined;
            if (value !== 'pie') newConfig.isDonut = undefined;

            if (newDetails.req.mea === 1 && chart.measures.length > 1) {
                newConfig.measures = [chart.measures[0]];
            }
            if (value === 'gantt') {
                newConfig.measures = [];
            }
        }
        
        onUpdate(chart.id, newConfig);
    };

    const getDimensionLabel = () => {
        switch(chart.chartType) {
            case 'heatmap': return 'Dimension (Y-Axis)';
            case 'gantt': return 'Task / Activity Column';
            default: return 'Dimension (X-Axis/Labels)';
        }
    }

    if (chart.chartType === 'kpi') {
        return (
            <Card className="bg-muted/50">
                <CardHeader className="py-4 px-4 flex-row items-center justify-between">
                    <CardTitle className="text-lg">
                        <Input
                            value={chart.title}
                            onChange={(e) => onUpdate(chart.id, { title: e.target.value })}
                            className="text-lg font-semibold p-1 h-auto bg-transparent border-0 rounded-none focus-visible:ring-0 focus-visible:border-b"
                            placeholder="KPI Card Title"
                        />
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => onRemove(chart.id)} disabled={isOnlyChart}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <Label>Item Type</Label>
                            <Select value={chart.chartType} onValueChange={onChartTypeChange}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(chartTypeDetails).map(([key, {icon: Icon, label}]) => (
                                        <SelectItem key={key} value={key}>
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4" />
                                                {label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Measure</Label>
                            <Select value={chart.measures[0] || ''} onValueChange={(value) => onUpdate(chart.id, { measures: [value] })}>
                                <SelectTrigger><SelectValue placeholder="Select a measure..." /></SelectTrigger>
                                <SelectContent>
                                    {headers.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Aggregation</Label>
                            <Select value={chart.kpiAggregation || 'sum'} onValueChange={(value) => onUpdate(chart.id, { kpiAggregation: value as KpiAggregation })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sum">Sum</SelectItem>
                                    <SelectItem value="average">Average</SelectItem>
                                    <SelectItem value="count">Count (All Rows)</SelectItem>
                                    <SelectItem value="min">Minimum</SelectItem>
                                    <SelectItem value="max">Maximum</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Target (Optional)</Label>
                            <Input
                                type="number"
                                placeholder="e.g., 1000000"
                                value={chart.kpiTarget ?? ''}
                                onChange={(e) => onUpdate(chart.id, { kpiTarget: e.target.value ? Number(e.target.value) : undefined })}
                            />
                        </div>
                    </div>
                     <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded-md border">
                        {details.description}
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    if (chart.chartType === 'value-summary') {
        return (
             <Card className="bg-muted/50">
                <CardHeader className="py-4 px-4 flex-row items-center justify-between">
                    <CardTitle className="text-lg">
                        <Input
                            value={chart.title}
                            onChange={(e) => onUpdate(chart.id, { title: e.target.value })}
                            className="text-lg font-semibold p-1 h-auto bg-transparent border-0 rounded-none focus-visible:ring-0 focus-visible:border-b"
                            placeholder="Value Summary Title"
                        />
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => onRemove(chart.id)} disabled={isOnlyChart}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label>Item Type</Label>
                            <Select value={chart.chartType} onValueChange={onChartTypeChange}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(chartTypeDetails).map(([key, {icon: Icon, label}]) => (
                                        <SelectItem key={key} value={key}>
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4" />
                                                {label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Column to Summarize</Label>
                            <Select value={chart.dimension} onValueChange={(value) => onUpdate(chart.id, { dimension: value })}>
                                <SelectTrigger><SelectValue placeholder="Select a column..." /></SelectTrigger>
                                <SelectContent>
                                    {headers.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded-md border">
                        {details.description}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-muted/50">
            <CardHeader className="py-4 px-4 flex-row items-center justify-between">
                <CardTitle className="text-lg">
                    <Input
                        value={chart.title}
                        onChange={(e) => onUpdate(chart.id, { title: e.target.value })}
                        className="text-lg font-semibold p-1 h-auto bg-transparent border-0 rounded-none focus-visible:ring-0 focus-visible:border-b"
                        placeholder="Chart Title"
                    />
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => onRemove(chart.id)} disabled={isOnlyChart}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <Label>Item Type</Label>
                        <Select value={chart.chartType} onValueChange={onChartTypeChange}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {Object.entries(chartTypeDetails).map(([key, {icon: Icon, label}]) => (
                                     <SelectItem key={key} value={key}>
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-4 w-4" />
                                            {label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label>{getDimensionLabel()}</Label>
                        <Select value={chart.dimension} onValueChange={(value) => onUpdate(chart.id, { dimension: value })} disabled={details.req.dim === 0}>
                            <SelectTrigger><SelectValue placeholder={details.req.dim > 0 ? "Select a dimension..." : "Not applicable"} /></SelectTrigger>
                            <SelectContent>
                                {headers.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     {chart.chartType === 'heatmap' && (
                        <div className="space-y-1">
                            <Label>Dimension (X-Axis)</Label>
                            <Select value={chart.dimension2 || ''} onValueChange={(value) => onUpdate(chart.id, { dimension2: value })}>
                                <SelectTrigger><SelectValue placeholder="Select a dimension..." /></SelectTrigger>
                                <SelectContent>
                                    {headers.filter(h => h !== chart.dimension).map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {chart.chartType === 'gantt' ? (
                        <>
                            <div className="space-y-1">
                                <Label>Start Date Column</Label>
                                <Select value={chart.measures[0] || ''} onValueChange={(value) => onUpdate(chart.id, { measures: [value, chart.measures[1] || ''] })}>
                                    <SelectTrigger><SelectValue placeholder="Select start date..." /></SelectTrigger>
                                    <SelectContent>
                                        {headers.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label>End Date Column</Label>
                                <Select value={chart.measures[1] || ''} onValueChange={(value) => onUpdate(chart.id, { measures: [chart.measures[0] || '', value] })}>
                                    <SelectTrigger><SelectValue placeholder="Select end date..." /></SelectTrigger>
                                    <SelectContent>
                                        {headers.map(header => <SelectItem key={header} value={header}>{header}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-1">
                            <Label>Measures (Y-Axis/Values)</Label>
                            <MultiSelectMeasures
                                headers={headers}
                                selectedMeasures={chart.measures}
                                onSelectionChange={(newMeasures) => onUpdate(chart.id, { measures: newMeasures })}
                            />
                        </div>
                    )}
                </div>
                <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded-md border">
                    {details.description}
                </div>
                <div className="flex items-center space-x-4 pt-2">
                    {(chart.chartType === 'bar' || chart.chartType === 'area') && chart.measures.length > 1 && (
                        <div className="flex items-center space-x-2">
                            <Switch 
                                id={`stacked-${chart.id}`}
                                checked={!!chart.isStacked}
                                onCheckedChange={(checked) => onUpdate(chart.id, { isStacked: checked })}
                            />
                            <Label htmlFor={`stacked-${chart.id}`} className="font-normal">Stack values</Label>
                        </div>
                    )}
                    {chart.chartType === 'pie' && (
                         <div className="flex items-center space-x-2">
                            <Switch 
                                id={`donut-${chart.id}`}
                                checked={!!chart.isDonut}
                                onCheckedChange={(checked) => onUpdate(chart.id, { isDonut: checked })}
                            />
                            <Label htmlFor={`donut-${chart.id}`} className="font-normal">Display as Donut</Label>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export function Step2Mapping({ headers, onBack, onComplete, initialCharts }: Step2ConfigureProps) {
    const [charts, setCharts] = useState<DashboardChart[]>(initialCharts);

    useEffect(() => {
        setCharts(initialCharts);
    }, [initialCharts]);

    const handleUpdateChart = (id: string, newConfig: Partial<DashboardChart>) => {
        setCharts(charts.map(c => c.id === id ? { ...c, ...newConfig } : c));
    };

    const handleRemoveChart = (id: string) => {
        if (charts.length > 1) {
            setCharts(charts.filter(c => c.id !== id));
        }
    };

    const handleAddChart = () => {
        const newChart: DashboardChart = {
            id: `chart_${Date.now()}`,
            title: `Item ${charts.length + 1}`,
            chartType: 'bar',
            dimension: '',
            measures: [],
            kpiAggregation: 'sum',
        };
        setCharts([...charts, newChart]);
    };

    const isComplete = useMemo(() => {
        return charts.length > 0 && charts.every(c => {
            const details = chartTypeDetails[c.chartType];
            
            if (c.chartType === 'kpi') {
                return !!(c.title && c.measures.length === 1 && c.measures[0]);
            }
             if (c.chartType === 'value-summary') {
                return !!(c.title && c.dimension);
            }
            
            let hasAllDimensions = false;
            if (details.req.dim === 2) {
                hasAllDimensions = !!(c.dimension && c.dimension2);
            } else if (details.req.dim === 1) {
                hasAllDimensions = !!c.dimension;
            } else {
                hasAllDimensions = true;
            }

            const hasMeasures = c.measures.length >= details.req.mea;
            
            if (c.chartType === 'pie' && c.measures.length !== 1) return false;
            if (c.chartType === 'gantt' && (c.measures.length !== 2 || !c.measures[0] || !c.measures[1])) return false;
            if (c.chartType === 'heatmap' && c.measures.length !== 1) return false;


            return c.title && hasAllDimensions && hasMeasures;
        });
    }, [charts]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Configure Your Dashboard</CardTitle>
                <CardDescription>Add and configure charts or KPI cards to build your dashboard. You need at least one item.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {charts.map((chart) => (
                    <ChartEditor
                        key={chart.id}
                        chart={chart}
                        headers={headers}
                        onUpdate={handleUpdateChart}
                        onRemove={handleRemoveChart}
                        isOnlyChart={charts.length <= 1}
                    />
                ))}
                <Button variant="outline" onClick={handleAddChart} className="w-full border-dashed">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Another Item
                </Button>
                 <div className="mt-6">
                    <HowToAccordion title="How to build your dashboard">
                      <p>Create a custom dashboard by configuring one or more visual items.</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li><strong>Templates:</strong> Selecting a template provides an AI-powered starting point. You can customize the generated items freely.</li>
                        <li><strong>Add Items:</strong> Click "Add Another Item" to add a new chart or KPI card to your dashboard.</li>
                        <li><strong>Configure Each Item:</strong> For each item, provide a title and select a type (e.g. Chart, KPI, Value Summary).
                            <ul className="list-inside list-['-_'] ml-4 mt-1 space-y-1">
                                <li><b>For Charts:</b> Select a chart type and map columns from your data.
                                    <ul className="list-inside list-['--'] ml-4 mt-1 space-y-1">
                                        <li><b>Dimension:</b> This is your categorical data for labels, like 'Product' or 'Region'. Some charts like Heatmaps require two dimensions.</li>
                                        <li><b>Measures:</b> These are the numerical values to be plotted, like 'Sales' or 'Quantity'. Some charts accept multiple measures.</li>
                                    </ul>
                                </li>
                                <li><b>For KPI Cards:</b> Display a single, important number.
                                     <ul className="list-inside list-['--'] ml-4 mt-1 space-y-1">
                                        <li><b>Measure:</b> The numeric column you want to analyze.</li>
                                        <li><b>Aggregation:</b> How you want to calculate the value (e.g., Sum, Average, Count).</li>
                                        <li><b>Target (Optional):</b> A goal value. If set, a progress bar will be shown on the card.</li>
                                    </ul>
                                </li>
                                <li><b>For Value Summaries:</b> Show a table of unique values and their counts.
                                     <ul className="list-inside list-['--'] ml-4 mt-1 space-y-1">
                                        <li><b>Column to Summarize:</b> The column whose values you want to count.</li>
                                    </ul>
                                </li>
                            </ul>
                        </li>
                        <li><strong>Remove Items:</strong> You can remove any item by clicking the trash icon, as long as there is more than one on the dashboard.</li>
                        <li><strong>Proceed:</strong> Once all your items are configured correctly, the "Create Dashboard" button will be enabled.</li>
                      </ul>
                    </HowToAccordion>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                <Button disabled={!isComplete} onClick={() => onComplete(charts)}>
                    Create Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
}
