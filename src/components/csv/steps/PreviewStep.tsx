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
  files: CSVFile[];
  processedData: CSVFile | null;
  selectedTemplate: CSVTemplate | null;
  columnMappings: TemplateColumnMapping[];
  onExport: (filename?: string) => void;
  onBack: () => void;
  onFinish: () => void;
  onReturnToHub?: () => void;
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  files,
  processedData,
  selectedTemplate,
  columnMappings,
  onExport,
  onBack,
  onFinish,
  onReturnToHub
}) => {
  const sourceData = processedData || (files.length > 0 ? files[0] : null);
  
  // Enhanced formula evaluation function
  const evaluateFormula = React.useCallback((formula: string, row: string[], headers: string[]): string => {
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
  }, []);
  
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
  }, [sourceData, selectedTemplate, columnMappings, evaluateFormula]);

  const [exportFilename, setExportFilename] = useState(() => {
    const templateName = selectedTemplate?.name || 'processed';
    const baseName = finalData?.name?.replace('.csv', '') || 'data';
    return `${templateName}_${baseName}`;
  });

  const handleExport = () => {
    onExport(exportFilename);
  };

  // Debug logging to help identify the white screen issue
  console.log('PreviewStep render:', {
    files: files?.length,
    processedData: !!processedData,
    selectedTemplate: !!selectedTemplate,
    selectedTemplateName: selectedTemplate?.name,
    columnMappings: columnMappings?.length,
    finalData: !!finalData,
    finalDataLength: finalData?.data?.length,
    sourceData: !!sourceData
  });

  if (!sourceData) {
    console.warn('PreviewStep: No source data available');
    return (
      <div className="space-y-6">
        <div className="glass-card p-8 text-center bg-card border border-border">
          <div className="text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2 text-foreground">Keine Daten verfügbar</h3>
            <p>Es wurden keine Daten zum Anzeigen gefunden.</p>
            <p className="text-sm mt-2 text-destructive">
              Debug: Files: {files.length}, ProcessedData: {processedData ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="flex items-center gap-3">
            <div className="glow-button p-2 rounded-lg">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Ergebnis-Vorschau</h2>
              <p className="text-sm text-muted-foreground font-normal">
                Überprüfen Sie Ihre transformierten Daten vor dem Export
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          {/* Modern Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="data-card p-6 group hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-data-primary/10 text-data-primary border-data-primary/20">
                  Quell-Dateien
                </Badge>
                <div className="w-8 h-8 rounded-full bg-data-primary/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-data-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-data-primary">{files.length}</p>
                <p className="text-sm text-muted-foreground">
                  {files.reduce((total, file) => total + file.data.length, 0)} Datensätze gesamt
                </p>
              </div>
            </div>
            
            <div className="data-card p-6 group hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-data-success/10 text-data-success border-data-success/20">
                  Ergebnis
                </Badge>
                <div className="w-8 h-8 rounded-full bg-data-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-data-success" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-data-success">
                  {finalData ? finalData.data.length : 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  Zeilen, {finalData ? finalData.headers.length : 0} Spalten
                </p>
              </div>
            </div>
            
            <div className="data-card p-6 group hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <Badge className="bg-data-secondary/10 text-data-secondary border-data-secondary/20">
                  Template
                </Badge>
                <div className="w-8 h-8 rounded-full bg-data-secondary/20 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-data-secondary" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-data-secondary">
                  {selectedTemplate ? selectedTemplate.name : 'Original'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate ? 'Template angewendet' : 'Keine Transformation'}
                </p>
              </div>
            </div>
          </div>

          {/* Modern Live Preview */}
          {finalData && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="glow-button p-2 rounded-lg">
                  <Eye className="w-4 h-4" />
                </div>
                <h3 className="text-xl font-bold">Datenvorschau</h3>
              </div>
              <div className="glass-card p-6">
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
            </div>
          )}

          {/* Modern Export Options */}
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="glow-button p-2 rounded-lg">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Export-Einstellungen</h3>
                <p className="text-sm text-muted-foreground">
                  Konfigurieren Sie den Dateiexport
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="export-filename" className="text-sm font-medium">
                Dateiname (ohne .csv Erweiterung)
              </Label>
              <Input
                id="export-filename"
                value={exportFilename}
                onChange={(e) => setExportFilename(e.target.value)}
                placeholder="Dateiname eingeben..."
                className="h-12 text-base"
              />
            </div>
          </div>

          {/* Modern Action Buttons */}
          <div className="flex flex-col lg:flex-row gap-4 pt-6 border-t border-border/50">
            <Button 
              onClick={() => onExport(exportFilename)}
              className="glow-button h-12 text-base font-medium flex-1 lg:flex-none lg:px-8"
              disabled={!finalData || !exportFilename.trim()}
            >
              <Download className="w-5 h-5 mr-3" />
              Exportieren als "{exportFilename.slice(0, 15)}{exportFilename.length > 15 ? '...' : ''}.csv"
            </Button>
            
            <div className="flex gap-3 flex-1 lg:flex-none">
              <Button 
                variant="outline" 
                onClick={onBack} 
                className="flex-1 lg:flex-none h-12 text-base"
              >
                Zurück
              </Button>
              <Button 
                onClick={onFinish} 
                className="flex-1 lg:flex-none h-12 text-base bg-data-success hover:bg-data-success/90"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Abschließen
              </Button>
            </div>
          </div>

          {/* Modern Success Message */}
          <div className="data-card p-6 border border-data-success/20 bg-data-success/5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-data-success/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-data-success" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-data-success">
                  Transformation erfolgreich abgeschlossen!
                </h4>
                <p className="text-sm text-muted-foreground">
                  Ihre CSV-Daten wurden erfolgreich verarbeitet und sind bereit für den Export. 
                  Überprüfen Sie die Vorschau und klicken Sie auf "Exportieren" um die Datei herunterzuladen.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
};

export default PreviewStep;