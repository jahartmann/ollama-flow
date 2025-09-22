import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Eye, Download, Play } from 'lucide-react';
import { CSVFile, TransformationRecipe, NewColumn, transformationEngine } from '@/lib/transformationEngine';
import { fileProcessor } from '@/lib/fileProcessor';
import { useToast } from '@/hooks/use-toast';

interface ProcessingResult {
  success: boolean;
  data: CSVFile | null;
  error?: string;
  message?: string;
}

interface LivePreviewProps {
  files: CSVFile[];
  recipe: Partial<TransformationRecipe>;
  onRecipeChange: (recipe: Partial<TransformationRecipe>) => void;
}

const LivePreview: React.FC<LivePreviewProps> = ({ files, recipe, onRecipeChange }) => {
  const [previewData, setPreviewData] = useState<CSVFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Enhanced CSV processing with direct data transformation
  const processCSVData = (files: CSVFile[], recipe: Partial<TransformationRecipe>): ProcessingResult => {
    if (!files || files.length === 0) {
      return {
        success: false,
        error: 'Keine Dateien zum Verarbeiten vorhanden',
        data: null
      };
    }

    try {
      // Use the first file as base data
      let result = files[0];
      
      // Apply merge if multiple files and merge settings exist
      if (files.length > 1 && recipe.mergeSettings) {
        result = transformationEngine.mergeFiles(
          files, 
          recipe.mergeSettings.method, 
          recipe.mergeSettings.joinColumn
        );
      }

      return {
        success: true,
        data: result,
        message: 'Daten erfolgreich verarbeitet'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        data: null
      };
    }
  };

  // Auto-process when files or recipe change
  useEffect(() => {
    if (files.length > 0) {
      setIsProcessing(true);
      const result = processCSVData(files, recipe);
      
      if (result.success && result.data) {
        setPreviewData(result.data);
      } else {
        toast({
          title: "Verarbeitungsfehler",
          description: result.error || "Unbekannter Fehler",
          variant: "destructive"
        });
      }
      setIsProcessing(false);
    }
  }, [files, recipe, toast]);

  // Update recipe functions
  const updateColumnMapping = (index: number, field: string, value: string) => {
    const newMappings = [...(recipe.columnMappings || [])];
    if (newMappings[index]) {
      (newMappings[index] as any)[field] = value;
      onRecipeChange({ ...recipe, columnMappings: newMappings });
    }
  };

  const addNewColumn = () => {
    const newColumns = [...(recipe.newColumns || [])];
    newColumns.push({
      name: `Neue_Spalte_${newColumns.length + 1}`,
      type: 'fixed',
      value: ''
    });
    onRecipeChange({ ...recipe, newColumns });
  };

  const updateColumn = (index: number, field: keyof NewColumn, value: string) => {
    const newColumns = [...(recipe.newColumns || [])];
    if (newColumns[index]) {
      (newColumns[index] as any)[field] = value;
      onRecipeChange({ ...recipe, newColumns });
    }
  };

  const removeColumn = (index: number) => {
    const newColumns = [...(recipe.newColumns || [])];
    newColumns.splice(index, 1);
    onRecipeChange({ ...recipe, newColumns });
  };

  const exportPreview = () => {
    if (previewData) {
      fileProcessor.exportAsCSV(previewData.data, previewData.headers, `preview_${previewData.name}.csv`);
      toast({
        title: "Export erfolgreich",
        description: "Vorschau wurde als CSV exportiert"
      });
    }
  };

  // Preview data (first 10 rows)
  const displayData = useMemo(() => {
    if (!previewData) return null;
    return {
      ...previewData,
      data: previewData.data.slice(0, 10)
    };
  }, [previewData]);

  return (
    <div className="space-y-6">
      {/* Recipe Configuration */}
      <Card className="border-2 border-dashed border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Live Transformation Recipe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* New Columns Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Neue Spalten hinzufügen</h3>
              <Button variant="outline" size="sm" onClick={addNewColumn}>
                <Plus className="w-4 h-4 mr-1" />
                Spalte hinzufügen
              </Button>
            </div>
            
            {recipe.newColumns && recipe.newColumns.length > 0 ? (
              <div className="space-y-3">
                {recipe.newColumns.map((col, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg">
                    <div className="col-span-3">
                      <Input
                        placeholder="Spaltenname"
                        value={col.name}
                        onChange={(e) => updateColumn(index, 'name', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Select value={col.type} onValueChange={(value: any) => updateColumn(index, 'type', value)}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fester Wert</SelectItem>
                          <SelectItem value="formula">Formel</SelectItem>
                          <SelectItem value="conditional">Bedingung</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6">
                      <Input
                        placeholder="Fester Wert oder Formel"
                        value={col.value || ''}
                        onChange={(e) => updateColumn(index, 'value', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeColumn(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Keine neuen Spalten definiert</p>
                <p className="text-xs">Klicken Sie "Spalte hinzufügen" um neue Daten zu generieren</p>
              </div>
            )}
            
            {recipe.newColumns && recipe.newColumns.length > 0 && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <h4 className="text-xs font-medium mb-2">Neue Spalten Vorschau:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {recipe.newColumns.map((col, index) => (
                    <div key={index} className="p-2 border rounded">
                      <div className="text-sm font-medium">{col.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {col.type} | {col.value || 'Kein Wert'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Live Vorschau {displayData && `(${displayData.data.length} von ${previewData?.rowCount || 0} Zeilen)`}
            </div>
            <div className="flex items-center gap-2">
              {previewData && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  ✓ {previewData.rowCount} Zeilen
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportPreview}
                disabled={!previewData}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isProcessing ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Verarbeitung läuft...</span>
            </div>
          ) : displayData ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {displayData.headers.map((header, index) => (
                      <th key={index} className="text-left p-3 font-medium min-w-[120px]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayData.data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b hover:bg-muted/20">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="p-3 max-w-[200px] truncate">
                          {cell || <span className="text-muted-foreground italic">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {previewData && previewData.data.length > 10 && (
                <div className="mt-4 p-3 bg-muted/30 rounded text-center text-sm text-muted-foreground">
                  Zeige 10 von {previewData.data.length} Zeilen. 
                  Verwende Export für alle Daten.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Keine Daten verfügbar</p>
              <p className="text-xs">Laden Sie CSV-Dateien hoch um eine Vorschau zu sehen</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LivePreview;