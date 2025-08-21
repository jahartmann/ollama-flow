import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, GitCompare, LayoutTemplate, ArrowRight } from 'lucide-react';
import { CSVFile } from '@/lib/transformationEngine';

interface OperationSelectionStepProps {
  files: CSVFile[];
  onOperationSelect: (operation: 'transform' | 'compare') => void;
  onBack: () => void;
}

const OperationSelectionStep: React.FC<OperationSelectionStepProps> = ({
  files,
  onOperationSelect,
  onBack
}) => {
  const [selectedOperation, setSelectedOperation] = useState<'transform' | 'compare' | null>(null);

  const operations = [
    {
      id: 'transform' as const,
      title: 'Bearbeiten & Transformieren',
      description: 'CSV-Dateien bearbeiten, zusammenführen, filtern und in neue Formate umwandeln',
      icon: <Edit className="w-6 h-6" />,
      color: 'bg-blue-500',
      features: ['Dateien zusammenführen', 'Daten filtern', 'Templates anwenden', 'KI-Unterstützung'],
      minFiles: 1,
      available: files.length >= 1
    },
    {
      id: 'compare' as const,
      title: 'Vergleichen & Differenzen',
      description: 'Unterschiede zwischen CSV-Dateien analysieren und visualisieren',
      icon: <GitCompare className="w-6 h-6" />,
      color: 'bg-green-500',
      features: ['Unterschiede finden', 'Änderungen visualisieren', 'Differenz-Reports', 'Side-by-Side Vergleich'],
      minFiles: 2,
      available: files.length >= 2
    }
  ];

  const handleOperationSelect = (operationId: 'transform' | 'compare') => {
    setSelectedOperation(operationId);
  };

  const handleNext = () => {
    if (selectedOperation) {
      onOperationSelect(selectedOperation);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            Operation auswählen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Was möchten Sie mit Ihren CSV-Dateien machen? Wählen Sie zwischen Bearbeitung/Transformation 
              oder Vergleich/Differenzanalyse.
            </p>
            
            <div className="text-sm text-muted-foreground">
              <strong>Hochgeladene Dateien:</strong> {files.length} Datei(en)
            </div>
          </div>

          {/* Operation Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {operations.map((operation) => (
              <Card 
                key={operation.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedOperation === operation.id 
                    ? 'border-primary bg-primary/5 shadow-lg' 
                    : operation.available 
                      ? 'hover:border-primary/50' 
                      : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => operation.available && handleOperationSelect(operation.id)}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-full ${operation.color} text-white`}>
                        {operation.icon}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!operation.available && (
                          <Badge variant="outline" className="text-xs">
                            Min. {operation.minFiles} Dateien
                          </Badge>
                        )}
                        {selectedOperation === operation.id && (
                          <Badge className="text-xs">Ausgewählt</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{operation.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{operation.description}</p>
                      
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Features:</h4>
                        <ul className="space-y-1">
                          {operation.features.map((feature, index) => (
                            <li key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-primary"></div>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onBack}>
              Zurück
            </Button>
            
            <Button 
              onClick={handleNext}
              disabled={!selectedOperation}
              className="px-8"
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