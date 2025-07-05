
export type KpiAggregation = 'sum' | 'average' | 'count' | 'min' | 'max';

export interface TemplateChartDefinition {
  title: string;
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'funnel' | 'treemap' | 'heatmap' | 'gantt' | 'kpi' | 'value-summary';
  dimensionKey: string;
  dimension2Key?: string;
  measureKeys: string[];
  isStacked?: boolean;
  isDonut?: boolean;
  kpiTarget?: number;
  kpiAggregation?: KpiAggregation;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  dataAiHint: string;
  requiredFields: {
    key: string;
    label: string;
    description:string;
    type: 'dimension' | 'measure' | 'time';
  }[];
  charts: TemplateChartDefinition[];
}

export type ColumnMapping = Record<string, string | null>;

export interface DashboardChart {
  id: string;
  title: string;
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar' | 'funnel' | 'treemap' | 'heatmap' | 'gantt' | 'kpi' | 'value-summary';
  dimension: string;
  dimension2?: string;
  measures: string[];
  isStacked?: boolean;
  isDonut?: boolean;
  kpiTarget?: number;
  kpiAggregation?: KpiAggregation;
}

export interface SavedDashboard {
  id: string;
  name: string;
  charts: DashboardChart[];
  createdAt: string;
  data?: any[];
  fileHeaders?: string[];
  isSnapshot?: boolean;
}
