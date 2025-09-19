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
  const defaultTemplates: CSVTemplate[] = [];

  const availableTemplates = [...defaultTemplates, ...customTemplates];

  // Initialize mappings when template is selected
  React.useEffect(() => {
    console.log('Template changed:', selectedTemplate); // Debug log
    
    if (selectedTemplate && selectedTemplate.columns) {
      const initialMappings: TemplateColumnMapping[] = selectedTemplate.columns.map(col => ({
        templateColumn: col.name,
        sourceColumn: '',
        transformation: 'direct',
        defaultValue: '',
        formula: ''
      }));
      
      console.log('Setting mappings:', initialMappings); // Debug log
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
                  // Use more specific regex to avoid cutting off @ symbols and other characters
                  formula = formula.replace(new RegExp(`(?<!\\w)${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\w)`, 'g'), `"${headerValue}"`);
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
    console.log('Template selected:', templateId);
    
    const template = availableTemplates.find(t => t.id === templateId);
    console.log('Found template:', template);
    
    if (template) {
      onTemplateSelect(template as any);
      toast({
        title: "Template ausgewählt",
        description: `Template "${template.name}" wurde ausgewählt`
      });
    } else {
      toast({
        title: "Template nicht gefunden",
        description: `Template mit ID "${templateId}" wurde nicht gefunden`,
        variant: "destructive"
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
        [field]: value === 'none' ? '' : value // Convert 'none' back to empty string
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

    // If no prompt provided, use automatic mapping
    const userInstruction = aiPrompt.trim() || "Mappe alle ähnlichen Felder automatisch basierend auf Spaltennamen";

    setIsAiProcessing(true);
    try {
      // Check if Ollama is connected first
      const isConnected = await ollamaAPI.testConnection();
      if (!isConnected) {
        throw new Error('Keine Verbindung zu Ollama. Stellen Sie sicher, dass Ollama läuft.');
      }

      // Enhanced intelligent prompt for automatic mapping with better similarity detection
      const mappingPrompt = `
AUFGABE: Hochpräzise automatische Spalten-Mappings für CSV-Transformation

QUELLDATEN-SPALTEN: ${sourceData.headers.join(', ')}
ZIEL-TEMPLATE-SPALTEN: ${selectedTemplate.columns?.map(c => c.name).join(', ')}

BENUTZER-ANWEISUNG: ${userInstruction}

ERWEITERTE INTELLIGENTE MAPPING-REGELN:
1. EXAKTE MATCHES (100% Confidence): Identische Spaltennamen (case-insensitive)
2. HÖCHSTE ÄHNLICHKEIT (95% Confidence): 
   - Substring-Matching: "kunde_name" → "Name", "email_address" → "Email"
   - Teilwörter: "Vorname" ↔ "First_Name", "Nachname" ↔ "Last_Name"
3. SPRACHVARIATIONEN (90% Confidence):
   - Deutsch/Englisch: "Telefon" ↔ "Phone", "Adresse" ↔ "Address", "Straße" ↔ "Street"
   - Abkürzungen: "Tel" ↔ "Telefon", "Mail" ↔ "E-Mail", "Nr" ↔ "Nummer"
4. SEMANTISCHE ÄHNLICHKEIT (85% Confidence):
   - "Name" kann zu "Vorname" oder "Nachname" gemappt werden
   - "Contact" kann zu "Telefon" oder "E-Mail" gemappt werden
5. AUTOMATISCHE TRANSFORMATIONEN basierend auf Inhaltstyp:
   - Telefonnummern: format_phone für Felder mit "phone", "tel", "telefon"
   - Namen: uppercase für Nachnamen, lowercase für E-Mails
   - Texte: trim für alle String-Felder

ERWEITERTE BEISPIEL-MAPPINGS:
- "Vorname" ↔ "Name", "FirstName", "fname", "first_name", "vname"
- "Nachname" ↔ "LastName", "Surname", "lname", "last_name", "nname", "familienname"
- "E-Mail" ↔ "Email", "Mail", "email_address", "mail_address", "kontakt_email"
- "Telefon" ↔ "Phone", "Tel", "telefon_nr", "phone_number", "contact_phone", "mobile"
- "Straße" ↔ "Street", "Address", "adresse", "street_address", "strasse"
- "PLZ" ↔ "PostalCode", "ZIP", "postal_code", "zip_code", "postleitzahl"
- "Stadt" ↔ "City", "Ort", "place", "location"
- "Land" ↔ "Country", "nation", "staat"

INTELLIGENTE ANALYSE-SCHRITTE:
1. Führe für jede Template-Spalte eine Ähnlichkeitsanalyse mit allen Quell-Spalten durch
2. Berechne Ähnlichkeits-Score basierend auf Substring, Levenshtein-Distanz und semantischen Regeln
3. Wähle die beste Übereinstimmung mit höchstem Confidence-Score
4. Schlage passende Transformationen basierend auf Datentyp vor

Erstelle eine JSON-Antwort im folgenden Format:
{
  "mappings": [
    {
      "templateColumn": "Exakter Ziel-Spaltenname",
      "sourceColumn": "Bester Match aus Quell-Spalten oder leer wenn kein guter Match",
      "transformation": "direct|uppercase|lowercase|trim|format_phone",
      "defaultValue": "Sinnvoller Standard-Wert falls keine passende Quelle",
      "confidence": 0-100,
      "reasoning": "Kurze Erklärung warum diese Zuordnung gewählt wurde"
    }
  ],
  "explanation": "Zusammenfassung der automatischen Mappings mit Anzahl der erfolgreichen Zuordnungen"
}

WICHTIG: 
- Verwende NUR existierende Spaltennamen aus den Listen oben
- Mappe nur mit Confidence > 80, sonst leer lassen  
- Priorisiere hohe Genauigkeit über Vollständigkeit
- Erkenne ähnliche Begriffe auch in zusammengesetzten Wörtern
      `;

      const result = await ollamaAPI.generateCompletion(mappingPrompt);
      
      // Parse AI response and extract mappings
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiResult = JSON.parse(jsonMatch[0]);
          
          if (aiResult.mappings && Array.isArray(aiResult.mappings)) {
            // Update mappings based on AI suggestions
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
              title: "KI-Mapping angewendet",
              description: aiResult.explanation || "Automatische Feldmappings wurden erstellt"
            });
          } else {
            throw new Error('Keine Mappings in AI-Antwort gefunden');
          }
        } else {
          throw new Error('AI-Antwort ist kein gültiges JSON');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        toast({
          title: "KI-Mapping teilweise erfolgreich",
          description: "AI-Antwort erhalten, aber Mappings konnten nicht automatisch angewendet werden. Versuchen Sie es mit einer präziseren Beschreibung.",
          variant: "default"
        });
      }

    } catch (error) {
      console.error('AI mapping error:', error);
      toast({
        title: "KI-Mapping fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler. Überprüfen Sie die Ollama-Verbindung.",
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Ziel-Template auswählen</label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  console.log('Template upload button clicked');
                  setShowTemplateUpload(true);
                }}
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

          {/* AI Assistant - Hidden/Compact Section */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 py-1">
              <Brain className="w-3 h-3" />
              Erweiterte Optionen
              <span className="ml-auto group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="mt-3 p-3 bg-muted/30 rounded border-l-2 border-muted-foreground/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ai-enabled"
                    checked={aiEnabled}
                    onCheckedChange={setAiEnabled}
                  />
                  <label htmlFor="ai-enabled" className="text-xs font-medium">
                    KI-Assistent
                  </label>
                </div>
                {aiEnabled && (
                  <Sparkles className="w-3 h-3 text-primary" />
                )}
              </div>

              {aiEnabled && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">KI-Anweisungen (optional)</label>
                    <Textarea
                      placeholder="z.B: 'Mappe alles so, dass es passt'"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="min-h-[60px] text-xs"
                    />
                  </div>
                  <Button
                    onClick={handleAiMapping}
                    disabled={isAiProcessing}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    {isAiProcessing ? (
                      <>
                        <Brain className="w-3 h-3 mr-1 animate-pulse" />
                        Verarbeitet...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 mr-1" />
                        Auto-Mapping
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </details>
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
                        value={mapping.sourceColumn || 'none'}
                        onValueChange={(value) => updateMapping(index, 'sourceColumn', value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Wählen..." />
                        </SelectTrigger>
                        <SelectContent className="z-[200]">
                          <SelectItem value="none">-- Keine --</SelectItem>
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
                        <SelectContent className="z-[200]">
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

      {/* Template Upload Modal */}
      {showTemplateUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border shadow-lg">
            <TemplateUpload
              onTemplateCreate={handleTemplateCreate}
              onClose={() => {
                console.log('Closing template upload');
                setShowTemplateUpload(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateMappingStep;