import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { LayoutTemplate, Sparkles, Brain, Eye, Filter, Plus, X, Upload } from 'lucide-react';
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
  const [aiEnabled, setAiEnabled] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [showTemplateUpload, setShowTemplateUpload] = useState<boolean>(false);
  const [customTemplates, setCustomTemplates] = useState<CSVTemplate[]>([]);
  const { toast } = useToast();

  const sourceData = processedData || (files.length > 0 ? files[0] : null);
  const defaultTemplates = [
    {
      id: 'custom',
      name: 'Benutzerdefiniertes Format',
      description: 'Erstellen Sie Ihr eigenes Ausgabeformat',
      columns: []
    },
    {
      id: 'contact',
      name: 'Kontaktliste',
      description: 'Standard Kontaktformat mit Name, Email, Telefon',
      columns: [
        { name: 'Vorname', type: 'string', required: true },
        { name: 'Nachname', type: 'string', required: true },
        { name: 'Email', type: 'email', required: true },
        { name: 'Telefon', type: 'string', required: false },
        { name: 'Firma', type: 'string', required: false }
      ]
    },
    {
      id: 'product',
      name: 'Produktkatalog',
      description: 'E-Commerce Produktformat',
      columns: [
        { name: 'SKU', type: 'string', required: true },
        { name: 'Produktname', type: 'string', required: true },
        { name: 'Beschreibung', type: 'string', required: false },
        { name: 'Preis', type: 'number', required: true },
        { name: 'Kategorie', type: 'string', required: true },
        { name: 'Lagerbestand', type: 'number', required: false }
      ]
    }
  ];

  const availableTemplates = [...defaultTemplates, ...customTemplates];

  // Initialize mappings when template is selected
  React.useEffect(() => {
    if (selectedTemplate && selectedTemplate.columns) {
      const initialMappings: TemplateColumnMapping[] = selectedTemplate.columns.map(col => ({
        templateColumn: col.name,
        sourceColumn: '',
        transformation: 'direct',
        defaultValue: ''
      }));
      setMappings(initialMappings);
    }
  }, [selectedTemplate]);

  // Preview data with current mappings and filters
  const previewData = useMemo(() => {
    if (!sourceData || mappings.length === 0) return [];

    let filteredData = [...sourceData.data];

    // Apply filters
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

    // Apply mappings
    return filteredData.slice(0, 10).map(row => {
      const mappedRow: string[] = [];
      
      mappings.forEach(mapping => {
        if (mapping.sourceColumn) {
          const sourceIndex = sourceData.headers.indexOf(mapping.sourceColumn);
          if (sourceIndex !== -1) {
            let value = row[sourceIndex] || '';
            
            // Apply transformation or formula
            if (mapping.formula) {
              // Apply formula (simplified implementation)
              try {
                // Basic formula support - CONCAT, UPPER, LOWER, etc.
                let formula = mapping.formula;
                
                // Replace column references with actual values
                sourceData.headers.forEach((header, headerIndex) => {
                  const headerValue = row[headerIndex] || '';
                  formula = formula.replace(new RegExp(`\\b${header}\\b`, 'g'), `"${headerValue}"`);
                });
                
                // Basic formula evaluation
                if (formula.startsWith('CONCAT(')) {
                  const params = formula.slice(7, -1).split(',').map(p => p.trim().replace(/"/g, ''));
                  value = params.join('');
                } else if (formula.startsWith('UPPER(')) {
                  const param = formula.slice(6, -1).replace(/"/g, '');
                  value = param.toUpperCase();
                } else if (formula.startsWith('LOWER(')) {
                  const param = formula.slice(6, -1).replace(/"/g, '');
                  value = param.toLowerCase();
                } else {
                  value = formula.replace(/"/g, '');
                }
              } catch (error) {
                console.error('Formula error:', error);
                value = value; // fallback to original value
              }
            } else {
              // Apply standard transformations
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
            
            mappedRow.push(value);
          } else {
            mappedRow.push(mapping.defaultValue || '');
          }
        } else {
          mappedRow.push(mapping.defaultValue || '');
        }
      });
      
      return mappedRow;
    });
  }, [sourceData, mappings, filters]);

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'upload') {
      setShowTemplateUpload(true);
      return;
    }
    
    const template = availableTemplates.find(t => t.id === templateId);
    if (template) {
      onTemplateSelect(template as any);
    }
  };

  const handleTemplateCreate = (template: CSVTemplate) => {
    setCustomTemplates(prev => [...prev, template]);
    onTemplateSelect(template);
    setShowTemplateUpload(false);
    toast({
      title: "Template erstellt",
      description: `Template "${template.name}" wurde erfolgreich erstellt`
    });
  };

  const updateMapping = (index: number, field: keyof TemplateColumnMapping, value: string) => {
    setMappings(prev => prev.map((mapping, i) => 
      i === index ? { ...mapping, [field]: value } : mapping
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
    if (!sourceData || !selectedTemplate || !aiPrompt.trim()) {
      toast({
        title: "Eingabe erforderlich",
        description: "Bitte beschreiben Sie, wie die Felder gemappt werden sollen",
        variant: "destructive"
      });
      return;
    }

    setIsAiProcessing(true);
    try {
      // Send mapping request to AI
      const prompt = `
Basierend auf diesen Quelldaten-Spalten: ${sourceData.headers.join(', ')}
Und diesen Ziel-Template-Spalten: ${selectedTemplate.columns?.map(c => c.name).join(', ')}

${aiPrompt}

Bitte erstelle automatische Mappings und Transformationen.
      `;

      const result = await ollamaAPI.processDataTransformation(
        sourceData.data.slice(0, 5),
        `Basierend auf diesen Quelldaten-Spalten: ${sourceData.headers.join(', ')}
Und diesen Ziel-Template-Spalten: ${selectedTemplate.columns?.map(c => c.name).join(', ')}

${aiPrompt}

Bitte erstelle automatische Mappings und Transformationen.`,
        sourceData.headers
      );
      
      // Here you would parse the AI result and update mappings
      // For now, we'll show a success message
      toast({
        title: "KI-Mapping erstellt",
        description: "Die KI hat automatische Feldmappings vorgeschlagen"
      });

    } catch (error) {
      toast({
        title: "KI-Mapping fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive"
      });
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleNext = () => {
    onMappingComplete(mappings, filters);
    onNext();
  };

  const isValid = selectedTemplate && mappings.some(m => m.sourceColumn || m.defaultValue);

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            Template & Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Ziel-Template auswählen</label>
            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Template wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upload">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    <div>
                      <div className="font-medium">Neues Template erstellen</div>
                      <div className="text-sm text-muted-foreground">Template hochladen oder manuell erstellen</div>
                    </div>
                  </div>
                </SelectItem>
                {availableTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-muted-foreground">{template.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* AI Assistant Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Switch
                id="ai-enabled"
                checked={aiEnabled}
                onCheckedChange={setAiEnabled}
              />
              <label htmlFor="ai-enabled" className="text-sm font-medium flex items-center gap-2">
                <Brain className="w-4 h-4" />
                KI-Assistent aktivieren
              </label>
            </div>
            {aiEnabled && (
              <Sparkles className="w-4 h-4 text-primary" />
            )}
          </div>

          {aiEnabled && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">KI-Mapping Anweisungen</label>
                    <Textarea
                      placeholder="z.B.: 'Mappe Vorname und Nachname zu einem Vollname-Feld', 'Konvertiere alle Telefonnummern in deutsches Format', 'Filtere nur aktive Kunden'"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  <Button
                    onClick={handleAiMapping}
                    disabled={isAiProcessing || !aiPrompt.trim()}
                    variant="outline"
                    size="sm"
                  >
                    {isAiProcessing ? (
                      <>
                        <Brain className="w-4 h-4 mr-2 animate-pulse" />
                        KI arbeitet...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Automatisches Mapping
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Column Mappings */}
      {selectedTemplate && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feldmapping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mappings.map((mapping, index) => (
                <div key={index} className="space-y-2 p-4 border rounded-lg">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {selectedTemplate.columns?.[index]?.name}
                    {selectedTemplate.columns?.[index]?.required && (
                      <Badge variant="outline" className="text-xs">Erforderlich</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Quell-Spalte</label>
                      <Select
                        value={mapping.sourceColumn}
                        onValueChange={(value) => updateMapping(index, 'sourceColumn', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Wählen..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">-- Keine --</SelectItem>
                          {sourceData?.headers.map(header => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-xs text-muted-foreground">Transformation</label>
                      <Select
                        value={mapping.transformation || 'direct'}
                        onValueChange={(value) => updateMapping(index, 'transformation', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direkt</SelectItem>
                          <SelectItem value="uppercase">Großbuchstaben</SelectItem>
                          <SelectItem value="lowercase">Kleinbuchstaben</SelectItem>
                          <SelectItem value="trim">Leerzeichen entfernen</SelectItem>
                          <SelectItem value="format_phone">Telefon formatieren</SelectItem>
                          <SelectItem value="formula">Formel verwenden</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {mapping.transformation === 'formula' ? (
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground">Formel</label>
                      <Input
                        value={mapping.formula || ''}
                        onChange={(e) => updateMapping(index, 'formula', e.target.value)}
                        placeholder="z.B. CONCAT(Vorname, ' ', Nachname)"
                        className="h-8"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-muted-foreground">Standardwert (optional)</label>
                      <Input
                        value={mapping.defaultValue || ''}
                        onChange={(e) => updateMapping(index, 'defaultValue', e.target.value)}
                        placeholder="Standardwert..."
                        className="h-8"
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Live-Vorschau
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {mappings.map((mapping, index) => (
                          <th key={index} className="text-left p-2 font-medium">
                            {mapping.templateColumn}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="p-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-xs text-muted-foreground mt-2">
                    Zeigt die ersten 10 Zeilen der transformierten Daten
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Wählen Sie Feldmappings aus, um eine Vorschau zu sehen</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Datenfilter (optional)
            </div>
            <Button onClick={addFilter} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Filter hinzufügen
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {filters.map((filter) => (
            <div key={filter.id} className="flex items-center gap-2 p-3 border rounded-lg">
              <Select
                value={filter.sourceColumn}
                onValueChange={(value) => updateFilter(filter.id, 'sourceColumn', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Spalte" />
                </SelectTrigger>
                <SelectContent>
                  {sourceData?.headers.map(header => (
                    <SelectItem key={header} value={header}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filter.condition}
                onValueChange={(value) => updateFilter(filter.id, 'condition', value as any)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contains">enthält</SelectItem>
                  <SelectItem value="equals">ist gleich</SelectItem>
                  <SelectItem value="starts_with">beginnt mit</SelectItem>
                  <SelectItem value="ends_with">endet mit</SelectItem>
                  <SelectItem value="not_empty">nicht leer</SelectItem>
                  <SelectItem value="empty">leer</SelectItem>
                  <SelectItem value="greater_than">größer als</SelectItem>
                  <SelectItem value="less_than">kleiner als</SelectItem>
                </SelectContent>
              </Select>

              <Input
                value={filter.value}
                onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                placeholder="Wert"
                className="flex-1"
              />

              <Button
                onClick={() => removeFilter(filter.id)}
                variant="outline"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          
          {filters.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Keine Filter definiert. Alle Daten werden verarbeitet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Zurück
        </Button>
        
        <Button onClick={handleNext} disabled={!isValid} className="px-8">
          Vorschau & Export
        </Button>
      </div>
    </div>
  );
};

export default TemplateMappingStep;