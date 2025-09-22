import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Merge, Split, Filter, Plus, Brain, Sparkles, Home, Zap } from 'lucide-react';
import { CSVFile } from '@/lib/transformationEngine';
import { ollamaAPI } from '@/lib/ollamaApi';
import { useToast } from '@/hooks/use-toast';

interface ProcessStepProps {
  files: CSVFile[];
  onProcess: (operation: string, options: any) => void;
  onNext: () => void;
  onBack: () => void;
  onReturnToHub?: () => void;
}

const ProcessStep: React.FC<ProcessStepProps> = ({
  files,
  onProcess,
  onNext,
  onBack,
  onReturnToHub
}) => {
  const [selectedOperation, setSelectedOperation] = useState<string>('merge');
  const [operationOptions, setOperationOptions] = useState<any>({});
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const { toast } = useToast();

  // Auto-select merge as default (only operation available in simplified version)
  useEffect(() => {
    setSelectedOperation('merge');
  }, []);

  const operations = [
    {
      id: 'merge',
      title: 'Dateien zusammenführen',
      description: 'Verbindet alle CSV-Dateien zu einer einzigen Datei durch Anhängen',
      icon: <Merge className="w-5 h-5" />,
      minFiles: 2,
      available: files.length >= 2
    }
  ];

  const handleOperationSelect = (operationId: string) => {
    setSelectedOperation(operationId);
    // Set default options for merge (only available operation)
    if (operationId === 'merge') {
      setOperationOptions({ method: 'append' });
    }
  };

  const executeOperation = async () => {
    if (selectedOperation === 'merge') {
      onProcess(selectedOperation, operationOptions);
    }
    onNext();
  };

  const handleAiTransformation = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Eingabe erforderlich",
        description: "Bitte beschreiben Sie, wie die Daten transformiert werden sollen",
        variant: "destructive"
      });
      return;
    }

    setIsAiProcessing(true);
    try {
      const result = await ollamaAPI.processDataTransformation(
        files[0].data.slice(0, 10), // Send first 10 rows for context
        aiPrompt,
        files[0].headers // Pass headers to AI
      );
      
      toast({
        title: "KI-Transformation abgeschlossen",
        description: "Die KI hat Ihre Daten analysiert und Transformationsvorschläge erstellt"
      });

      // Store AI analysis in operation options
      setOperationOptions(prev => ({
        ...prev,
        analysis: result.explanation,
        transformedData: result.transformedData
      }));
      
      onProcess('ai_transform', {
        prompt: aiPrompt,
        analysis: result.explanation,
        transformedData: result.transformedData
      });
    } catch (error) {
      toast({
        title: "KI-Transformation fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive"
      });
    } finally {
      setIsAiProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-primary/20">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Zap className="w-6 h-6 text-primary" />
            Datenverarbeitung wählen
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Wählen Sie, wie Ihre Daten transformiert werden sollen
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Operation Selection */}
          <div className="grid gap-3">
            {operations.map((operation) => (
              <Card 
                key={operation.id}
                className={`cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                  selectedOperation === operation.id 
                    ? 'border-primary bg-gradient-subtle shadow-elegant' 
                    : operation.available 
                      ? 'hover:border-primary/50 hover:shadow-md' 
                      : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => operation.available && handleOperationSelect(operation.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl transition-colors ${
                        selectedOperation === operation.id 
                          ? 'bg-primary text-primary-foreground shadow-glow' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}>
                        {operation.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{operation.title}</h3>
                        <p className="text-sm text-muted-foreground">{operation.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
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

          {/* Operation Description */}
          {selectedOperation === 'merge' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Zusammenführung</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Alle {files.length} CSV-Dateien werden zu einer einzigen Datei zusammengeführt, 
                  indem alle Zeilen angehängt werden. Die erste Datei bestimmt die Spaltenreihenfolge.
                </p>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Dateien:</div>
                  {files.map((file, index) => (
                    <div key={file.id} className="text-sm">
                      {index + 1}. {file.name} ({file.data.length} Zeilen)
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
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
              onClick={executeOperation}
              disabled={!selectedOperation}
              className="px-8 glow-button"
              size="lg"
            >
              Dateien zusammenführen & Weiter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessStep;