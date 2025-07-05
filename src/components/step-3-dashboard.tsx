
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DashboardChart, SavedDashboard } from '@/lib/types';
import { ArrowLeft, AlertTriangle, Search, Loader2, Eye, Archive, Edit, Save, Download, ArrowUpDown } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, Area, AreaChart, Pie, PieChart, Cell, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, FunnelChart, Funnel, Treemap, LineChart, Radar } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { useMemo, useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { ColumnDetailsDialog } from './column-details-dialog';
import { RowDetailsDialog } from './row-details-dialog';
import { Tooltip as UITooltip, TooltipContent as UITooltipContent, TooltipTrigger as UITooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { SaveDashboardDialog } from './save-dashboard-dialog';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { EditSnapshotDialog } from './edit-snapshot-dialog';
import { verifyEditPassword } from '@/app/actions';
import { KpiCard } from './kpi-card';
import { Skeleton } from './ui/skeleton';


interface Step3DashboardProps {
    data: any[];
    charts: DashboardChart[];
    onBack: () => void;
    fileHeaders: string[];
    isSnapshotView?: boolean;
    onDashboardSave: () => void;
}

const DATA_WARNING_THRESHOLD = 10000;
const MAX_ROWS_FOR_VIZ = 10000;
const SEARCH_CHUNK_SIZE = 5000;
const CALC_CHUNK_SIZE = 5000;

const THEME_COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
];

const CustomTreemapContent = ({ root, depth, x, y, width, height, index, colors, name }: any) => {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: colors[index % colors.length],
            stroke: '#fff',
            strokeWidth: 2 / (depth + 1e-10),
            strokeOpacity: 1 / (depth + 1e-10),
          }}
        />
        {width > 80 && height > 25 ? (
          <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={14}>
            {name}
          </text>
        ) : null}
      </g>
    );
};

function ChartRenderer({ data, chartConfig }: { data: any[], chartConfig: DashboardChart }) {
    const { title, chartType, dimension, dimension2, measures, isStacked, isDonut } = chartConfig;

    const [chartData, setChartData] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        setIsLoading(true);
        setChartData(null);
        setProgress(0);

        const timeoutId = setTimeout(() => {
            if ((!dimension && !['scatter', 'gantt', 'kpi'].includes(chartType)) || (chartType === 'heatmap' && !dimension2)) {
                setChartData([]);
                setIsLoading(false);
                return;
            }
            if (chartType === 'gantt' && (!dimension || !measures || measures.length < 2)) {
                setChartData([]);
                setIsLoading(false);
                return;
            }

            // Synchronous processing for complex or non-aggregatable chart types that rely on vizData slicing.
            if (['scatter', 'gantt', 'heatmap'].includes(chartType)) {
                 if (chartType === 'heatmap') {
                  if (!dimension || !dimension2 || !measures[0]) { setChartData(null); } else {
                    const yLabels = [...new Set(data.map(row => row[dimension]))].sort();
                    const xLabels = [...new Set(data.map(row => row[dimension2]))].sort();
                    const measureKey = measures[0];
                    let min = Infinity, max = -Infinity;
                    const matrix = yLabels.map(y => xLabels.map(x => {
                      const matchingRows = data.filter(row => row[dimension] === y && row[dimension2] === x);
                      const value = matchingRows.reduce((acc, row) => acc + (Number(row[measureKey]) || 0), 0);
                      if (value < min) min = value;
                      if (value > max) max = value;
                      return { x, y, value };
                    }));
                    setChartData({ matrix, yLabels, xLabels, min, max, measureKey });
                  }
                } else if (chartType === 'gantt') {
                    const taskKey = dimension, startKey = measures[0], endKey = measures[1];
                    if (!taskKey || !startKey || !endKey) { setChartData([]); } else {
                        const processed = data.map(row => ({ task: row[taskKey], start: new Date(row[startKey]), end: new Date(row[endKey]), })).filter(d => d.task && !isNaN(d.start.getTime()) && !isNaN(d.end.getTime()) && d.end >= d.start);
                        if (processed.length === 0) { setChartData([]); } else {
                            const projectStartDate = new Date(Math.min(...processed.map(d => d.start.getTime())));
                            setChartData(processed.map(d => ({ task: d.task, startPadding: (d.start.getTime() - projectStartDate.getTime()), duration: (d.end.getTime() - d.start.getTime()), startDate: d.start.toLocaleDateString(), endDate: d.end.toLocaleDateString(), })));
                        }
                    }
                } else if (chartType === 'scatter') {
                    setChartData(data.map(row => ({ [dimension]: row[dimension], [measures[0]]: Number(row[measures[0]]) || 0, [measures[1]]: Number(row[measures[1]]) || 0, })));
                }
                setIsLoading(false);
                return;
            }

            // Asynchronous, chunked processing for aggregatable charts
            let index = 0;
            const aggregated: Record<string, any> = {};

            const processDataChunk = () => {
                const chunkEnd = Math.min(index + CALC_CHUNK_SIZE, data.length);
                for (let i = index; i < chunkEnd; i++) {
                    const row = data[i];
                    const dimValue = row[dimension] ?? 'N/A';
                    if (dimValue === undefined || dimValue === null) continue;
                    
                    if (!aggregated[dimValue]) {
                        aggregated[dimValue] = { [dimension]: dimValue };
                        measures.forEach(m => aggregated[dimValue][m] = 0);
                    }
                    measures.forEach(m => {
                        const measureValue = row[m];
                        if (measureValue !== null && measureValue !== undefined && !isNaN(Number(measureValue))) {
                            aggregated[dimValue][m] += Number(measureValue);
                        } else {
                            aggregated[dimValue][m] += 1; // Count non-numeric occurrences
                        }
                    });
                }

                index = chunkEnd;
                setProgress(Math.round((index / data.length) * 100));

                if (index < data.length) {
                    setTimeout(processDataChunk, 0);
                } else {
                    let result = Object.values(aggregated);
                    if (chartType === 'pie' || chartType === 'funnel' || chartType === 'treemap') {
                        const measure = measures[0];
                        result = result.map(d => ({ name: d[dimension], value: d[measure] }));
                    }
                    setChartData(result);
                    setIsLoading(false);
                }
            };

            processDataChunk();

        }, 50);
        
        return () => clearTimeout(timeoutId);

    }, [data, chartType, dimension, dimension2, measures]);


    const donutTotal = useMemo(() => {
        if (chartType !== 'pie' || !isDonut || !chartData || !Array.isArray(chartData)) return null;
        return (chartData as {name: string, value: number}[]).reduce((acc, item) => acc + item.value, 0);
    }, [chartType, isDonut, chartData]);

    const rechartsConfig = useMemo(() => {
        return measures.reduce((acc, measure, index) => {
            acc[measure] = {
                label: measure,
                color: THEME_COLORS[index % THEME_COLORS.length],
            };
            return acc;
        }, {} as any);
    }, [measures]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-[300px]">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-muted-foreground mt-2">Calculating... {progress > 0 && `${progress}%`}</p>
                </CardContent>
            </Card>
        );
    }
    
    if (!chartData || (Array.isArray(chartData) && chartData.length === 0)) {
        return (
            <Card>
                <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">Not enough data to display chart.</p>
                </CardContent>
            </Card>
        );
    }


    const renderChart = () => {
        switch(chartType) {
            case 'bar':
                return (
                    <BarChart data={chartData as any[]}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey={dimension} tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        {measures.map((measure, index) => (
                            <Bar key={measure} dataKey={measure} fill={rechartsConfig[measure].color} radius={4} stackId={isStacked ? 'a' : undefined} />
                        ))}
                    </BarChart>
                );
            case 'line':
                 return (
                    <LineChart data={chartData as any[]}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey={dimension} tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        {measures.map((measure, index) => (
                            <Line key={measure} type="monotone" dataKey={measure} stroke={rechartsConfig[measure].color} strokeWidth={2} dot={false} />
                        ))}
                    </LineChart>
                );
            case 'area':
                 return (
                    <AreaChart data={chartData as any[]}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey={dimension} tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        {measures.map((measure) => (
                            <Area key={measure} type="monotone" dataKey={measure} fill={rechartsConfig[measure].color} stroke={rechartsConfig[measure].color} stackId={isStacked ? 'a' : undefined} />
                        ))}
                    </AreaChart>
                );
            case 'pie':
                return (
                    <PieChart>
                         <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                         <Pie 
                            data={chartData as any[]} 
                            dataKey="value" 
                            nameKey="name" 
                            cx="50%" 
                            cy="50%" 
                            outerRadius={120} 
                            innerRadius={isDonut ? 80 : 0}
                            label={isDonut ? false : ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {(chartData as any[]).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={THEME_COLORS[index % THEME_COLORS.length]} />
                            ))}
                         </Pie>
                         {isDonut && donutTotal !== null && (
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-2xl font-bold">
                                {donutTotal.toLocaleString()}
                            </text>
                        )}
                         <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                );
            case 'scatter':
                const xMeasure = measures[0];
                const yMeasure = measures[1];
                return (
                    <ScatterChart>
                        <CartesianGrid />
                        <XAxis type="number" dataKey={xMeasure} name={xMeasure} />
                        <YAxis type="number" dataKey={yMeasure} name={yMeasure} />
                        <ChartTooltip content={<ChartTooltipContent />} cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter name={title} data={chartData as any[]} fill={THEME_COLORS[0]} />
                    </ScatterChart>
                );
            case 'radar':
                return (
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData as any[]}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey={dimension} />
                        <PolarRadiusAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        {measures.map((measure, index) => (
                             <Radar key={measure} name={measure} dataKey={measure} stroke={rechartsConfig[measure].color} fill={rechartsConfig[measure].color} fillOpacity={0.6} />
                        ))}
                    </RadarChart>
                );
            case 'funnel':
                 return (
                    <FunnelChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Funnel dataKey="value" data={chartData as any[]} nameKey="name" isAnimationActive>
                             {(chartData as any[]).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={THEME_COLORS[index % THEME_COLORS.length]} />
                            ))}
                        </Funnel>
                        <ChartLegend content={<ChartLegendContent />} />
                    </FunnelChart>
                );
            case 'treemap':
                 return (
                    <Treemap
                        data={chartData as any[]}
                        dataKey="value"
                        ratio={4 / 3}
                        stroke="#fff"
                        fill={THEME_COLORS[0]}
                        content={<CustomTreemapContent colors={THEME_COLORS} />}
                    />
                );
            case 'gantt':
                const CustomGanttTooltip = ({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                            <div className="bg-background p-2 border rounded-lg shadow-lg text-sm">
                                <p className="font-bold">{data.task}</p>
                                <p>Start: {data.startDate}</p>
                                <p>End: {data.endDate}</p>
                            </div>
                        );
                    }
                    return null;
                };

                if (!chartData || (chartData as any[]).length === 0) {
                    return <div className="flex items-center justify-center h-full text-muted-foreground">Not enough valid data to display Gantt chart. Check start/end dates.</div>;
                }
                
                const validData = data
                    .map(row => ({ start: new Date(row[measures[0]]) }))
                    .filter(d => !isNaN(d.start.getTime()));

                const projectStartDateMs = validData.length > 0 ? Math.min(...validData.map(d => d.start.getTime())) : 0;
                
                const dateTickFormatter = (ms: number) => {
                    if(!projectStartDateMs) return '';
                    return new Date(projectStartDateMs + ms).toLocaleDateString();
                };

                return (
                    <BarChart data={chartData as any[]} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={dateTickFormatter} />
                        <YAxis type="category" dataKey="task" width={150} tick={{width: 140, overflow: 'hidden', textOverflow: 'ellipsis', textAnchor: 'end'}} />
                        <Tooltip content={<CustomGanttTooltip />} cursor={{fill: 'rgba(206, 206, 206, 0.2)'}} />
                        <Legend wrapperStyle={{ display: 'none' }} />
                        <Bar dataKey="startPadding" stackId="a" fill="transparent" />
                        <Bar dataKey="duration" stackId="a" fill={THEME_COLORS[0]} radius={[0, 4, 4, 0]}/>
                    </BarChart>
                );
            case 'heatmap':
                if (!chartData) return <div className="flex items-center justify-center h-full text-muted-foreground">Loading Heatmap...</div>;
                const { matrix, yLabels, xLabels, min, max, measureKey } = chartData as any;
                
                const getColor = (value: number) => {
                    if (max === min || value === null || value === undefined) return 'hsl(210, 20%, 94%)';
                    const percentage = (value - min) / (max - min);
                    const lightness = 90 - (percentage * 60);
                    return `hsl(210, 100%, ${lightness}%)`;
                };

                return (
                    <div className="flex flex-col h-full w-full">
                      <div className="text-sm text-muted-foreground mb-2">{measureKey}</div>
                      <ScrollArea className="flex-grow">
                        <div className="relative">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="text-xs">
                                        <th className="p-2 border bg-card sticky top-0 left-0 z-20"></th>
                                        {xLabels.map((x: string) => <th key={x} className="p-2 border sticky top-0 bg-card z-10 whitespace-nowrap">{x}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrix.map((row: any[], rowIndex: number) => (
                                        <tr key={yLabels[rowIndex]}>
                                            <th className="p-2 border text-left text-xs bg-card sticky left-0 z-10 whitespace-nowrap">{yLabels[rowIndex]}</th>
                                            {row.map((cell) => (
                                                <td key={`${cell.x}-${cell.y}`} className="p-2 border text-center" style={{ backgroundColor: getColor(cell.value) }}>
                                                    <UITooltip>
                                                        <UITooltipTrigger asChild>
                                                          <div className="w-full h-full font-semibold text-white mix-blend-difference">
                                                            {cell.value.toLocaleString()}
                                                          </div>
                                                        </UITooltipTrigger>
                                                        <UITooltipContent>
                                                            <p>{yLabels[rowIndex]} &times; {cell.x}: {cell.value.toLocaleString()}</p>
                                                        </UITooltipContent>
                                                    </UITooltip>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                      </ScrollArea>
                      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                        <span>{min.toLocaleString()}</span>
                        <div className="h-4 flex-1 rounded" style={{ background: `linear-gradient(to right, ${getColor(min)}, ${getColor(max)})` }}></div>
                        <span>{max.toLocaleString()}</span>
                      </div>
                    </div>
                );
            default:
                return <div>Unsupported chart type</div>;
        }
    }

    if (chartType === 'heatmap') {
         return (
            <Card className="h-[400px]">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-4rem)]">
                    {renderChart()}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <ChartContainer config={rechartsConfig} className="h-[300px] w-full">
                    <ResponsiveContainer>
                       {renderChart()}
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

function ValueSummaryCard({ data, chartConfig }: { data: any[], chartConfig: DashboardChart }) {
    const { title, dimension } = chartConfig;
    const [sortConfig, setSortConfig] = useState<{ key: 'value' | 'count'; direction: 'ascending' | 'descending' }>({ key: 'count', direction: 'descending' });
    const [summaryData, setSummaryData] = useState<{ value: string; count: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!dimension || !data) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setProgress(0);

        const counts: Record<string, number> = {};
        let blankCount = 0;
        let index = 0;

        const processChunk = () => {
            const chunkEnd = Math.min(index + CALC_CHUNK_SIZE, data.length);
            for (let i = index; i < chunkEnd; i++) {
                const row = data[i];
                let value = row[dimension];
                if (value === null || value === undefined || String(value).trim() === '') {
                    blankCount++;
                } else {
                    const valueStr = String(value);
                    counts[valueStr] = (counts[valueStr] || 0) + 1;
                }
            }

            index = chunkEnd;
            setProgress(Math.round((index / data.length) * 100));

            if (index < data.length) {
                setTimeout(processChunk, 0); // Yield to main thread
            } else {
                const summarized = Object.entries(counts).map(([value, count]) => ({
                    value,
                    count
                }));

                if (blankCount > 0) {
                    summarized.push({ value: '(Blank)', count: blankCount });
                }
                
                setSummaryData(summarized);
                setIsLoading(false);
            }
        };

        setTimeout(processChunk, 50);

    }, [data, dimension]);

    const sortedSummaryData = useMemo(() => {
        return [...summaryData].sort((a, b) => {
            if (sortConfig.key === 'value') {
                if (a.value === '(Blank)') return 1;
                if (b.value === '(Blank)') return -1;
                const comparison = a.value.localeCompare(b.value);
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            } else {
                const comparison = a.count - b.count;
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            }
        });
    }, [summaryData, sortConfig]);

    const handleSort = (key: 'value' | 'count') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        if (key === 'count' && sortConfig.key !== 'count') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    if (!dimension) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Configuration Incomplete</AlertTitle>
                      <AlertDescription>
                        Please select a column to summarize in the dashboard configuration.
                      </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>
                        Calculating summary for '{dimension}'... {progress}%
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 pt-4">
                        {[...Array(5)].map((_, i) => (
                             <div key={i} className="flex items-center justify-between">
                                <Skeleton className="h-5 w-2/5" />
                                <Skeleton className="h-5 w-1/5" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>
                    Unique values in the '{dimension}' column. Total found: {summaryData.length}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <Button variant="ghost" onClick={() => handleSort('value')} className="px-1">
                                        Value
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                    <Button variant="ghost" onClick={() => handleSort('count')} className="px-1">
                                        Count
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedSummaryData.map(({ value, count }) => (
                                <TableRow key={value}>
                                    <TableCell className="font-bold">{value}</TableCell>
                                    <TableCell className="text-right">{count.toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

export function Step3Dashboard({ data, charts, onBack, fileHeaders, isSnapshotView = false, onDashboardSave }: Step3DashboardProps) {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchProgress, setSearchProgress] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
    const [selectedRow, setSelectedRow] = useState<any | null>(null);
    const [inspectedColumn, setInspectedColumn] = useState<string | null>(null);
    const [resultsPerPage, setResultsPerPage] = useState<number>(50);

    const isLargeDataset = data.length > DATA_WARNING_THRESHOLD;
    const [useFullData, setUseFullData] = useState(isSnapshotView);
    const [isRecalculating, setIsRecalculating] = useState(false);

    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    const [isEditLocked, setIsEditLocked] = useState(isSnapshotView);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

    const handleToggleFullData = () => {
        setIsRecalculating(true);
        setTimeout(() => {
            setUseFullData(prev => !prev);
            setIsRecalculating(false);
        }, 100);
    };

    const handleVerifyPassword = async (password: string) => {
        setIsVerifyingPassword(true);
        try {
            const result = await verifyEditPassword(password);
            if (result.success) {
                setIsEditLocked(false);
                setIsEditDialogOpen(false);
                toast({
                    title: "Edit Mode Unlocked",
                    description: "You can now go back to the configuration screen to edit this dashboard.",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Incorrect Password",
                    description: "The password you entered is incorrect. Please try again.",
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Verification Failed",
                description: "An error occurred while verifying the password.",
            });
        } finally {
            setIsVerifyingPassword(false);
        }
    };

    const handleDownloadPdf = async () => {
        const dashboardElement = document.getElementById('dashboard-to-print');
        if (!dashboardElement) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not find the dashboard element to export.",
            });
            return;
        }
    
        setIsDownloadingPdf(true);
        
        try {
            const canvas = await html2canvas(dashboardElement, {
                useCORS: true,
                scale: 2, // Increase scale for better quality
            });
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save('dashboard-snapshot.pdf');
    
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({
                variant: "destructive",
                title: "PDF Export Failed",
                description: "An unexpected error occurred while generating the PDF.",
            });
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handleSaveDashboard = async (name: string) => {
        setIsSaving(true);
        
        const dashboardToSave: SavedDashboard = {
            id: `dashboard_${Date.now()}`,
            name,
            charts,
            createdAt: new Date().toISOString(),
            data: data,
            fileHeaders: fileHeaders,
            isSnapshot: true,
        };

        try {
            const response = await fetch('/api/dashboards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dashboardToSave),
            });

            if (response.ok) {
                 toast({
                    title: "Dashboard Snapshot Saved!",
                    description: `Your dashboard "${name}" has been saved to the server.`,
                });
                onDashboardSave();
            } else {
                const errorData = await response.json();
                toast({
                    variant: "destructive",
                    title: "Failed to Save Dashboard",
                    description: errorData.message || "An unknown error occurred.",
                });
            }
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Network Error",
                description: "Could not connect to the server to save the dashboard.",
            });
        } finally {
            setIsSaving(false);
            setIsSaveDialogOpen(false);
        }
    };

    const vizData = useMemo(() => {
        if (isLargeDataset && !useFullData) {
            return data.slice(0, MAX_ROWS_FOR_VIZ);
        }
        return data;
    }, [data, isLargeDataset, useFullData]);

    const { kpiCharts, regularCharts, valueSummaryCharts } = useMemo(() => {
        const kpiCharts: DashboardChart[] = [];
        const regularCharts: DashboardChart[] = [];
        const valueSummaryCharts: DashboardChart[] = [];
        charts.forEach(chart => {
            if (chart.chartType === 'kpi') {
                kpiCharts.push(chart);
            } else if (chart.chartType === 'value-summary') {
                valueSummaryCharts.push(chart);
            } else {
                regularCharts.push(chart);
            }
        });
        return { kpiCharts, regularCharts, valueSummaryCharts };
    }, [charts]);

    const columnStats = useMemo(() => {
        if (!inspectedColumn || !data) return null;

        const nonEmptyRows = data.filter(row => {
            const value = row[inspectedColumn];
            return value !== null && value !== undefined && String(value).trim() !== '';
        }).length;

        const blankRows = data.length - nonEmptyRows;

        return {
            totalRows: data.length,
            nonEmptyRows,
            blankRows,
        };
    }, [data, inspectedColumn]);


    const runSearch = () => {
        if (!searchQuery || isSearching) return;
        setIsSearching(true);
        setTimeout(() => {
            const chunkEnd = Math.min(searchProgress + SEARCH_CHUNK_SIZE, data.length);
            const currentChunk = data.slice(searchProgress, chunkEnd);
            const lowerCaseQuery = searchQuery.toLowerCase();
            const newFoundRows = currentChunk.filter(row =>
                Object.values(row).some(value =>
                    value !== null &&
                    value !== undefined &&
                    String(value).toLowerCase().includes(lowerCaseQuery)
                )
            );
            setSearchResults(prev => [...prev, ...newFoundRows]);
            setSearchProgress(chunkEnd);
            setIsSearching(false);
        }, 50);
    };

    const isSearchComplete = searchProgress >= data.length;

    const totalResults = searchResults.length;
    const totalPages = Math.ceil(totalResults / resultsPerPage);
    const indexOfLastResult = currentPage * resultsPerPage;
    const indexOfFirstResult = indexOfLastResult - resultsPerPage;
    const paginatedResults = searchResults.slice(indexOfFirstResult, indexOfLastResult);

    return (
        <div className="space-y-6 relative">
             {(isSaving || isRecalculating) && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-30 rounded-lg border">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="mt-4 text-lg font-semibold">
                        {isSaving ? 'Saving your dashboard...' : 'Recalculating charts...'}
                    </p>
                    {isSaving && <p className="text-sm text-muted-foreground">This may take a moment for large datasets.</p>}
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Your Custom Dashboard</h1>
                    <p className="text-muted-foreground">Dashboard generated with {charts.length} item{charts.length > 1 ? 's' : ''}.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={onBack} disabled={isEditLocked}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Configuration
                    </Button>
                    {isSnapshotView && isEditLocked && (
                        <Button onClick={() => setIsEditDialogOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit Snapshot
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setIsSaveDialogOpen(true)}><Save className="mr-2 h-4 w-4" /> Save Dashboard</Button>
                    <Button variant="outline" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
                        {isDownloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        {isDownloadingPdf ? 'Generating...' : 'Download PDF'}
                    </Button>
                </div>
            </div>

            {isLargeDataset && (
                 <Alert variant={useFullData ? "default" : "destructive"} className="flex items-center justify-between">
                    <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-4" />
                        <div>
                            <AlertTitle>{useFullData ? "Displaying Full Dataset" : "Large Dataset Warning"}</AlertTitle>
                            <AlertDescription>
                                {useFullData
                                    ? `Visualizations are now using all ${data.length.toLocaleString()} rows. Performance may be slower.`
                                    : `To ensure performance, visualizations are using the first ${MAX_ROWS_FOR_VIZ.toLocaleString()} of ${data.length.toLocaleString()} rows.`}
                            </AlertDescription>
                        </div>
                    </div>
                    <Button onClick={handleToggleFullData} disabled={isRecalculating} size="sm">
                        {isRecalculating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            useFullData ? <Eye className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />
                        )}
                        {isRecalculating ? "Calculating..." : (useFullData ? "Show Quick Preview" : "Use Full Dataset")}
                    </Button>
                </Alert>
            )}

            <div className="relative">
                <div id="dashboard-to-print" className="space-y-6">
                    {kpiCharts.length > 0 && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {kpiCharts.map(chartConfig => (
                           <KpiCard key={chartConfig.id} data={data} kpiConfig={chartConfig} />
                        ))}
                        </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                        {regularCharts.map(chartConfig => (
                            <ChartRenderer key={chartConfig.id} data={vizData} chartConfig={chartConfig} />
                        ))}
                        {valueSummaryCharts.map(chartConfig => (
                            <ValueSummaryCard key={chartConfig.id} data={data} chartConfig={chartConfig} />
                        ))}
                    </div>
                </div>
            </div>


            <Card>
                <CardHeader>
                    <CardTitle>Column Completeness</CardTitle>
                    <CardDescription>Select a column to see how many of its rows are filled versus blank.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select onValueChange={setInspectedColumn} value={inspectedColumn ?? undefined}>
                        <SelectTrigger className="w-full sm:w-[300px]">
                            <SelectValue placeholder="Select a column to inspect..." />
                        </SelectTrigger>
                        <SelectContent>
                            {fileHeaders.map(header => (
                                <SelectItem key={header} value={header}>{header}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {columnStats && inspectedColumn && (
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 text-center">
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <div className="text-sm font-medium text-muted-foreground">Total Rows</div>
                                <div className="text-2xl font-bold">{columnStats.totalRows.toLocaleString()}</div>
                            </div>
                             <div className="p-4 bg-muted/50 rounded-lg">
                                <div className="text-sm font-medium text-muted-foreground">Filled Rows</div>
                                <div className="text-2xl font-bold">{columnStats.nonEmptyRows.toLocaleString()}</div>
                                 <p className="text-xs text-muted-foreground">
                                    {columnStats.totalRows > 0 ? `${((columnStats.nonEmptyRows / columnStats.totalRows) * 100).toFixed(1)}%` : '0.0%'}
                                </p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <div className="text-sm font-medium text-muted-foreground">Blank Rows</div>
                                <div className="text-2xl font-bold">{columnStats.blankRows.toLocaleString()}</div>
                                <p className="text-xs text-muted-foreground">
                                    {columnStats.totalRows > 0 ? `${((columnStats.blankRows / columnStats.totalRows) * 100).toFixed(1)}%` : '0.0%'}
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Explore Your Data</CardTitle>
                    <CardDescription>
                        Enter a search term to find matching records across all columns. The search is case-insensitive.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-2">
                         <Input 
                            placeholder="Search across all data..." 
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setSearchResults([]);
                                setSearchProgress(0);
                                setCurrentPage(1);
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { runSearch(); } }}
                            className="flex-grow"
                        />
                        <Button onClick={runSearch} disabled={!searchQuery || isSearching || isSearchComplete}>
                            {isSearching ? <Loader2 className="animate-spin mr-2" /> : <Search className="mr-2 h-4 w-4" />}
                            {isSearching ? 'Searching...' : (searchProgress > 0 && !isSearchComplete ? "Continue Search" : "Search")}
                        </Button>
                    </div>
                     {searchProgress > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Searched {Math.min(searchProgress, data.length).toLocaleString()} of {data.length.toLocaleString()} rows.
                            {isSearchComplete && " Search complete."}
                        </p>
                    )}
                </CardContent>

                {(searchResults.length > 0 || (isSearchComplete && searchQuery)) && (
                     <CardContent>
                        <h3 className="font-medium mb-2 text-lg">Search Results <span className="text-sm text-muted-foreground">({totalResults.toLocaleString()} rows found)</span></h3>
                        {searchResults.length > 0 ? (
                           <>
                                <ScrollArea className="h-80 rounded-md border">
                                    <table className="w-full caption-bottom text-sm">
                                        <TableHeader className="sticky top-0 bg-card z-10">
                                            <TableRow>
                                                <TableHead className="sticky left-0 bg-card z-20 w-16">Actions</TableHead>
                                                {fileHeaders.map(header => 
                                                    <TableHead 
                                                        key={header} 
                                                        className="whitespace-nowrap cursor-pointer hover:bg-muted transition-colors"
                                                        onClick={() => setSelectedColumn(header)}
                                                        title={`Click to see details for "${header}"`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {header}
                                                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                                        </div>
                                                    </TableHead>
                                                )}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedResults.map((row, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="sticky left-0 bg-card z-10">
                                                        <Button variant="ghost" size="icon" onClick={() => setSelectedRow(row)} title="View row details">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                    {fileHeaders.map(header => <TableCell key={header} className="whitespace-nowrap">{String(row[header] ?? '')}</TableCell>)}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </table>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                                <div className="flex items-center justify-between pt-4">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>Page {currentPage} of {totalPages}</span>
                                        <span className="h-4 w-px bg-border" />
                                        <Select value={String(resultsPerPage)} onValueChange={(value) => setResultsPerPage(Number(value))}>
                                            <SelectTrigger className="h-8 w-[120px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="10">10 rows</SelectItem>
                                                <SelectItem value="25">25 rows</SelectItem>
                                                <SelectItem value="50">50 rows</SelectItem>
                                                <SelectItem value="100">100 rows</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-muted-foreground flex flex-col items-center gap-4 py-8 border rounded-lg">
                                <Search className="w-12 h-12 text-muted-foreground/50" />
                                <h3 className="text-lg font-semibold">No Matching Records Found</h3>
                                <p className="text-sm">We've searched the entire dataset and couldn't find any matches for your query.</p>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {selectedColumn && (
                <ColumnDetailsDialog
                    isOpen={!!selectedColumn}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setSelectedColumn(null);
                        }
                    }}
                    columnName={selectedColumn}
                    data={data}
                />
            )}

            {selectedRow && (
                <RowDetailsDialog
                    isOpen={!!selectedRow}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setSelectedRow(null);
                        }
                    }}
                    rowData={selectedRow}
                />
            )}
            
            {isSnapshotView && (
                <EditSnapshotDialog
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    onSubmit={handleVerifyPassword}
                    isVerifying={isVerifyingPassword}
                />
            )}

            <SaveDashboardDialog
                isOpen={isSaveDialogOpen}
                onOpenChange={setIsSaveDialogOpen}
                onSave={handleSaveDashboard}
                isSaving={isSaving}
            />
        </div>
    );
}
