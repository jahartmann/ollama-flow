import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, Download, CheckCircle2, FileText } from 'lucide-react';
import LivePreview from '../../LivePreview';
import { CSVFile, CSVTemplate, TemplateColumnMapping } from '@/lib/transformationEngine';

interface PreviewStepProps {
  originalFiles: CSVFile[];
  processedData: CSVFile | null;
  selectedTemplate: CSVTemplate | null;
  columnMappings: TemplateColumnMapping[];
  onExport: (filename?: string) => void;
  onBack: () => void;
  onFinish: () => void;
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  originalFiles,
  processedData,
  selectedTemplate,
  columnMappings,
  onExport,
  onBack,
  onFinish
}) => {
  const sourceData = processedData || (originalFiles.length > 0 ? originalFiles[0] : null);
  
  // Transform data using the same logic as TemplateMappingStep
  const finalData = React.useMemo(() => {
    if (!sourceData || !selectedTemplate || columnMappings.length === 0) {
      return sourceData;
    }

    // Create new headers based on template columns
    const templateHeaders = columnMappings.map(mapping => mapping.templateColumn);
    
    // Transform data rows using enhanced formula processing
    const transformedData = sourceData.data.map(row => {
      return columnMappings.map(mapping => {
        let value = '';
        
        // Priority 1: Check if there's a formula
        if (mapping.formula && mapping.formula.trim()) {
          value = evaluateFormula(mapping.formula, row, sourceData.headers);
        }
        // Priority 2: Use source column mapping
        else if (mapping.sourceColumn) {
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
        // Priority 3: Use default value
        else {
          value = mapping.defaultValue || '';
        }
        
        return value;
      });
    });

    return {
      ...sourceData,
      headers: templateHeaders,
      data: transformedData,
      name: `${selectedTemplate.name}_${sourceData.name.replace('.csv', '')}`
    };
  }, [sourceData, selectedTemplate, columnMappings]);

  // Enhanced formula evaluation function (same as TemplateMappingStep)
  const evaluateFormula = (formula: string, row: string[], headers: string[]): string => {
    try {
      let result = formula.trim();
      
      // Replace column references with actual values (case-insensitive)
      headers.forEach((header, index) => {
        const value = row[index] || '';
        // Replace direct column name references (for formulas like "Name@domain.de")
        const regex = new RegExp(`\\b${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        result = result.replace(regex, value);
      });
      
      return result;
    } catch (error) {
      console.error('Formula evaluation error:', error, { formula, row, headers });
      return formula; // Return original formula if evaluation fails
    }
  };
  const [exportFilename, setExportFilename] = useState(() => {
    const templateName = selectedTemplate?.name || 'processed';
    const baseName = finalData?.name?.replace('.csv', '') || 'data';
    return `${templateName}_${baseName}`;
  });

  const handleExport = () => {
    onExport(exportFilename);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Ergebnis-Vorschau
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Quell-Dateien</Badge>
                </div>
                <p className="text-2xl font-bold mt-2">{originalFiles.length}</p>
                <p className="text-sm text-muted-foreground">
                  {originalFiles.reduce((total, file) => total + file.data.length, 0)} Datensätze gesamt
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Ergebnis</Badge>
                </div>
                <p className="text-2xl font-bold mt-2">
                  {finalData ? finalData.data.length : 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  Zeilen, {finalData ? finalData.headers.length : 0} Spalten
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Template</Badge>
                </div>
                <p className="text-lg font-medium mt-2">
                  {selectedTemplate ? selectedTemplate.name : 'Kein Template'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate ? 'Angewendet' : 'Original-Format'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview */}
          {finalData && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Datenvorschau</h3>
              <LivePreview 
                files={[finalData]} 
                recipe={{ 
                  name: 'Verarbeitung abgeschlossen',
                  description: 'Finales Ergebnis',
                  columnMappings: [],
                  newColumns: []
                }}
                onRecipeChange={() => {}}
              />
            </div>
          )}

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4" />
                Export-Einstellungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="export-filename" className="text-sm font-medium">
                  Dateiname (ohne .csv Erweiterung)
                </Label>
                <Input
                  id="export-filename"
                  value={exportFilename}
                  onChange={(e) => setExportFilename(e.target.value)}
                  placeholder="Dateiname eingeben..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleExport}
              className="flex-1 sm:flex-none"
              disabled={!finalData || !exportFilename.trim()}
            >
              <Download className="w-4 h-4 mr-2" />
              CSV exportieren als "{exportFilename}.csv"
            </Button>
            
            <div className="flex gap-2 flex-1 sm:flex-none">
              <Button variant="outline" onClick={onBack} className="flex-1 sm:flex-none">
                Zurück
              </Button>
              <Button onClick={onFinish} className="flex-1 sm:flex-none">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Fertig
              </Button>
            </div>
          </div>

          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Verarbeitung erfolgreich abgeschlossen!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Ihre CSV-Daten wurden erfolgreich verarbeitet und sind bereit für den Export.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PreviewStep;