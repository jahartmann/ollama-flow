import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Merge, Split, Filter, Plus, Brain, Sparkles } from 'lucide-react';
import { CSVFile } from '@/lib/transformationEngine';
import { ollamaAPI } from '@/lib/ollamaApi';
import { useToast } from '@/hooks/use-toast';

interface ProcessStepProps {
  files: CSVFile[];
  onProcess: (operation: string, options: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const ProcessStep: React.FC<ProcessStepProps> = ({
  files,
  onProcess,
  onNext,
  onBack
}) => {
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [operationOptions, setOperationOptions] = useState<any>({});
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const { toast } = useToast();

  const operations = [
    {
      id: 'merge',
      title: 'Dateien zusammenführen',
      description: 'Verbindet mehrere CSV-Dateien zu einer einzigen Datei',
      icon: <Merge className="w-5 h-5" />,
      minFiles: 2,
      available: files.length >= 2
    },
    {
      id: 'filter',
      title: 'Daten filtern',
      description: 'Filtert Zeilen basierend auf Kriterien',
      icon: <Filter className="w-5 h-5" />,
      minFiles: 1,
      available: files.length >= 1
    },
    {
      id: 'transform',
      title: 'Spalten transformieren',
      description: 'Ändern, hinzufügen oder entfernen von Spalten',
      icon: <Plus className="w-5 h-5" />,
      minFiles: 1,
      available: files.length >= 1
    },
    {
      id: 'ai_transform',
      title: 'KI-gesteuerte Transformation',
      description: 'Lassen Sie die KI Ihre Daten intelligent transformieren',
      icon: <Brain className="w-5 h-5" />,
      minFiles: 1,
      available: files.length >= 1
    },
    {
      id: 'skip',
      title: 'Ohne Verarbeitung fortfahren',
      description: 'Direkt zum Template-Schritt',
      icon: <ArrowRight className="w-5 h-5" />,
      minFiles: 1,
      available: files.length >= 1
    }
  ];

  const handleOperationSelect = (operationId: string) => {
    setSelectedOperation(operationId);
    
    if (operationId === 'skip') {
      onNext();
      return;
    }
    
    // Set default options based on operation
    switch (operationId) {
      case 'merge':
        setOperationOptions({ method: 'append' });
        break;
      case 'filter':
        setOperationOptions({ column: '', condition: 'contains', value: '' });
        break;
      case 'transform':
        setOperationOptions({ transformations: [] });
        break;
      case 'ai_transform':
        setOperationOptions({ prompt: '', analysis: null });
        break;
    }
  };

  const executeOperation = async () => {
    if (selectedOperation && selectedOperation !== 'skip') {
      if (selectedOperation === 'ai_transform') {
        await handleAiTransformation();
      } else {
        onProcess(selectedOperation, operationOptions);
      }
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
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Datenverarbeitung wählen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Operation Selection */}
          <div className="grid gap-4">
            {operations.map((operation) => (
              <Card 
                key={operation.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedOperation === operation.id 
                    ? 'border-primary bg-primary/5' 
                    : operation.available 
                      ? 'hover:border-primary/50' 
                      : 'opacity-50 cursor-not-allowed'
                }`}
                onClick={() => operation.available && handleOperationSelect(operation.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        selectedOperation === operation.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        {operation.icon}
                      </div>
                      <div>
                        <h3 className="font-medium">{operation.title}</h3>
                        <p className="text-sm text-muted-foreground">{operation.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!operation.available && (
                        <Badge variant="outline" className="text-xs">
                          Min. {operation.minFiles} Dateien benötigt
                        </Badge>
                      )}
                      {selectedOperation === operation.id && (
                        <Badge className="text-xs">Ausgewählt</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Operation Options */}
          {selectedOperation && selectedOperation !== 'skip' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Optionen konfigurieren</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedOperation === 'merge' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Zusammenführungs-Methode</label>
                      <Select 
                        value={operationOptions.method} 
                        onValueChange={(value) => setOperationOptions(prev => ({ ...prev, method: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Methode auswählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="append">Anhängen (alle Zeilen)</SelectItem>
                          <SelectItem value="join">Verknüpfen (gemeinsame Spalte)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {operationOptions.method === 'join' && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Verknüpfungs-Spalte</label>
                        <Select 
                          value={operationOptions.joinColumn || ''} 
                          onValueChange={(value) => setOperationOptions(prev => ({ ...prev, joinColumn: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Spalte auswählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {files[0]?.headers.map(header => (
                              <SelectItem key={header} value={header}>{header}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
                
                {selectedOperation === 'filter' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Spalte</label>
                      <Select 
                        value={operationOptions.column} 
                        onValueChange={(value) => setOperationOptions(prev => ({ ...prev, column: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Spalte" />
                        </SelectTrigger>
                        <SelectContent>
                          {files[0]?.headers.map(header => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Bedingung</label>
                      <Select 
                        value={operationOptions.condition} 
                        onValueChange={(value) => setOperationOptions(prev => ({ ...prev, condition: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Bedingung" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Enthält</SelectItem>
                          <SelectItem value="equals">Ist gleich</SelectItem>
                          <SelectItem value="starts_with">Beginnt mit</SelectItem>
                          <SelectItem value="not_empty">Nicht leer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Wert</label>
                      <input 
                        type="text"
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        value={operationOptions.value}
                        onChange={(e) => setOperationOptions(prev => ({ ...prev, value: e.target.value }))}
                        placeholder="Filterwert"
                      />
                    </div>
                  </div>
                )}

                {selectedOperation === 'ai_transform' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        KI-Transformationsanweisung
                      </label>
                      <Textarea
                        placeholder="Beschreiben Sie, wie die Daten transformiert werden sollen... z.B.: 'Erstelle eine neue Spalte Email aus Vorname und Nachname', 'Filtere alle Einträge mit Status aktiv', 'Bereinige die Telefonnummern'"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Die KI analysiert Ihre Daten und führt die gewünschten Transformationen durch.
                      </p>
                    </div>

                    {operationOptions.analysis && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Brain className="w-4 h-4" />
                          KI-Analyse
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {operationOptions.analysis}
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleAiTransformation}
                      disabled={!aiPrompt.trim() || isAiProcessing}
                      variant="outline"
                      className="w-full"
                    >
                      {isAiProcessing ? (
                        <>
                          <Brain className="w-4 h-4 mr-2 animate-pulse" />
                          KI verarbeitet...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          KI-Analyse starten
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onBack}>
              Zurück
            </Button>
            
            <Button 
              onClick={executeOperation}
              disabled={!selectedOperation || (selectedOperation === 'ai_transform' && isAiProcessing)}
              className="px-8"
            >
              {selectedOperation === 'skip' ? 'Überspringen' : 
               selectedOperation === 'ai_transform' && isAiProcessing ? 'KI verarbeitet...' :
               'Verarbeiten & Weiter'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProcessStep;