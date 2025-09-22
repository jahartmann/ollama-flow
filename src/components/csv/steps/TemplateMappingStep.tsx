import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LayoutTemplate, Wand2, Eye, Filter, Plus, X, Upload, MapPin, Loader2, AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { CSVFile, CSVTemplate, TemplateColumnMapping } from '@/lib/transformationEngine';
import { ollamaAPI } from '@/lib/ollamaApi';
import { useToast } from '@/hooks/use-toast';
import TemplateUpload from './TemplateUpload';

interface TemplateMappingStepProps {
  files: CSVFile[];
  processedData: CSVFile | null;
  selectedTemplate: CSVTemplate | null;
  onTemplateSelect: (template: CSVTemplate) => void;
  onMappingComplete: (mappings: TemplateColumnMapping[], filters: any[]) => void;
  onBack: () => void;
  onNext: () => void;
}

interface ColumnFilter {
  id: string;
  sourceColumn: string;
  condition: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'not_empty' | 'empty' | 'greater_than' | 'less_than';
  value: string;
}

const TemplateMappingStep: React.FC<TemplateMappingStepProps> = ({
  files,
  processedData,
  selectedTemplate,
  onTemplateSelect,
  onMappingComplete,
  onBack,
  onNext
}) => {
  const [mappings, setMappings] = useState<TemplateColumnMapping[]>([]);
  const [filters, setFilters] = useState<ColumnFilter[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [showTemplateUpload, setShowTemplateUpload] = useState<boolean>(false);
  const [customTemplates, setCustomTemplates] = useState<CSVTemplate[]>([]);
  const { toast } = useToast();

  const sourceData = processedData || (files.length > 0 ? files[0] : null);
  const defaultTemplates: CSVTemplate[] = [];
  const availableTemplates = [...defaultTemplates, ...customTemplates];

  // Load templates from localStorage on mount
  React.useEffect(() => {
    try {
      const savedTemplates = localStorage.getItem('csv-templates');
      if (savedTemplates) {
        const templates = JSON.parse(savedTemplates);
        console.log('Loaded templates from localStorage:', templates);
        setCustomTemplates(templates);
      }
    } catch (error) {
      console.error('Failed to load templates from localStorage:', error);
    }
  }, []);

  // Initialize mappings when template is selected
  React.useEffect(() => {
    if (selectedTemplate && selectedTemplate.columns) {
      const initialMappings: TemplateColumnMapping[] = selectedTemplate.columns.map(col => ({
        templateColumn: col.name,
        sourceColumn: '',
        transformation: 'direct',
        defaultValue: '',
        formula: ''
      }));
      setMappings(initialMappings);
    }
  }, [selectedTemplate]);

  // Enhanced preview data with simplified formula processing
  const previewData = useMemo(() => {
    if (!sourceData || mappings.length === 0) return [];

    let filteredData = [...sourceData.data];

    // Apply filters first
    filters.forEach(filter => {
      const columnIndex = sourceData.headers.indexOf(filter.sourceColumn);
      if (columnIndex === -1) return;

      filteredData = filteredData.filter(row => {
        const cellValue = row[columnIndex] || '';
        
        switch (filter.condition) {
          case 'contains':
            return cellValue.includes(filter.value);
          case 'equals':
            return cellValue === filter.value;
          case 'starts_with':
            return cellValue.startsWith(filter.value);
          case 'ends_with':
            return cellValue.endsWith(filter.value);
          case 'not_empty':
            return cellValue.trim() !== '';
          case 'empty':
            return cellValue.trim() === '';
          case 'greater_than':
            return parseFloat(cellValue) > parseFloat(filter.value);
          case 'less_than':
            return parseFloat(cellValue) < parseFloat(filter.value);
          default:
            return true;
        }
      });
    });

    // Apply mappings with enhanced formula processing
    return filteredData.slice(0, 5).map(row => {
      const mappedRow: string[] = [];
      
      mappings.forEach(mapping => {
        let value = '';
        
        // PRIORITY 1: Formula (highest priority)
        if (mapping.formula && mapping.formula.trim()) {
          let formulaResult = mapping.formula.trim();
          
          // Replace column references with actual values
          sourceData.headers.forEach((header, headerIndex) => {
            const cellValue = row[headerIndex] || '';
            // Use word boundary to avoid partial matches
            const regex = new RegExp(`\\b${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
            formulaResult = formulaResult.replace(regex, cellValue);
          });
          
          value = formulaResult;
        }
        // PRIORITY 2: Direct column mapping
        else if (mapping.sourceColumn && mapping.sourceColumn !== 'none' && mapping.sourceColumn !== '') {
          const sourceIndex = sourceData.headers.indexOf(mapping.sourceColumn);
          if (sourceIndex !== -1) {
            value = row[sourceIndex] || '';
            
            // Apply transformations
            switch (mapping.transformation) {
              case 'uppercase':
                value = value.toUpperCase();
                break;
              case 'lowercase':
                value = value.toLowerCase();
                break;
              case 'trim':
                value = value.trim();
                break;
              case 'format_phone':
                value = value.replace(/\D/g, '').replace(/(\d{4})(\d{3})(\d{4})/, '+49 $1 $2 $3');
                break;
            }
          }
        }
        // PRIORITY 3: Default value
        else if (mapping.defaultValue) {
          value = mapping.defaultValue;
        }
        
        mappedRow.push(value);
      });
      
      return mappedRow;
    });
  }, [sourceData, mappings, filters]);

  const handleTemplateSelect = (templateId: string) => {
    const template = availableTemplates.find(t => t.id === templateId);
    if (template) {
      onTemplateSelect(template as any);
      toast({
        title: "Template ausgewählt",
        description: `Template "${template.name}" wurde ausgewählt`
      });
    }
  };

  const handleTemplateCreate = (template: CSVTemplate) => {
    console.log('Creating new template:', template);
    
    // Save to localStorage for persistence
    try {
      const existingTemplates = JSON.parse(localStorage.getItem('csv-templates') || '[]');
      const templatesWithNew = [...existingTemplates, { ...template, id: Date.now().toString() }];
      localStorage.setItem('csv-templates', JSON.stringify(templatesWithNew));
      
      console.log('Template saved to localStorage:', templatesWithNew);
    } catch (error) {
      console.error('Failed to save template to localStorage:', error);
    }
    
    setCustomTemplates(prev => [...prev, { ...template, id: Date.now().toString() }]);
    onTemplateSelect({ ...template, id: Date.now().toString() });
    setShowTemplateUpload(false);
    toast({
      title: "Template erstellt",
      description: `Template "${template.name}" wurde erfolgreich erstellt und gespeichert`
    });
  };

  const updateMapping = (index: number, field: keyof TemplateColumnMapping, value: string) => {
    setMappings(prev => prev.map((mapping, i) => 
      i === index ? { 
        ...mapping, 
        [field]: value === 'none' ? '' : value
      } : mapping
    ));
  };

  const addFilter = () => {
    const newFilter: ColumnFilter = {
      id: Date.now().toString(),
      sourceColumn: '',
      condition: 'contains',
      value: ''
    };
    setFilters(prev => [...prev, newFilter]);
  };

  const updateFilter = (id: string, field: keyof ColumnFilter, value: string) => {
    setFilters(prev => prev.map(filter => 
      filter.id === id ? { ...filter, [field]: value } : filter
    ));
  };

  const removeFilter = (id: string) => {
    setFilters(prev => prev.filter(filter => filter.id !== id));
  };

  const handleAiMapping = async () => {
    if (!sourceData || !selectedTemplate) {
      toast({
        title: "Fehler",
        description: "Quelldaten und Template werden benötigt",
        variant: "destructive"
      });
      return;
    }

    setIsAiProcessing(true);
    try {
      const isConnected = await ollamaAPI.testConnection();
      if (!isConnected) {
        throw new Error('Keine Verbindung zu Ollama. Stellen Sie sicher, dass Ollama läuft.');
      }

      const mappingPrompt = `
Mappe automatisch Spalten von CSV-Quelldaten zu Template-Spalten:

QUELLDATEN-SPALTEN: ${sourceData.headers.join(', ')}
ZIEL-TEMPLATE-SPALTEN: ${selectedTemplate.columns?.map(c => c.name).join(', ')}

Erstelle eine JSON-Antwort mit den besten Mappings:
{
  "mappings": [
    {
      "templateColumn": "Exakter Ziel-Spaltenname",
      "sourceColumn": "Bester Match aus Quell-Spalten oder leer",
      "transformation": "direct|uppercase|lowercase|trim|format_phone",
      "defaultValue": "Standard-Wert falls kein Match",
      "confidence": 0-100
    }
  ]
}
      `;

      const result = await ollamaAPI.generateCompletion(mappingPrompt);
      
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiResult = JSON.parse(jsonMatch[0]);
          
          if (aiResult.mappings && Array.isArray(aiResult.mappings)) {
            const newMappings = mappings.map((currentMapping, index) => {
              const aiMapping = aiResult.mappings.find(
                (m: any) => m.templateColumn === currentMapping.templateColumn
              );
              
              if (aiMapping && aiMapping.confidence > 70) {
                return {
                  ...currentMapping,
                  sourceColumn: aiMapping.sourceColumn || currentMapping.sourceColumn,
                  transformation: aiMapping.transformation || currentMapping.transformation,
                  defaultValue: aiMapping.defaultValue || currentMapping.defaultValue
                };
              }
              
              return currentMapping;
            });
            
            setMappings(newMappings);
            
            toast({
              title: "Auto-Mapping angewendet",
              description: "Automatische Feldmappings wurden erstellt"
            });
          }
        }
      } catch (parseError) {
        toast({
          title: "Auto-Mapping teilweise erfolgreich",
          description: "Mapping wurde erstellt, aber konnte nicht vollständig angewendet werden",
          variant: "default"
        });
      }

    } catch (error) {
      toast({
        title: "Auto-Mapping fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive"
      });
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleNext = () => {
    console.log('TemplateMappingStep handleNext called', {
      mappings,
      filters,
      selectedTemplate,
      isValid
    });
    onMappingComplete(mappings, filters);
    onNext();
  };

  const isValid = selectedTemplate && mappings.some(m => m.sourceColumn || m.defaultValue || m.formula);

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Template-Mapping
        </h2>
        <p className="text-muted-foreground">
          Ordnen Sie Ihre CSV-Spalten dem gewählten Template zu
        </p>
      </div>

      {/* Template Selection */}
      <Card className="shadow-elegant border-l-4 border-l-primary/50 bg-card">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <LayoutTemplate className="w-5 h-5 text-primary" />
            Template-Auswahl
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select onValueChange={handleTemplateSelect} value={selectedTemplate?.id || ""}>
                <SelectTrigger className="h-12 border-2 focus:border-primary">
                  <SelectValue placeholder="Wählen Sie ein Template aus..." />
                </SelectTrigger>
                <SelectContent className="bg-background border-2 shadow-xl z-50">
                  {availableTemplates.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="font-medium">Keine Templates verfügbar</p>
                      <p className="text-xs">Erstellen Sie ein neues Template</p>
                    </div>
                  ) : (
                    availableTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id} className="p-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-muted-foreground">{template.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setShowTemplateUpload(true)}
              className="border-2 border-dashed border-primary/30 hover:border-primary/60"
            >
              <Upload className="w-4 h-4 mr-2" />
              Neues Template
            </Button>
          </div>

          {selectedTemplate && (
            <div className="mt-6 p-4 bg-primary/20 rounded-lg border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-foreground">Template gewählt: {selectedTemplate.name}</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{selectedTemplate.description}</p>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.columns?.map(col => (
                  <Badge key={col.name} variant="secondary" className="text-xs bg-secondary/80 text-secondary-foreground">
                    {col.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Mappings */}
      {selectedTemplate && (
        <Card className="shadow-elegant border-l-4 border-l-accent bg-card">
          <CardHeader className="bg-gradient-to-r from-accent/10 to-accent/5 border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MapPin className="w-5 h-5 text-accent" />
              Feld-Zuordnung ({mappings.length} Felder)
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiMapping}
                disabled={isAiProcessing || !sourceData}
                className="ml-auto"
              >
                {isAiProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    KI arbeitet...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-1" />
                    KI-Mapping
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Help Section */}
            <div className="mb-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="w-6 h-6 text-primary mt-0.5" />
                <div>
                  <h4 className="font-semibold text-foreground mb-2">💡 E-Mail-Erstellung Anleitung</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Für E-Mail-Adressen:</strong> Verwenden Sie die Formel-Funktion</p>
                    <div className="bg-card p-3 rounded border-l-4 border-primary">
                      <div className="font-mono text-sm">
                        <div className="text-primary mb-1">✓ Richtig:</div>
                        <div className="bg-primary/5 p-2 rounded">
                          <code className="text-foreground">Benutzername@appleid.ds-greiz.de</code>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-primary">
                      Der Spaltenname wird automatisch durch den tatsächlichen Wert ersetzt!
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {mappings.map((mapping, index) => (
                <Card key={index} className="border-2 hover:border-primary/60 transition-all duration-200 bg-card">
                  <CardContent className="p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
                      {/* Template Field */}
                      <div>
                        <label className="text-sm font-semibold text-foreground block mb-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          Ziel-Feld
                        </label>
                        <div className="p-3 bg-primary/20 rounded-lg text-center border-2 border-dashed border-primary/40">
                          <span className="font-semibold text-foreground">{mapping.templateColumn}</span>
                        </div>
                      </div>
                      
                      {/* Source Column */}
                      <div>
                        <label className="text-sm font-medium text-foreground block mb-2">
                          Quell-Spalte
                        </label>
                        <Select 
                          value={mapping.sourceColumn || 'none'} 
                          onValueChange={(value) => updateMapping(index, 'sourceColumn', value === 'none' ? '' : value)}
                        >
                          <SelectTrigger className="w-full bg-background border-2 h-10">
                            <SelectValue placeholder="Spalte wählen..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background border-2 shadow-lg z-50">
                            <SelectItem value="none" className="text-muted-foreground">
                              Keine direkte Zuordnung
                            </SelectItem>
                            {sourceData?.headers.map(header => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                       {/* Formula */}
                       <div>
                         <label className="text-sm font-medium text-foreground block mb-2 flex items-center gap-1">
                           <Wand2 className="w-3 h-3 text-primary" />
                           Formel/Template
                         </label>
                         <Input
                           placeholder="z.B. Benutzername@appleid.ds-greiz.de"
                           value={mapping.formula || ''}
                           onChange={(e) => updateMapping(index, 'formula', e.target.value)}
                           className="w-full border-2 focus:border-primary h-10 font-mono bg-primary/5"
                         />
                       </div>
                       
                       {/* Default Value */}
                       <div>
                         <label className="text-sm font-medium text-foreground block mb-2">
                           Standard-Wert
                         </label>
                         <Input
                           placeholder="Fallback-Wert"
                           value={mapping.defaultValue || ''}
                           onChange={(e) => updateMapping(index, 'defaultValue', e.target.value)}
                           className="w-full border-2 focus:border-primary h-10"
                         />
                       </div>
                    </div>
                    
                    {/* Live Preview */}
                    <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-muted">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">Live-Vorschau:</span>
                      <div className="font-mono text-sm mt-1 font-medium">
                        {(() => {
                          if (mapping.formula && mapping.formula.trim()) {
                            let preview = mapping.formula.trim();
                            if (sourceData?.headers) {
                              sourceData.headers.forEach((header) => {
                                preview = preview.replace(new RegExp(`\\b${header}\\b`, 'g'), `[${header}]`);
                              });
                            }
                            return <span className="text-blue-600">{preview}</span>;
                          } else if (mapping.sourceColumn && mapping.sourceColumn !== 'none' && mapping.sourceColumn !== '') {
                            return <span className="text-green-600">[{mapping.sourceColumn}]</span>;
                          } else if (mapping.defaultValue) {
                            return <span className="text-orange-600">{mapping.defaultValue}</span>;
                          } else {
                            return <span className="text-muted-foreground">(leer)</span>;
                          }
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Preview */}
      {selectedTemplate && previewData.length > 0 && (
        <Card className="shadow-elegant border-l-4 border-l-accent bg-card">
          <CardHeader className="bg-gradient-to-r from-accent/10 to-accent/5 border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Eye className="w-5 h-5 text-accent" />
              Datenvorschau (erste 5 Zeilen)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto bg-card rounded-lg border border-border">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-primary/20 border-b-2 border-border">
                    {mappings.map((mapping, index) => (
                      <th key={index} className="border-r border-border p-4 text-left text-sm font-semibold text-foreground">
                        {mapping.templateColumn}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/20 hover:bg-muted/30'}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border-r border-b border-border p-4 text-sm">
                          <div className="font-mono bg-muted/10 p-2 rounded text-foreground">
                            {cell || <span className="text-muted-foreground italic">leer</span>}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="outline" onClick={onBack} size="lg">
          Zurück
        </Button>
        
        <div className="flex items-center gap-3">
          {isValid ? (
            <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Bereit für nächsten Schritt
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-destructive/20 text-destructive border-destructive/30">
              <AlertCircle className="w-3 h-3 mr-1" />
              Template und Mappings erforderlich
            </Badge>
          )}
          
          <Button 
            onClick={handleNext} 
            disabled={!isValid}
            size="lg"
            className="min-w-[120px] glow-button"
          >
            Weiter zum Export
          </Button>
        </div>
      </div>

      {/* Template Upload Modal */}
      {showTemplateUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <TemplateUpload
              onClose={() => setShowTemplateUpload(false)}
              onTemplateCreate={handleTemplateCreate}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateMappingStep;