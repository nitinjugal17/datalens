'use client';

import { useState, useEffect } from 'react';
import type { DashboardChart } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Package, TrendingUp, HelpCircle, Target } from 'lucide-react';

const KpiIcons: { [key: string]: React.ElementType } = {
    revenue: DollarSign,
    sales: DollarSign,
    income: DollarSign,
    units: Package,
    count: Package,
    population: TrendingUp,
    rate: TrendingUp,
    target: Target,
    goal: Target,
    default: HelpCircle,
};

const getKpiIcon = (key: string) => {
    const lowerKey = key.toLowerCase();
    for (const keyword in KpiIcons) {
        if (lowerKey.includes(keyword)) {
            return KpiIcons[keyword];
        }
    }
    return KpiIcons.default;
};

interface KpiCardProps {
    data: any[];
    kpiConfig: DashboardChart;
}

const PROCESS_CHUNK_SIZE = 20000;

export function KpiCard({ data, kpiConfig }: KpiCardProps) {
    const [value, setValue] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!data || !kpiConfig.measures[0]) {
            setValue(0);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setValue(null);
        setProgress(0);

        const measure = kpiConfig.measures[0];
        const aggregation = kpiConfig.kpiAggregation;
        
        if (aggregation === 'count') {
            setValue(data.length);
            setIsLoading(false);
            return;
        }

        let rollingSum = 0;
        let rollingCount = 0;
        let rollingMin = Infinity;
        let rollingMax = -Infinity;
        
        let index = 0;
        const processChunk = () => {
            const chunkEnd = Math.min(index + PROCESS_CHUNK_SIZE, data.length);
            for (let i = index; i < chunkEnd; i++) {
                const v = Number(data[i][measure]);
                if (!isNaN(v)) {
                    rollingSum += v;
                    rollingCount++;
                    if (v < rollingMin) rollingMin = v;
                    if (v > rollingMax) rollingMax = v;
                }
            }

            index = chunkEnd;
            setProgress(Math.round((index / data.length) * 100));

            if (index < data.length) {
                setTimeout(processChunk, 0); // Yield to main thread
            } else {
                let result = 0;
                switch (aggregation) {
                    case 'sum':
                        result = rollingSum;
                        break;
                    case 'average':
                        result = rollingCount > 0 ? rollingSum / rollingCount : 0;
                        break;
                    case 'min':
                        result = rollingMin === Infinity ? 0 : rollingMin;
                        break;
                    case 'max':
                        result = rollingMax === -Infinity ? 0 : rollingMax;
                        break;
                }
                setValue(result);
                setIsLoading(false);
            }
        };

        setTimeout(processChunk, 50); // Start processing after a short delay

    }, [data, kpiConfig]);

    if (isLoading || value === null) {
        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-1/2 mb-2" />
                    {isLoading && <p className="text-xs text-muted-foreground mt-1">Calculating... {progress}%</p>}
                </CardContent>
            </Card>
        );
    }

    const Icon = getKpiIcon(kpiConfig.title);
    const isCurrency = kpiConfig.title.toLowerCase().includes('revenue') || kpiConfig.title.toLowerCase().includes('sale') || kpiConfig.title.toLowerCase().includes('income');
    const target = kpiConfig.kpiTarget;
    const targetProgress = (target && target > 0) ? (value / target) * 100 : null;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpiConfig.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {isCurrency && '$'}
                    {value.toLocaleString(undefined, { maximumFractionDigits: isCurrency ? 2 : 0 })}
                </div>
                {target !== undefined && target !== null ? (
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                            Target: {isCurrency && '$'}{target.toLocaleString()}
                        </p>
                        <Progress value={targetProgress ?? 0} className="h-2" />
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        {kpiConfig.kpiAggregation && `${kpiConfig.kpiAggregation.charAt(0).toUpperCase() + kpiConfig.kpiAggregation.slice(1)}`} from all records
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
