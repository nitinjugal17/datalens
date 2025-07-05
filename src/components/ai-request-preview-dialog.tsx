'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useState, useEffect } from 'react';
import { HowToAccordion } from './how-to-accordion';
import { Wand2 } from 'lucide-react';

interface AIRequestPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  columnHeaders: string[];
  templateFields: string[];
  onSubmit: (editedHeaders: string[], editedFields: string[]) => void;
  onCancel: () => void;
}

export function AIRequestPreviewDialog({
  isOpen,
  onOpenChange,
  columnHeaders,
  templateFields,
  onSubmit,
  onCancel,
}: AIRequestPreviewDialogProps) {
  const [editableColumnHeaders, setEditableColumnHeaders] = useState('');
  const [editableTemplateFields, setEditableTemplateFields] = useState('');

  useEffect(() => {
    if (isOpen) {
      setEditableColumnHeaders(columnHeaders.join('\n'));
      setEditableTemplateFields(templateFields.join('\n'));
    }
  }, [isOpen, columnHeaders, templateFields]);

  const handleSubmit = () => {
    const finalHeaders = editableColumnHeaders.split('\n').map(h => h.trim()).filter(Boolean);
    const finalFields = editableTemplateFields.split('\n').map(f => f.trim()).filter(Boolean);
    onSubmit(finalHeaders, finalFields);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            Review AI Request
          </DialogTitle>
          <DialogDescription>
            This is the information that will be sent to the AI to suggest column mappings. You can edit it below to refine the request.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
                <Label htmlFor="column-headers-textarea">Your File's Column Headers</Label>
                <Textarea
                    id="column-headers-textarea"
                    value={editableColumnHeaders}
                    onChange={(e) => setEditableColumnHeaders(e.target.value)}
                    rows={10}
                    className="text-sm"
                    placeholder="One header per line..."
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="template-fields-textarea">Dashboard Template Fields</Label>
                 <Textarea
                    id="template-fields-textarea"
                    value={editableTemplateFields}
                    onChange={(e) => setEditableTemplateFields(e.target.value)}
                    rows={10}
                    className="text-sm"
                    placeholder="One field per line..."
                />
            </div>
        </div>

        <HowToAccordion title="How does this work?">
            <p>To pre-configure your dashboard, we send the list of column headers from your file and the required fields from the template to an AI model.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The AI analyzes the semantic meaning of both lists to find the best matches.</li>
                <li>You can edit the lists above to guide the AI. For example, you could simplify a complex column header like "User_First-Name_2024" to just "First Name" to improve matching accuracy.</li>
                <li>Removing fields from the "Template Fields" list will mean the AI won't try to find a match for them.</li>
            </ul>
        </HowToAccordion>

        <DialogFooter className="mt-4">
            <DialogClose asChild>
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmit}>
                <Wand2 className="mr-2 h-4 w-4" /> Get AI Suggestions
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
