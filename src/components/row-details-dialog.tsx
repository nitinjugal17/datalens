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

interface RowDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rowData: { [key: string]: any } | null;
}

export function RowDetailsDialog({
  isOpen,
  onOpenChange,
  rowData,
}: RowDetailsDialogProps) {
  if (!rowData) {
    return null;
  }

  const entries = Object.entries(rowData);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Row Details</DialogTitle>
          <DialogDescription>
            A detailed view of all the data in the selected row.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[40%]">Column</TableHead>
                        <TableHead>Value</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {entries.map(([key, value]) => (
                    <TableRow key={key}>
                        <TableCell className="font-medium">{key}</TableCell>
                        <TableCell>{String(value)}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
