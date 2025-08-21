import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus,
  ArrowRight,
  Trash2,
  Move,
  Settings,
  Play,
  Save,
  Database,
  Filter,
  Shuffle,
  FileOutput
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  type: 'source' | 'transform' | 'filter' | 'output';
  name: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

interface FieldMapping {
  source: string;
  target: string;
  transformation?: string;
}

const VisualWorkflowEditor = () => {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    {
      id: '1',
      type: 'source',
      name: 'CSV Import',
      config: { file: 'customers.csv' },
      position: { x: 50, y: 100 }
    }
  ]);

  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [workflowName, setWorkflowName] = useState('Neuer Workflow');

  const stepTypes = [
    { value: 'source', label: 'Datenquelle', icon: Database, color: 'bg-blue-500' },
    { value: 'transform', label: 'Transformation', icon: Shuffle, color: 'bg-green-500' },
    { value: 'filter', label: 'Filter', icon: Filter, color: 'bg-yellow-500' },
    { value: 'output', label: 'Ausgabe', icon: FileOutput, color: 'bg-purple-500' }
  ];

  const transformationTypes = [
    { value: 'map', label: 'Direkte Zuordnung' },
    { value: 'concat', label: 'Felder zusammenfügen' },
    { value: 'split', label: 'Feld aufteilen' },
    { value: 'format', label: 'Format ändern' },
    { value: 'calculate', label: 'Berechnung' },
    { value: 'lookup', label: 'Nachschlagen' }
  ];

  const addWorkflowStep = (type: WorkflowStep['type']) => {
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      type,
      name: `Neuer ${stepTypes.find(t => t.value === type)?.label}`,
      config: {},
      position: { x: 50 + workflowSteps.length * 200, y: 100 }
    };

    setWorkflowSteps(prev => [...prev, newStep]);
  };

  const updateStepConfig = (stepId: string, config: Record<string, any>) => {
    setWorkflowSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, config: { ...step.config, ...config } } : step
      )
    );
  };

  const deleteStep = (stepId: string) => {
    setWorkflowSteps(prev => prev.filter(step => step.id !== stepId));
    if (selectedStep === stepId) {
      setSelectedStep(null);
    }
  };

  const addFieldMapping = () => {
    setFieldMappings(prev => [...prev, { source: '', target: '', transformation: 'map' }]);
  };

  const updateFieldMapping = (index: number, field: keyof FieldMapping, value: string) => {
    setFieldMappings(prev =>
      prev.map((mapping, i) =>
        i === index ? { ...mapping, [field]: value } : mapping
      )
    );
  };

  const removeFieldMapping = (index: number) => {
    setFieldMappings(prev => prev.filter((_, i) => i !== index));
  };

  const saveWorkflow = () => {
    const workflow = {
      name: workflowName,
      steps: workflowSteps,
      mappings: fieldMappings,
      created: new Date().toISOString()
    };
    
    console.log('Saving workflow:', workflow);
    // In real app, save to storage/API
  };

  const runWorkflow = () => {
    console.log('Running workflow:', { steps: workflowSteps, mappings: fieldMappings });
    // In real app, execute workflow
  };

  const selectedStepData = workflowSteps.find(step => step.id === selectedStep);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-data bg-clip-text text-transparent">
          Visueller Workflow-Editor
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Erstellen Sie Datenverarbeitungs-Workflows mit Drag-and-Drop und visueller Feldmappierung
        </p>
      </div>

      {/* Workflow Header */}
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-lg font-semibold border-none p-0 bg-transparent"
              />
              <Badge variant="outline">{workflowSteps.length} Schritte</Badge>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveWorkflow} variant="outline" size="sm">
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
              <Button onClick={runWorkflow} size="sm" className="bg-gradient-primary">
                <Play className="w-4 h-4 mr-2" />
                Ausführen
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Step Palette */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="text-lg">Workflow-Schritte</CardTitle>
            <CardDescription>Ziehen Sie Schritte in den Workflow-Bereich</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {stepTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.value}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => addWorkflowStep(type.value as WorkflowStep['type'])}
                >
                  <div className={`w-3 h-3 rounded-full ${type.color} mr-3`} />
                  <Icon className="w-4 h-4 mr-2" />
                  {type.label}
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Workflow Canvas */}
        <Card className="lg:col-span-2 shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Move className="w-5 h-5" />
              Workflow-Canvas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-96 border-2 border-dashed border-border rounded-lg p-4 relative bg-muted/30">
              {workflowSteps.map((step, index) => {
                const stepType = stepTypes.find(t => t.value === step.type);
                const Icon = stepType?.icon || Database;
                
                return (
                  <div key={step.id} className="relative">
                    <div
                      className={`absolute bg-card border-2 rounded-lg p-4 min-w-48 cursor-pointer transition-smooth ${
                        selectedStep === step.id ? 'border-primary shadow-lg' : 'border-border hover:border-primary/50'
                      }`}
                      style={{ left: step.position.x, top: step.position.y }}
                      onClick={() => setSelectedStep(step.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${stepType?.color}`} />
                          <Icon className="w-4 h-4" />
                          <span className="font-medium text-sm">{step.name}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteStep(step.id);
                          }}
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {Object.keys(step.config).length > 0 ? (
                          <div>Konfiguriert</div>
                        ) : (
                          <div>Nicht konfiguriert</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Connection Arrow */}
                    {index < workflowSteps.length - 1 && (
                      <ArrowRight 
                        className="absolute w-6 h-6 text-muted-foreground"
                        style={{ 
                          left: step.position.x + 200, 
                          top: step.position.y + 30 
                        }}
                      />
                    )}
                  </div>
                );
              })}

              {workflowSteps.length === 0 && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Fügen Sie Workflow-Schritte hinzu, um zu beginnen</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuration Panel */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Konfiguration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedStepData ? (
              <div className="space-y-4">
                <div>
                  <Label>Schritt-Name</Label>
                  <Input
                    value={selectedStepData.name}
                    onChange={(e) => updateStepConfig(selectedStepData.id, { name: e.target.value })}
                  />
                </div>

                <Separator />

                {selectedStepData.type === 'source' && (
                  <div className="space-y-3">
                    <Label>Quelldatei</Label>
                    <Input
                      placeholder="datei.csv"
                      value={selectedStepData.config.file || ''}
                      onChange={(e) => updateStepConfig(selectedStepData.id, { file: e.target.value })}
                    />
                  </div>
                )}

                {selectedStepData.type === 'transform' && (
                  <div className="space-y-3">
                    <Label>Transformation</Label>
                    <Select
                      value={selectedStepData.config.type || ''}
                      onValueChange={(value) => updateStepConfig(selectedStepData.id, { type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Typ auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {transformationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedStepData.type === 'output' && (
                  <div className="space-y-3">
                    <Label>Ausgabedatei</Label>
                    <Input
                      placeholder="output.csv"
                      value={selectedStepData.config.outputFile || ''}
                      onChange={(e) => updateStepConfig(selectedStepData.id, { outputFile: e.target.value })}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Wählen Sie einen Schritt aus, um ihn zu konfigurieren</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Field Mapping Section */}
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Feld-Mappings</CardTitle>
              <CardDescription>
                Definieren Sie, wie Felder aus der Quelle auf Zielfelder gemappt werden sollen
              </CardDescription>
            </div>
            <Button onClick={addFieldMapping} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Mapping hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fieldMappings.length > 0 ? (
            <div className="space-y-4">
              {fieldMappings.map((mapping, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg">
                  <div className="col-span-3">
                    <Label className="text-xs">Quellfeld</Label>
                    <Input
                      placeholder="z.B. kunde_name"
                      value={mapping.source}
                      onChange={(e) => updateFieldMapping(index, 'source', e.target.value)}
                    />
                  </div>
                  
                  <div className="col-span-1 flex justify-center">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div className="col-span-3">
                    <Label className="text-xs">Transformation</Label>
                    <Select
                      value={mapping.transformation || 'map'}
                      onValueChange={(value) => updateFieldMapping(index, 'transformation', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {transformationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-1 flex justify-center">
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  
                  <div className="col-span-3">
                    <Label className="text-xs">Zielfeld</Label>
                    <Input
                      placeholder="z.B. customer_name"
                      value={mapping.target}
                      onChange={(e) => updateFieldMapping(index, 'target', e.target.value)}
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFieldMapping(index)}
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <ArrowRight className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Noch keine Feld-Mappings definiert</p>
              <p className="text-sm">Klicken Sie auf "Mapping hinzufügen", um zu beginnen</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VisualWorkflowEditor;