import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LayoutTemplate, Brain, Eye, Filter, Plus, X, Upload } from 'lucide-react';
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
        let value = '';
        
        // If there's a formula, prioritize it over source column
        if (mapping.formula && mapping.formula.trim()) {
          try {
            let formula = mapping.formula.trim();
            
            // Handle different formula types
            if (formula.startsWith('CONCAT(')) {
              // Extract parameters from CONCAT function
              const params = formula.slice(7, -1).split(',').map(p => p.trim());
              value = params.map(param => {
                let cleanParam = param.replace(/^["']|["']$/g, '');
                // Replace column references in each parameter
                sourceData.headers.forEach((header, headerIndex) => {
                  const headerValue = row[headerIndex] || '';
                  const regex = new RegExp(`\\b${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                  cleanParam = cleanParam.replace(regex, headerValue);
                });
                return cleanParam;
              }).join('');
            } else if (formula.startsWith('UPPER(')) {
              let param = formula.slice(6, -1).replace(/^["']|["']$/g, '');
              // Replace column references
              sourceData.headers.forEach((header, headerIndex) => {
                const headerValue = row[headerIndex] || '';
                const regex = new RegExp(`\\b${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                param = param.replace(regex, headerValue);
              });
              value = param.toUpperCase();
            } else if (formula.startsWith('LOWER(')) {
              let param = formula.slice(6, -1).replace(/^["']|["']$/g, '');
              // Replace column references
              sourceData.headers.forEach((header, headerIndex) => {
                const headerValue = row[headerIndex] || '';
                const regex = new RegExp(`\\b${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                param = param.replace(regex, headerValue);
              });
              value = param.toLowerCase();
            } else {
              // For direct formulas (like "Benutzername@domain.de"), replace column references
              value = formula;
              sourceData.headers.forEach((header, headerIndex) => {
                const headerValue = row[headerIndex] || '';
                // Create a more specific regex that matches the column name as a whole word
                // but not as part of email addresses or other text
                const regex = new RegExp(`\\b${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b(?!@)`, 'gi');
                value = value.replace(regex, headerValue);
              });
            }
            
            // Debug logging
            console.log('Formula processing:', {
              original: mapping.formula,
              processed: value,
              sourceData: sourceData.headers,
              currentRow: row
            });
            
          } catch (error) {
            console.error('Formula error:', error);
            value = mapping.defaultValue || '';
          }
        }
        // Otherwise use source column with transformations
        else if (mapping.sourceColumn) {
          const sourceIndex = sourceData.headers.indexOf(mapping.sourceColumn);
          if (sourceIndex !== -1) {
            value = row[sourceIndex] || '';
            
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
          } else {
            value = mapping.defaultValue || '';
          }
        } else {
          value = mapping.defaultValue || '';
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
    onMappingComplete(mappings, filters);
    onNext();
  };

  const isValid = selectedTemplate && mappings.some(m => m.sourceColumn || m.defaultValue || m.formula);

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
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Ziel-Template auswählen</label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowTemplateUpload(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Neues Template
              </Button>
            </div>
            <Select onValueChange={handleTemplateSelect} value={selectedTemplate?.id || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Template wählen oder neues erstellen..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border z-50">
                {availableTemplates.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <p>Keine Templates verfügbar</p>
                    <p className="text-xs">Erstellen Sie ein neues Template</p>
                  </div>
                ) : (
                  availableTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-muted-foreground">{template.description}</div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-Mapping Button */}
          <div className="flex justify-end">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleAiMapping}
              disabled={!sourceData || !selectedTemplate || isAiProcessing}
              className="text-xs"
            >
              <Brain className="w-3 h-3 mr-1" />
              {isAiProcessing ? 'KI arbeitet...' : 'Auto-Mapping'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Simplified Column Mappings */}
      {selectedTemplate && selectedTemplate.columns && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5" />
              Feldmappings ({mappings.length} Felder)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mappings.map((mapping, index) => (
                <div key={index} className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-3 border rounded-lg bg-card/30">
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      {mapping.templateColumn}
                    </label>
                    <Select 
                      value={mapping.sourceColumn || 'none'} 
                      onValueChange={(value) => updateMapping(index, 'sourceColumn', value)}
                    >
                      <SelectTrigger className="w-full h-8">
                        <SelectValue placeholder="Quell-Spalte wählen..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border z-50">
                        <SelectItem value="none">Keine Zuordnung</SelectItem>
                        {sourceData?.headers.map(header => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Formel (optional)
                    </label>
                    <Input
                      placeholder="z.B. Name@domain.de oder CONCAT(Name,@domain.de)"
                      value={mapping.formula || ''}
                      onChange={(e) => updateMapping(index, 'formula', e.target.value)}
                      className="w-full h-8 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Standard-Wert
                    </label>
                    <Input
                      placeholder="Fallback-Wert"
                      value={mapping.defaultValue || ''}
                      onChange={(e) => updateMapping(index, 'defaultValue', e.target.value)}
                      className="w-full h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Filters */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Datenfilter ({filters.length})
            <Button
              variant="outline"
              size="sm"
              onClick={addFilter}
              className="ml-auto"
            >
              <Plus className="w-4 h-4 mr-1" />
              Filter hinzufügen
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filters.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Keine Filter konfiguriert. Klicken Sie "Filter hinzufügen" um Daten zu filtern.
            </p>
          ) : (
            <div className="space-y-3">
              {filters.map((filter) => (
                <div key={filter.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Select 
                    value={filter.sourceColumn} 
                    onValueChange={(value) => updateFilter(filter.id, 'sourceColumn', value)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Spalte..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border z-50">
                      {sourceData?.headers.map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={filter.condition} 
                    onValueChange={(value) => updateFilter(filter.id, 'condition', value as any)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border z-50">
                      <SelectItem value="contains">enthält</SelectItem>
                      <SelectItem value="equals">gleich</SelectItem>
                      <SelectItem value="starts_with">beginnt mit</SelectItem>
                      <SelectItem value="ends_with">endet mit</SelectItem>
                      <SelectItem value="not_empty">nicht leer</SelectItem>
                      <SelectItem value="empty">leer</SelectItem>
                      <SelectItem value="greater_than">größer als</SelectItem>
                      <SelectItem value="less_than">kleiner als</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    placeholder="Wert..."
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                    className="flex-1"
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFilter(filter.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Preview */}
      {previewData.length > 0 && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Live-Vorschau (erste 10 Zeilen)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
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
                  {previewData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b hover:bg-muted/30">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="p-2 max-w-[200px] truncate">
                          {cell || <span className="text-muted-foreground">-</span>}
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

      {/* Template Upload Modal */}
      {showTemplateUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border shadow-lg">
            <TemplateUpload
              onTemplateCreate={handleTemplateCreate}
              onClose={() => setShowTemplateUpload(false)}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Zurück
        </Button>
        <div className="flex items-center gap-2">
          {isValid && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              ✓ Bereit
            </Badge>
          )}
          <Button onClick={handleNext} disabled={!isValid}>
            Weiter zur Vorschau
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TemplateMappingStep;
