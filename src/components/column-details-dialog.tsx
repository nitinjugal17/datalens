'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from './ui/table';
import { useMemo } from 'react';
import { Badge } from './ui/badge';

interface ColumnDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  columnName: string | null;
  data: any[];
}

const MAX_UNIQUE_VALUES_TO_SHOW = 100;

export function ColumnDetailsDialog({
  isOpen,
  onOpenChange,
  columnName,
  data,
}: ColumnDetailsDialogProps) {
  const stats = useMemo(() => {
    if (!columnName || !data || data.length === 0) {
      return null;
    }

    const values = data.map(row => row[columnName]).filter(value => value !== null && value !== undefined && String(value).trim() !== '');
    const uniqueValues = [...new Set(values)];
    
    const numericValues = values.map(Number).filter(v => !isNaN(v));
    let numericStats = null;
    if (numericValues.length > 0 && numericValues.length / values.length > 0.8) { // Heuristic: if 80% are numbers, treat as numeric
        const sum = numericValues.reduce((acc, v) => acc + v, 0);
        const avg = sum / numericValues.length;
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);
        numericStats = { sum, avg, min, max };
    }


    return {
      totalRows: data.length,
      nonEmptyRows: values.length,
      uniqueCount: uniqueValues.length,
      uniqueValuesSample: uniqueValues.slice(0, MAX_UNIQUE_VALUES_TO_SHOW),
      numericStats,
    };
  }, [columnName, data]);

  if (!stats || !columnName) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Column Details: <span className="text-primary">{columnName}</span></DialogTitle>
          <DialogDescription>
            A summary of the data in the selected column based on the full dataset.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-muted-foreground">Total Rows in Dataset</div>
                <div className="text-xl font-bold">{stats.totalRows.toLocaleString()}</div>
            </div>
             <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-muted-foreground">Non-Empty Rows</div>
                <div className="text-xl font-bold">{stats.nonEmptyRows.toLocaleString()}</div>
            </div>
             <div className="p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-muted-foreground">Unique Values</div>
                <div className="text-xl font-bold">{stats.uniqueCount.toLocaleString()}</div>
            </div>
             {stats.numericStats && (
                 <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="font-medium text-muted-foreground">Data Type</div>
                    <div className="text-xl font-bold">Potentially Numeric</div>
                </div>
             )}
        </div>

        {stats.numericStats && (
            <div className="space-y-2">
                <h4 className="font-semibold">Numeric Summary</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-center text-sm">
                    <div className="p-2 bg-muted/50 rounded-md">
                        <div className="text-xs text-muted-foreground">Sum</div>
                        <div className="font-semibold">{stats.numericStats.sum.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-md">
                        <div className="text-xs text-muted-foreground">Average</div>
                        <div className="font-semibold">{stats.numericStats.avg.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                    </div>
                     <div className="p-2 bg-muted/50 rounded-md">
                        <div className="text-xs text-muted-foreground">Min</div>
                        <div className="font-semibold">{stats.numericStats.min.toLocaleString()}</div>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-md">
                        <div className="text-xs text-muted-foreground">Max</div>
                        <div className="font-semibold">{stats.numericStats.max.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        )}

        <div className="space-y-2">
          <h4 className="font-semibold">
            Unique Values Preview
            <Badge variant="secondary" className="ml-2">
              Showing first {Math.min(stats.uniqueCount, MAX_UNIQUE_VALUES_TO_SHOW)} of {stats.uniqueCount}
            </Badge>
          </h4>
          <ScrollArea className="h-60 rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Value</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {stats.uniqueValuesSample.map((value, index) => (
                    <TableRow key={index}>
                    <TableCell>{String(value)}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
