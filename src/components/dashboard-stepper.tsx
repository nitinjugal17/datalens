import { cn } from '@/lib/utils';
import { Check, Upload, Link2, LayoutDashboard } from 'lucide-react';

const steps = [
  { name: 'Upload & Select', icon: Upload },
  { name: 'Map Columns', icon: Link2 },
  { name: 'Create Dashboard', icon: LayoutDashboard },
];

interface DashboardStepperProps {
  currentStep: number;
}

export function DashboardStepper({ currentStep }: DashboardStepperProps) {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center justify-between">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className="relative">
            {currentStep > stepIdx + 1 ? (
              <div className="flex items-center">
                <span className="flex items-center justify-center w-10 h-10 bg-primary rounded-full">
                  <Check className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
                </span>
                <span className="ml-4 text-sm font-medium text-primary">{step.name}</span>
              </div>
            ) : currentStep === stepIdx + 1 ? (
              <div className="flex items-center" aria-current="step">
                <span className="flex items-center justify-center w-10 h-10 border-2 border-primary rounded-full">
                  <step.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                </span>
                <span className="ml-4 text-sm font-medium text-primary">{step.name}</span>
              </div>
            ) : (
              <div className="flex items-center">
                <span className="flex items-center justify-center w-10 h-10 border-2 border-border rounded-full">
                   <step.icon className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                </span>
                <span className="ml-4 text-sm font-medium text-muted-foreground">{step.name}</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
