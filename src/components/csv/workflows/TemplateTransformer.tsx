import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Home, LayoutTemplate, Plus, X, Download, Wand2, Eye } from 'lucide-react';
import { CSVFile, CSVTemplate, TemplateColumnMapping, transformationEngine } from '@/lib/transformationEngine';
import { fileProcessor } from '@/lib/fileProcessor';
import { useToast } from '@/hooks/use-toast';
import TemplateUpload from '../steps/TemplateUpload';

interface TemplateTransformerProps {
  files: CSVFile[];
  onComplete: (data?: CSVFile) => void;
  onBack: () => void;
  onReturnToHub: () => void;
}

const TemplateTransformer: React.FC<TemplateTransformerProps> = ({
  files,
  onComplete,
  onBack,
  onReturnToHub
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<CSVTemplate | null>(null);
  const [mappings, setMappings] = useState<TemplateColumnMapping[]>([]);
  const [showTemplateUpload, setShowTemplateUpload] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<CSVTemplate[]>([]);
  const { toast } = useToast();

  // Load custom templates
  React.useEffect(() => {
    const loadedTemplates = transformationEngine.getTemplates();
    setCustomTemplates(loadedTemplates);
  }, []);

  // Initialize mappings when template changes
  React.useEffect(() => {
    if (selectedTemplate) {
      const initialMappings: TemplateColumnMapping[] = selectedTemplate.columns.map(column => ({
        templateColumn: column.name,
        sourceColumn: '',
        transformation: 'direct' as const,
        formula: '',
        defaultValue: ''
      }));
      setMappings(initialMappings);
    }
  }, [selectedTemplate]);

  // Get the first file for mapping
  const sourceFile = files[0];

  // Process preview data
  const previewData = useMemo(() => {
    if (!sourceFile || !selectedTemplate || mappings.length === 0) {
      return null;
    }

    try {
      // Apply transformation
      const result = transformationEngine.applyTemplate(sourceFile, selectedTemplate, mappings);
      return result;
    } catch (error) {
      console.error('Error processing template:', error);
      return null;
    }
  }, [sourceFile, selectedTemplate, mappings]);

  const handleTemplateSelect = (templateId: string) => {
    const template = customTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      toast({
        title: "Template ausgewählt",
        description: `Template "${template.name}" wurde geladen`
      });
    }
  };

  const handleTemplateCreate = (template: CSVTemplate) => {
    const savedTemplate = transformationEngine.saveTemplate(template);
    setCustomTemplates(prev => [...prev, savedTemplate]);
    setSelectedTemplate(savedTemplate);
    setShowTemplateUpload(false);
    
    toast({
      title: "Template erstellt",
      description: `Template "${template.name}" wurde gespeichert`
    });
  };

  const updateMapping = (index: number, field: keyof TemplateColumnMapping, value: string) => {
    setMappings(prev => prev.map((mapping, i) => 
      i === index ? { ...mapping, [field]: value } : mapping
    ));
  };

  const handleExport = () => {
    if (!previewData) return;
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `transformiert_${timestamp}.csv`;
    
    fileProcessor.exportAsCSV(previewData.data, previewData.headers, filename);
    
    toast({
      title: "Export erfolgreich",
      description: `Daten als "${filename}" exportiert`
    });
  };

  const isValid = selectedTemplate && mappings.some(m => m.sourceColumn || m.defaultValue || m.formula);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <LayoutTemplate className="w-6 h-6 text-blue-600" />
          CSV transformieren
        </CardTitle>
        <p className="text-muted-foreground">
          Template-basierte Transformation mit Spalten-Mapping und Formeln
        </p>
      </div>

      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Template auswählen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedTemplate?.id || ''} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Template auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {customTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowTemplateUpload(true)} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Neues Template
            </Button>
          </div>

          {selectedTemplate && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">{selectedTemplate.name}</h4>
              <p className="text-sm text-blue-700 mb-3">{selectedTemplate.description}</p>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.columns.map((column, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {column.name} ({column.type})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Mapping */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spalten-Mapping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mappings.map((mapping, index) => (
              <div key={index} className="grid md:grid-cols-4 gap-4 p-4 border rounded-lg">
                <div>
                  <label className="text-sm font-medium mb-2 block">Ziel-Spalte</label>
                  <div className="font-medium text-sm bg-muted p-2 rounded">
                    {mapping.templateColumn}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Quell-Spalte</label>
                  <Select
                    value={mapping.sourceColumn}
                    onValueChange={(value) => updateMapping(index, 'sourceColumn', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Spalte wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Keine</SelectItem>
                      {sourceFile?.headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Formel</label>
                  <Input
                    placeholder="z.B. CONCAT({Vorname}, ' ', {Nachname})"
                    value={mapping.formula}
                    onChange={(e) => updateMapping(index, 'formula', e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Standard-Wert</label>
                  <Input
                    placeholder="Fallback-Wert"
                    value={mapping.defaultValue}
                    onChange={(e) => updateMapping(index, 'defaultValue', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Live Preview */}
      {previewData && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live-Vorschau
              </CardTitle>
              <Button onClick={handleExport} className="gap-2">
                <Download className="w-4 h-4" />
                Exportieren
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {previewData.headers.map((header, index) => (
                      <th key={index} className="px-4 py-3 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.data.slice(0, 10).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b hover:bg-muted/50">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewData.data.length > 10 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                ... und {(previewData.data.length - 10).toLocaleString()} weitere Zeilen
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Button>
          <Button variant="ghost" onClick={onReturnToHub} className="gap-2">
            <Home className="w-4 h-4" />
            Hub
          </Button>
        </div>
        
        <Button 
          onClick={() => onComplete(previewData || undefined)} 
          disabled={!isValid}
          className="gap-2"
        >
          Transformation abschließen
        </Button>
      </div>

      {/* Template Upload Modal */}
      {showTemplateUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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

export default TemplateTransformer;