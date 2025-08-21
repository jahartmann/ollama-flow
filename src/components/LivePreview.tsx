import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { 
  transformationEngine, 
  type CSVFile, 
  type TransformationRecipe 
} from '@/lib/transformationEngine';

interface LivePreviewProps {
  files: CSVFile[];
  recipe: Partial<TransformationRecipe>;
  maxRows?: number;
}

const LivePreview: React.FC<LivePreviewProps> = ({ 
  files, 
  recipe, 
  maxRows = 10 
}) => {
  const previewResult = useMemo(() => {
    if (files.length === 0 || !recipe.name) {
      return {
        success: false,
        error: 'Keine Dateien oder Rezept verfügbar',
        data: null
      };
    }

    try {
      // Create a complete recipe for preview
      const completeRecipe: TransformationRecipe = {
        id: 'preview',
        name: recipe.name || 'Preview',
        description: recipe.description || '',
        sourceFiles: recipe.sourceFiles || [],
        columnMappings: recipe.columnMappings || [],
        newColumns: recipe.newColumns || [],
        mergeStrategy: recipe.mergeStrategy || 'append',
        joinColumn: recipe.joinColumn,
        created: new Date()
      };

      return transformationEngine.applyRecipe(files, completeRecipe);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        data: null
      };
    }
  }, [files, recipe]);

  if (!files.length) {
    return (
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Live-Vorschau
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Laden Sie Dateien, um eine Vorschau zu sehen</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Live-Vorschau
          {previewResult.success ? (
            <Badge variant="outline" className="ml-auto">
              <CheckCircle2 className="w-3 h-3 mr-1 text-success" />
              Erfolgreich
            </Badge>
          ) : (
            <Badge variant="destructive" className="ml-auto">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Fehler
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {previewResult.success && previewResult.data ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {previewResult.data.data.length} Zeilen, {previewResult.data.headers.length} Spalten
              </span>
              <span>
                Zeige erste {Math.min(maxRows, previewResult.data.data.length)} Zeilen
              </span>
            </div>
            
            <div className="overflow-auto max-h-96 border rounded">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="w-8 p-2 text-center border-r text-xs font-medium">#</th>
                    {previewResult.data.headers.map((header, index) => (
                      <th key={index} className="p-2 text-left font-medium border-r min-w-24">
                        <div className="flex flex-col">
                          <span className="font-medium">{header}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            {transformationEngine['getExcelColumnName'] ? 
                              transformationEngine['getExcelColumnName'](index + 1) : 
                              String.fromCharCode(65 + index)
                            }1
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewResult.data.data.slice(0, maxRows).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-center border-r text-xs text-muted-foreground bg-muted/30">
                        {rowIndex + 1}
                      </td>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="p-2 border-r">
                          <div className="max-w-32 truncate" title={cell || ''}>
                            {cell || (
                              <span className="text-muted-foreground italic">leer</span>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewResult.data.data.length > maxRows && (
              <p className="text-xs text-muted-foreground text-center">
                ... und {previewResult.data.data.length - maxRows} weitere Zeilen
              </p>
            )}

            {/* Formula Examples */}
            {recipe.newColumns && recipe.newColumns.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Formel-Beispiele:</h4>
                <div className="space-y-1 text-xs">
                  {recipe.newColumns
                    .filter(col => col.type === 'formula' && col.formula)
                    .map((col, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Badge variant="outline" className="text-xs">
                          {col.name}
                        </Badge>
                        <span className="font-mono text-muted-foreground">
                          {col.formula}
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h3 className="font-medium text-destructive mb-2">Vorschau-Fehler</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {previewResult.error}
            </p>
            
            {/* Show what we can analyze from current inputs */}
            {files.length > 0 && (
              <div className="mt-6 text-left">
                <h4 className="text-sm font-medium mb-3">Verfügbare Quell-Daten:</h4>
                <div className="space-y-2">
                  {files.map((file) => (
                    <div key={file.id} className="p-2 border rounded text-xs">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-muted-foreground mt-1">
                        Spalten: {file.headers.join(', ')}
                      </div>
                      <div className="text-muted-foreground">
                        {file.data.length} Zeilen
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LivePreview;