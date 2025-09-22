import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Home, GitCompare, FileX, FilePlus, FileEdit, Download } from 'lucide-react';
import { CSVFile } from '@/lib/transformationEngine';
import { fileProcessor } from '@/lib/fileProcessor';
import { useToast } from '@/hooks/use-toast';

interface FileComparatorProps {
  files: CSVFile[];
  onComplete: (data?: CSVFile) => void;
  onBack: () => void;
  onReturnToHub: () => void;
}

interface DiffResult {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  rowIndex: number;
  data: string[];
  originalData?: string[];
}

const FileComparator: React.FC<FileComparatorProps> = ({
  files,
  onComplete,
  onBack,
  onReturnToHub
}) => {
  const [file1Index, setFile1Index] = useState<number>(0);
  const [file2Index, setFile2Index] = useState<number>(files.length > 1 ? 1 : 0);
  const [keyColumn, setKeyColumn] = useState<string>('');
  const [showOnlyDifferences, setShowOnlyDifferences] = useState<boolean>(false);
  const { toast } = useToast();

  const file1 = files[file1Index];
  const file2 = files[file2Index];

  // Calculate differences
  const diffResults = useMemo<DiffResult[]>(() => {
    if (!file1 || !file2 || !keyColumn || file1Index === file2Index) return [];

    const keyColumnIndex = file1.headers.indexOf(keyColumn);
    if (keyColumnIndex === -1) return [];

    const file2KeyIndex = file2.headers.indexOf(keyColumn);
    if (file2KeyIndex === -1) return [];

    // Create maps for easier lookup
    const file1Map = new Map<string, string[]>();
    const file2Map = new Map<string, string[]>();

    file1.data.forEach((row, index) => {
      const key = row[keyColumnIndex] || '';
      if (key) file1Map.set(key, row);
    });

    file2.data.forEach((row, index) => {
      const key = row[file2KeyIndex] || '';
      if (key) file2Map.set(key, row);
    });

    const results: DiffResult[] = [];
    const processedKeys = new Set<string>();

    // Check for modifications and unchanged rows
    file1Map.forEach((row1, key) => {
      processedKeys.add(key);
      const row2 = file2Map.get(key);
      
      if (!row2) {
        // Row removed in file2
        results.push({
          type: 'removed',
          rowIndex: results.length,
          data: row1
        });
      } else {
        // Check if modified
        const isModified = row1.some((cell, index) => {
          const file2ColIndex = file2.headers.findIndex(h => h === file1.headers[index]);
          return file2ColIndex !== -1 && cell !== (row2[file2ColIndex] || '');
        });

        results.push({
          type: isModified ? 'modified' : 'unchanged',
          rowIndex: results.length,
          data: row2,
          originalData: isModified ? row1 : undefined
        });
      }
    });

    // Check for added rows
    file2Map.forEach((row2, key) => {
      if (!processedKeys.has(key)) {
        results.push({
          type: 'added',
          rowIndex: results.length,
          data: row2
        });
      }
    });

    return results;
  }, [file1, file2, keyColumn, file1Index, file2Index]);

  // Filter results
  const filteredResults = useMemo(() => {
    if (!showOnlyDifferences) return diffResults;
    return diffResults.filter(result => result.type !== 'unchanged');
  }, [diffResults, showOnlyDifferences]);

  // Calculate statistics
  const stats = useMemo(() => {
    const added = diffResults.filter(r => r.type === 'added').length;
    const removed = diffResults.filter(r => r.type === 'removed').length;
    const modified = diffResults.filter(r => r.type === 'modified').length;
    const unchanged = diffResults.filter(r => r.type === 'unchanged').length;

    return {
      added,
      removed, 
      modified,
      unchanged,
      total: diffResults.length
    };
  }, [diffResults]);

  // Export differences
  const exportDifferences = () => {
    if (filteredResults.length === 0) return;

    const headers = ['Status', 'Schlüssel', ...file2.headers];
    const exportData = filteredResults.map(result => {
      const keyColIndex = file2.headers.indexOf(keyColumn);
      const key = keyColIndex !== -1 ? result.data[keyColIndex] || '' : '';
      
      let status = '';
      switch (result.type) {
        case 'added': status = 'Hinzugefügt'; break;
        case 'removed': status = 'Entfernt'; break;
        case 'modified': status = 'Geändert'; break;
        default: status = 'Unverändert';
      }

      return [status, key, ...result.data];
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `vergleich_${timestamp}.csv`;
    
    fileProcessor.exportAsCSV(exportData, headers, filename);
    
    toast({
      title: "Export erfolgreich",
      description: `Unterschiede als "${filename}" exportiert`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <GitCompare className="w-6 h-6 text-purple-600" />
          CSV-Dateien vergleichen
        </CardTitle>
        <p className="text-muted-foreground">
          Unterschiede zwischen zwei Dateien finden und visualisieren
        </p>
      </div>

      {/* File Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dateien auswählen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Datei 1 (Basis)</label>
              <Select value={file1Index.toString()} onValueChange={(value) => setFile1Index(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Datei auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {files.map((file, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {file.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Datei 2 (Vergleich)</label>
              <Select value={file2Index.toString()} onValueChange={(value) => setFile2Index(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Datei auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {files.map((file, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {file.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Schlüssel-Spalte</label>
              <Select value={keyColumn} onValueChange={setKeyColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Spalte auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {file1?.headers.filter(header => 
                    file2?.headers.includes(header)
                  ).map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {keyColumn && file1Index !== file2Index && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Vergleichsergebnis</CardTitle>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Nur Unterschiede:</label>
                <Switch 
                  checked={showOnlyDifferences}
                  onCheckedChange={setShowOnlyDifferences}
                />
                <Button onClick={exportDifferences} size="sm" variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Exportieren
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <FilePlus className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Hinzugefügt</span>
                  </div>
                  <div className="text-2xl font-bold text-green-800">{stats.added}</div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <FileX className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Entfernt</span>
                  </div>
                  <div className="text-2xl font-bold text-red-800">{stats.removed}</div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <FileEdit className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-700">Geändert</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-800">{stats.modified}</div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <GitCompare className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Unverändert</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{stats.unchanged}</div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-sm font-medium text-blue-700">Gesamt</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-800">{stats.total}</div>
                </CardContent>
              </Card>
            </div>

            {/* Data Table */}
            {filteredResults.length > 0 && (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium w-24">Status</th>
                      {file2.headers.map((header, index) => (
                        <th key={index} className="px-4 py-3 text-left font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.slice(0, 50).map((result, index) => (
                      <tr 
                        key={index} 
                        className={`border-b ${
                          result.type === 'added' ? 'bg-green-50 hover:bg-green-100' :
                          result.type === 'removed' ? 'bg-red-50 hover:bg-red-100' :
                          result.type === 'modified' ? 'bg-orange-50 hover:bg-orange-100' :
                          'hover:bg-muted/50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <Badge 
                            variant={
                              result.type === 'added' ? 'default' :
                              result.type === 'removed' ? 'destructive' :
                              result.type === 'modified' ? 'secondary' :
                              'outline'
                            }
                            className="text-xs"
                          >
                            {result.type === 'added' ? 'Neu' :
                             result.type === 'removed' ? 'Entfernt' :
                             result.type === 'modified' ? 'Geändert' : 'Gleich'}
                          </Badge>
                        </td>
                        {result.data.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-3">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredResults.length > 50 && (
              <p className="text-sm text-muted-foreground text-center">
                ... und {(filteredResults.length - 50).toLocaleString()} weitere Unterschiede
              </p>
            )}

            {filteredResults.length === 0 && keyColumn && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {showOnlyDifferences ? 'Keine Unterschiede gefunden' : 'Keine Daten zum Anzeigen'}
                </p>
              </div>
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
        
        <Button onClick={() => onComplete()} className="gap-2">
          Vergleich abschließen
        </Button>
      </div>
    </div>
  );
};

export default FileComparator;
