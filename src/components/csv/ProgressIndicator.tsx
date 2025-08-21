import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';

export interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  completedSteps
}) => {
  const progressPercentage = (currentStep / (steps.length - 1)) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Fortschritt</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = currentStep === index;
          const isUpcoming = currentStep < index;

          return (
            <div key={step.id} className="flex items-center gap-4">
              {/* Step Icon/Number */}
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                  isCurrent ? 'bg-primary/10 border-primary text-primary' : 
                  'bg-muted border-muted-foreground/20 text-muted-foreground'}
              `}>
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-medium ${
                    isCurrent ? 'text-primary' : 
                    isCompleted ? 'text-foreground' : 
                    'text-muted-foreground'
                  }`}>
                    {step.title}
                  </h3>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-xs">
                      Aktuell
                    </Badge>
                  )}
                  {isCompleted && (
                    <Badge variant="outline" className="text-xs text-primary border-primary">
                      Abgeschlossen
                    </Badge>
                  )}
                </div>
                <p className={`text-sm ${
                  isCurrent ? 'text-muted-foreground' : 
                  isCompleted ? 'text-muted-foreground' : 
                  'text-muted-foreground/60'
                }`}>
                  {step.description}
                </p>
              </div>

              {/* Arrow */}
              {index < steps.length - 1 && (
                <ArrowRight className={`w-4 h-4 ${
                  isCompleted ? 'text-primary' : 'text-muted-foreground/40'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressIndicator;