import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, Database, FileText, Settings, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ollamaAPI } from '@/lib/ollamaApi';
import { workflowStorage } from '@/lib/workflowStorage';

interface SourceFile {
  name: string;
  columns: string;
  encoding: string;
}

interface TransformationPlan {
  sourceFiles: SourceFile[];
  targetFile: string;
  targetColumns: string;
  transformations: {
    comparison: string;
    cleaning: string;
    merging: string;
    mapping: string;
    logic: string;
  };
  ollamaConnected: boolean;
}

const ETLWizard = () => {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<TransformationPlan>({
    sourceFiles: [{ name: '', columns: '', encoding: 'UTF-8' }],
    targetFile: '',
    targetColumns: '',
    transformations: {
      comparison: '',
      cleaning: '',
      merging: '',
      mapping: '',
      logic: ''
    },
    ollamaConnected: false
  });
  const [generatedPlan, setGeneratedPlan] = useState<string>('');

  const addSourceFile = () => {
    setPlan(prev => ({
      ...prev,
      sourceFiles: [...prev.sourceFiles, { name: '', columns: '', encoding: 'UTF-8' }]
    }));
  };

  const updateSourceFile = (index: number, field: keyof SourceFile, value: string) => {
    setPlan(prev => ({
      ...prev,
      sourceFiles: prev.sourceFiles.map((file, i) => 
        i === index ? { ...file, [field]: value } : file
      )
    }));
  };

  const testOllamaConnection = async () => {
    try {
      const isConnected = await ollamaAPI.testConnection();
      setPlan(prev => ({ ...prev, ollamaConnected: isConnected }));
    } catch (error) {
      setPlan(prev => ({ ...prev, ollamaConnected: false }));
    }
  };

  const generatePlan = async () => {
    if (!plan.ollamaConnected) return;

    try {
      const prompt = `Erstelle einen ETL-Transformationsplan basierend auf folgenden Spezifikationen:

Quelldateien:
${plan.sourceFiles.map(f => `- ${f.name} (Spalten: ${f.columns}, Kodierung: ${f.encoding})`).join('\n')}

Zieldatei: ${plan.targetFile}
Zielspalten: ${plan.targetColumns}

Transformationen:
- Vergleich: ${plan.transformations.comparison}
- Bereinigung: ${plan.transformations.cleaning}
- Zusammenführung: ${plan.transformations.merging}
- Mapping: ${plan.transformations.mapping}
- Logik: ${plan.transformations.logic}

Generiere eine detaillierte JSON-Konfiguration mit Modulen für CSV-Reader, Datenvergleich, Bereinigung, Merger und Writer.`;

      const response = await ollamaAPI.generateCompletion(prompt);
      
      // Try to extract JSON from response
      let planData;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        planData = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Kein gültiges JSON generiert', raw: response };
      } catch (e) {
        planData = { error: 'JSON Parse Error', raw: response };
      }

      setGeneratedPlan(JSON.stringify(planData, null, 2));
      setStep(5);

      // Save as workflow
      const workflow = {
        name: `ETL Plan - ${plan.targetFile}`,
        description: 'Automatisch generierter ETL-Plan',
        category: 'transformation' as const,
        steps: [
          {
            id: '1',
            type: 'source' as const,
            name: 'CSV Import',
            config: { files: plan.sourceFiles },
            position: { x: 50, y: 100 }
          },
          {
            id: '2',
            type: 'transform' as const,
            name: 'Datenverarbeitung',
            config: { transformations: plan.transformations },
            position: { x: 250, y: 100 }
          },
          {
            id: '3',
            type: 'output' as const,
            name: 'CSV Export',
            config: { outputFile: plan.targetFile, columns: plan.targetColumns },
            position: { x: 450, y: 100 }
          }
        ],
        mappings: []
      };

      workflowStorage.saveWorkflow(workflow);
    } catch (error) {
      console.error('Fehler bei der Plan-Generierung:', error);
      setGeneratedPlan(JSON.stringify({ error: 'Plan-Generierung fehlgeschlagen', details: error instanceof Error ? error.message : 'Unbekannter Fehler' }, null, 2));
      setStep(5);
    }
  };

  const steps = [
    { title: 'Ollama Setup', icon: Settings },
    { title: 'Quell-Dateien', icon: FileText },
    { title: 'Ziel-Schema', icon: Database },
    { title: 'Transformationen', icon: Zap },
    { title: 'Generierter Plan', icon: CheckCircle2 }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-data bg-clip-text text-transparent">
          ETL Automation Expert
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Erstellen Sie präzise Transformationspläne für CSV-Datenverarbeitung mit KI-Unterstützung
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4">
          {steps.map((stepItem, index) => {
            const StepIcon = stepItem.icon;
            return (
              <React.Fragment key={index}>
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-smooth ${
                  step > index + 1 ? 'bg-success text-success-foreground' :
                  step === index + 1 ? 'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  <StepIcon className="w-4 h-4" />
                  <span className="text-sm font-medium">{stepItem.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-px ${step > index + 1 ? 'bg-success' : 'bg-border'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step 1: Ollama Setup */}
      {step === 1 && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Ollama-Verbindung testen
            </CardTitle>
            <CardDescription>
              Stellen Sie sicher, dass die Verbindung zur Ollama-API funktioniert
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Wichtiger Hinweis</AlertTitle>
              <AlertDescription>
                Stellen Sie sicher, dass Ollama lokal läuft und die API erreichbar ist. 
                Dies garantiert die Verfügbarkeit der KI-gestützten Funktionen.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="ollama-url">Ollama API URL</Label>
                <Input 
                  id="ollama-url" 
                  defaultValue="http://localhost:11434" 
                  placeholder="http://localhost:11434"
                />
              </div>
              
              <div className="flex gap-4">
                <Button 
                  onClick={testOllamaConnection} 
                  variant="outline" 
                  className="flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Verbindung testen
                </Button>
                
                {plan.ollamaConnected && (
                  <Badge variant="default" className="bg-success text-success-foreground">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verbunden
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!plan.ollamaConnected}
                className="bg-gradient-primary"
              >
                Weiter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Source Files */}
      {step === 2 && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Quell-Dateien definieren
            </CardTitle>
            <CardDescription>
              Geben Sie die Details Ihrer CSV-Quelldateien an
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {plan.sourceFiles.map((file, index) => (
              <Card key={index} className="border-2 border-dashed border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Quell-Datei {index + 1}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Dateiname</Label>
                    <Input
                      value={file.name}
                      onChange={(e) => updateSourceFile(index, 'name', e.target.value)}
                      placeholder="z.B. export_kunden_alt.csv"
                    />
                  </div>
                  <div>
                    <Label>Relevante Spalten</Label>
                    <Input
                      value={file.columns}
                      onChange={(e) => updateSourceFile(index, 'columns', e.target.value)}
                      placeholder="Spalte1, Spalte2, Spalte3"
                    />
                  </div>
                  <div>
                    <Label>Zeichenkodierung</Label>
                    <Input
                      value={file.encoding}
                      onChange={(e) => updateSourceFile(index, 'encoding', e.target.value)}
                      placeholder="UTF-8"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-4">
              <Button onClick={addSourceFile} variant="outline">
                Weitere Datei hinzufügen
              </Button>
            </div>

            <div className="flex justify-between">
              <Button onClick={() => setStep(1)} variant="outline">
                Zurück
              </Button>
              <Button onClick={() => setStep(3)} className="bg-gradient-primary">
                Weiter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Target Schema */}
      {step === 3 && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Ziel-Schema definieren
            </CardTitle>
            <CardDescription>
              Definieren Sie die Struktur Ihrer Zieldatei
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="target-file">Name der Zieldatei</Label>
              <Input
                id="target-file"
                value={plan.targetFile}
                onChange={(e) => setPlan(prev => ({ ...prev, targetFile: e.target.value }))}
                placeholder="z.B. import_bereinigt.csv"
              />
            </div>

            <div>
              <Label htmlFor="target-columns">Benötigte Spalten</Label>
              <Textarea
                id="target-columns"
                value={plan.targetColumns}
                onChange={(e) => setPlan(prev => ({ ...prev, targetColumns: e.target.value }))}
                placeholder="AccountID, Name, Email, Status, Priorität"
                rows={3}
              />
            </div>

            <div className="flex justify-between">
              <Button onClick={() => setStep(2)} variant="outline">
                Zurück
              </Button>
              <Button onClick={() => setStep(4)} className="bg-gradient-primary">
                Weiter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Transformations */}
      {step === 4 && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Transformationsregeln
            </CardTitle>
            <CardDescription>
              Definieren Sie alle Bereinigungsaktionen und Logik
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Datenvergleich (CSV Diff)</Label>
              <Textarea
                value={plan.transformations.comparison}
                onChange={(e) => setPlan(prev => ({
                  ...prev,
                  transformations: { ...prev.transformations, comparison: e.target.value }
                }))}
                placeholder="Vergleiche Datei A mit Datei B anhand der Spalte 'Benutzer-ID'..."
                rows={3}
              />
            </div>

            <Separator />

            <div>
              <Label>Datenbereinigung</Label>
              <Textarea
                value={plan.transformations.cleaning}
                onChange={(e) => setPlan(prev => ({
                  ...prev,
                  transformations: { ...prev.transformations, cleaning: e.target.value }
                }))}
                placeholder="Entferne Whitespace aus Spalte 'Name'&#10;Konvertiere 'Email' in Kleinbuchstaben&#10;Ersetze leere Werte in 'Status' mit 'Unbekannt'"
                rows={4}
              />
            </div>

            <Separator />

            <div>
              <Label>Spalten-Mapping & Logik</Label>
              <Textarea
                value={plan.transformations.mapping}
                onChange={(e) => setPlan(prev => ({
                  ...prev,
                  transformations: { ...prev.transformations, mapping: e.target.value }
                }))}
                placeholder="Mappe 'Firma' auf 'AccountID'&#10;Erstelle 'Status' mit Wert 'Neu'&#10;Wenn 'Betrag' > 1000, setze 'Priorität' auf 'Hoch'"
                rows={4}
              />
            </div>

            <div className="flex justify-between">
              <Button onClick={() => setStep(3)} variant="outline">
                Zurück
              </Button>
              <Button onClick={generatePlan} className="bg-gradient-primary">
                Plan generieren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Generated Plan */}
      {step === 5 && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Generierter Transformationsplan
            </CardTitle>
            <CardDescription>
              Ihr ETL-Workflow als JSON-Konfiguration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <CheckCircle2 className="w-4 h-4" />
              <AlertTitle>Plan erfolgreich generiert</AlertTitle>
              <AlertDescription>
                Der Transformationsplan wurde basierend auf Ihren Spezifikationen erstellt und kann direkt von der Anwendung verarbeitet werden.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                {generatedPlan}
              </pre>
            </div>

            <div className="flex gap-4">
              <Button onClick={() => setStep(4)} variant="outline">
                Zurück
              </Button>
              <Button className="bg-gradient-primary">
                Plan exportieren
              </Button>
              <Button onClick={() => {
                setStep(1);
                setGeneratedPlan('');
              }} variant="outline">
                Neuen Plan erstellen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ETLWizard;