import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, GitCompare, LayoutTemplate, ArrowRight, Home } from 'lucide-react';
import { CSVFile } from '@/lib/transformationEngine';

interface OperationSelectionStepProps {
  files: CSVFile[];
  onOperationSelect: (operation: 'merge' | 'format_transform' | 'compare') => void;
  onBack: () => void;
  onReturnToHub?: () => void;
}

const OperationSelectionStep: React.FC<OperationSelectionStepProps> = ({
  files,
  onOperationSelect,
  onBack,
  onReturnToHub
}) => {
  const [selectedOperation, setSelectedOperation] = useState<'merge' | 'format_transform' | 'compare' | null>('format_transform');

  // Auto-select based on number of files
  useEffect(() => {
    if (files.length >= 2) {
      setSelectedOperation('format_transform'); // Default to format transform, user can switch
    } else {
      setSelectedOperation('format_transform');
    }
  }, [files.length]);

  const operations = [
    {
      id: 'format_transform' as const,
      title: 'CSV umwandeln',
      description: 'Delimiter ändern (Komma, Semikolon) oder Excel zu CSV',
      icon: <Edit className="w-6 h-6" />,
      color: 'bg-green-500',
      features: ['Komma zu Semikolon', 'Semikolon zu Komma', 'Excel zu CSV'],
      minFiles: 1,
      available: files.length >= 1
    },
    {
      id: 'merge' as const,
      title: 'CSV transformieren', 
      description: 'CSV-Struktur mit Templates umwandeln und Dateien zusammenführen',
      icon: <LayoutTemplate className="w-6 h-6" />,
      color: 'bg-blue-500',
      features: ['Template-Mapping', 'Spalten zuordnen', 'Dateien zusammenführen'],
      minFiles: 1,
      available: files.length >= 1
    },
    {
      id: 'compare' as const,
      title: 'Unterschiede erkennen',
      description: 'Zwei CSV-Dateien vergleichen und Schreibfehler finden',
      icon: <GitCompare className="w-6 h-6" />,
      color: 'bg-purple-500',
      features: ['Visueller Vergleich', 'Schreibfehler erkennen', 'Zeilenweise Unterschiede'],
      minFiles: 2,
      available: files.length >= 2
    }
  ];

  const handleOperationSelect = (operationId: 'merge' | 'format_transform' | 'compare') => {
    setSelectedOperation(operationId);
  };

  const handleNext = () => {
    if (selectedOperation) {
      onOperationSelect(selectedOperation);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-primary/20">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <LayoutTemplate className="w-6 h-6 text-primary" />
            Operation auswählen
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            {files.length} Datei(en) hochgeladen • Wählen Sie Ihren Workflow
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Operation Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {operations.map((operation) => (
              <Card 
                key={operation.id}
                className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                  selectedOperation === operation.id 
                    ? 'border-primary bg-gradient-subtle shadow-elegant glow-button' 
                    : operation.available 
                      ? 'hover:border-primary/50 hover:shadow-md' 
                      : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => operation.available && handleOperationSelect(operation.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl transition-colors ${
                        selectedOperation === operation.id 
                          ? 'bg-primary text-primary-foreground shadow-glow' 
                          : `${operation.color} text-white`
                      }`}>
                        {operation.icon}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{operation.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{operation.description}</p>
                        
                        <div className="flex flex-wrap gap-1">
                          {operation.features.slice(0, 2).map((feature, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5">
                              {feature}
                            </Badge>
                          ))}
                          {operation.features.length > 2 && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              +{operation.features.length - 2} mehr
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {!operation.available && (
                        <Badge variant="destructive" className="text-xs">
                          Min. {operation.minFiles} Dateien
                        </Badge>
                      )}
                      {selectedOperation === operation.id && (
                        <Badge className="text-xs bg-primary">✓ Gewählt</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t border-border/50">
            <div className="flex gap-2">
              <Button variant="outline" onClick={onBack} className="px-4">
                Zurück
              </Button>
              {onReturnToHub && (
                <Button variant="ghost" onClick={onReturnToHub} className="px-4">
                  <Home className="w-4 h-4 mr-2" />
                  Zurück zum Hub
                </Button>
              )}
            </div>
            
            <Button 
              onClick={handleNext}
              disabled={!selectedOperation}
              className="px-8 glow-button"
              size="lg"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Weiter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationSelectionStep;