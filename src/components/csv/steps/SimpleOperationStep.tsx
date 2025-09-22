import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Home, ArrowRight, Edit, LayoutTemplate, GitCompare } from 'lucide-react';
import { CSVFile } from '@/lib/transformationEngine';

interface SimpleOperationStepProps {
  files: CSVFile[];
  onWorkflowSelect: (workflow: 'delimiter' | 'template' | 'compare') => void;
  onReturnToHub: () => void;
}

const SimpleOperationStep: React.FC<SimpleOperationStepProps> = ({
  files,
  onWorkflowSelect,
  onReturnToHub
}) => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<'delimiter' | 'template' | 'compare' | null>('delimiter');

  const workflows = [
    {
      id: 'delimiter' as const,
      title: 'CSV umwandeln',
      description: 'Delimiter ändern (Komma ⟷ Semikolon)',
      icon: <Edit className="w-8 h-8" />,
      color: 'from-green-500 to-emerald-600',
      features: ['Komma zu Semikolon', 'Semikolon zu Komma', 'Sofortiger Download'],
      minFiles: 1,
      available: files.length >= 1
    },
    {
      id: 'template' as const,
      title: 'CSV transformieren',
      description: 'Spalten zuordnen und Daten umwandeln',
      icon: <LayoutTemplate className="w-8 h-8" />,
      color: 'from-blue-500 to-cyan-600', 
      features: ['Template Mapping', 'Spalten umbenennen', 'Formeln verwenden'],
      minFiles: 1,
      available: files.length >= 1
    },
    {
      id: 'compare' as const,
      title: 'Unterschiede finden',
      description: 'Zwei Dateien vergleichen und Änderungen anzeigen',
      icon: <GitCompare className="w-8 h-8" />,
      color: 'from-purple-500 to-violet-600',
      features: ['Visueller Vergleich', 'Schreibfehler erkennen', 'Unterschiede exportieren'],
      minFiles: 2,
      available: files.length >= 2
    }
  ];

  const handleNext = () => {
    if (selectedWorkflow) {
      onWorkflowSelect(selectedWorkflow);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <LayoutTemplate className="w-6 h-6 text-primary" />
          Was möchten Sie tun?
        </CardTitle>
        <p className="text-muted-foreground">
          {files.length} Datei(en) hochgeladen • Wählen Sie Ihren Workflow
        </p>
      </div>

      {/* Workflow Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {workflows.map((workflow) => (
          <Card 
            key={workflow.id}
            className={`
              cursor-pointer transition-all duration-300 hover:scale-[1.02] border-2
              ${selectedWorkflow === workflow.id 
                ? 'border-primary shadow-2xl shadow-primary/25' 
                : workflow.available 
                  ? 'border-border hover:border-primary/50 hover:shadow-xl' 
                  : 'opacity-50 cursor-not-allowed border-border'
              }
            `}
            onClick={() => workflow.available && setSelectedWorkflow(workflow.id)}
          >
            <CardContent className="p-6 space-y-4">
              {/* Icon & Status */}
              <div className="flex items-center justify-between">
                <div className={`
                  p-4 rounded-xl bg-gradient-to-r ${workflow.color} text-white
                  ${selectedWorkflow === workflow.id ? 'shadow-lg' : ''}
                `}>
                  {workflow.icon}
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {!workflow.available && (
                    <Badge variant="destructive" className="text-xs">
                      Min. {workflow.minFiles} Dateien
                    </Badge>
                  )}
                  {selectedWorkflow === workflow.id && (
                    <Badge className="text-xs bg-primary">✓ Gewählt</Badge>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{workflow.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{workflow.description}</p>
                </div>
                
                {/* Features */}
                <div className="space-y-2">
                  {workflow.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onReturnToHub} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Neue Dateien
          </Button>
          <Button variant="ghost" onClick={onReturnToHub} className="gap-2">
            <Home className="w-4 h-4" />
            Hub
          </Button>
        </div>
        
        <Button 
          onClick={handleNext}
          disabled={!selectedWorkflow}
          size="lg"
          className="gap-2 px-8"
        >
          Starten
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default SimpleOperationStep;