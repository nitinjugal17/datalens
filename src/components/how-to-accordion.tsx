import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Info } from "lucide-react";

interface HowToAccordionProps {
  title: string;
  children: React.ReactNode;
}

export function HowToAccordion({ title, children }: HowToAccordionProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="item-1">
        <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:text-primary hover:no-underline">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span>{title}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="text-sm text-muted-foreground prose prose-sm max-w-none">
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
