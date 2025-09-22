import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { GitCompare, FileX, FilePlus, FileEdit, Download } from 'lucide-react';
import { CSVFile } from '@/lib/transformationEngine';
import { fileProcessor } from '@/lib/fileProcessor';
import { useToast } from '@/hooks/use-toast';

interface ComparisonStepProps {
  files: CSVFile[];
  onBack: () => void;
  onFinish: () => void;
  onReturnToHub?: () => void;
}

interface DiffResult {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  rowIndex: number;
  data: string[];
  originalData?: string[];
}

const ComparisonStep: React.FC<ComparisonStepProps> = ({
  files,
  onBack,
  onFinish,
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
  const diffResults = useMemo(() => {
    if (!file1 || !file2 || !keyColumn) return [];

    const results: DiffResult[] = [];
    const file1KeyIndex = file1.headers.indexOf(keyColumn);
    const file2KeyIndex = file2.headers.indexOf(keyColumn);

    if (file1KeyIndex === -1 || file2KeyIndex === -1) return [];

    // Create lookup maps for efficient comparison
    const file1Map = new Map<string, { rowIndex: number; data: string[] }>();
    const file2Map = new Map<string, { rowIndex: number; data: string[] }>();

    file1.data.forEach((row, index) => {
      const key = row[file1KeyIndex];
      if (key) {
        file1Map.set(key, { rowIndex: index, data: row });
      }
    });

    file2.data.forEach((row, index) => {
      const key = row[file2KeyIndex];
      if (key) {
        file2Map.set(key, { rowIndex: index, data: row });
      }
    });

    // Find differences
    const allKeys = new Set([...file1Map.keys(), ...file2Map.keys()]);

    allKeys.forEach(key => {
      const entry1 = file1Map.get(key);
      const entry2 = file2Map.get(key);

      if (entry1 && entry2) {
        // Compare rows
        const hasChanges = entry1.data.some((cell, index) => {
          const correspondingIndex = file2.headers.indexOf(file1.headers[index]);
          if (correspondingIndex === -1) return false;
          return cell !== entry2.data[correspondingIndex];
        });

        results.push({
          type: hasChanges ? 'modified' : 'unchanged',
          rowIndex: entry1.rowIndex,
          data: entry1.data,
          originalData: entry2.data
        });
      } else if (entry1) {
        // Only in file1 (removed from file2)
        results.push({
          type: 'removed',
          rowIndex: entry1.rowIndex,
          data: entry1.data
        });
      } else if (entry2) {
        // Only in file2 (added to file2)
        results.push({
          type: 'added',
          rowIndex: entry2.rowIndex,
          data: entry2.data
        });
      }
    });

    return results.sort((a, b) => a.rowIndex - b.rowIndex);
  }, [file1, file2, keyColumn]);

  const filteredResults = showOnlyDifferences 
    ? diffResults.filter(result => result.type !== 'unchanged')
    : diffResults;

  const stats = useMemo(() => {
    const added = diffResults.filter(r => r.type === 'added').length;
    const removed = diffResults.filter(r => r.type === 'removed').length;
    const modified = diffResults.filter(r => r.type === 'modified').length;
    const unchanged = diffResults.filter(r => r.type === 'unchanged').length;
    
    return { added, removed, modified, unchanged, total: diffResults.length };
  }, [diffResults]);

  const getRowTypeIcon = (type: DiffResult['type']) => {
    switch (type) {
      case 'added': return <FilePlus className="w-4 h-4 text-green-600" />;
      case 'removed': return <FileX className="w-4 h-4 text-red-600" />;
      case 'modified': return <FileEdit className="w-4 h-4 text-amber-600" />;
      default: return null;
    }
  };

  const getRowTypeBadge = (type: DiffResult['type']) => {
    switch (type) {
      case 'added': return <Badge className="bg-green-100 text-green-800 text-xs">Neu</Badge>;
      case 'removed': return <Badge className="bg-red-100 text-red-800 text-xs">Entfernt</Badge>;
      case 'modified': return <Badge className="bg-amber-100 text-amber-800 text-xs">Geändert</Badge>;
      case 'unchanged': return <Badge variant="outline" className="text-xs">Unverändert</Badge>;
    }
  };

  const exportDifferences = () => {
    if (filteredResults.length === 0) {
      toast({
        title: "Keine Daten zum Exportieren",
        description: "Es wurden keine Unterschiede gefunden.",
        variant: "destructive"
      });
      return;
    }

    try {
      const exportData = filteredResults.map(result => [
        result.type,
        ...result.data
      ]);

      const headers = ['Status', ...file1.headers];
      
      fileProcessor.exportAsCSV(
        exportData,
        headers,
        `comparison_${file1.name}_vs_${file2.name}`
      );

      toast({
        title: "Export erfolgreich",
        description: "Differenzen-Report wurde heruntergeladen"
      });
    } catch (error) {
      toast({
        title: "Export fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive"
      });
    }
  };

  const commonHeaders = file1 && file2 
    ? file1.headers.filter(header => file2.headers.includes(header))
    : [];

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Dateien vergleichen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Erste Datei</label>
              <Select value={file1Index.toString()} onValueChange={(value) => setFile1Index(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {files.map((file, index) => (
                    <SelectItem key={file.id} value={index.toString()}>
                      {file.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Zweite Datei</label>
              <Select value={file2Index.toString()} onValueChange={(value) => setFile2Index(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {files.map((file, index) => (
                    <SelectItem key={file.id} value={index.toString()}>
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
                  <SelectValue placeholder="Spalte wählen" />
                </SelectTrigger>
                <SelectContent>
                  {commonHeaders.map(header => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-differences"
                checked={showOnlyDifferences}
                onCheckedChange={setShowOnlyDifferences}
              />
              <label htmlFor="show-differences" className="text-sm font-medium">
                Nur Unterschiede anzeigen
              </label>
            </div>

            <Button onClick={exportDifferences} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Differenzen exportieren
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {keyColumn && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.added}</div>
                <div className="text-sm text-muted-foreground">Hinzugefügt</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.removed}</div>
                <div className="text-sm text-muted-foreground">Entfernt</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{stats.modified}</div>
                <div className="text-sm text-muted-foreground">Geändert</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{stats.unchanged}</div>
                <div className="text-sm text-muted-foreground">Unverändert</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Gesamt</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {keyColumn && filteredResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Vergleichsergebnisse ({filteredResults.length} Einträge)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-sm font-medium">Status</th>
                    {file1.headers.map((header, index) => (
                      <th key={index} className="text-left p-2 text-sm font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.slice(0, 100).map((result, index) => (
                    <tr key={index} className={`border-b hover:bg-muted/50 ${
                      result.type === 'added' ? 'bg-green-50' :
                      result.type === 'removed' ? 'bg-red-50' :
                      result.type === 'modified' ? 'bg-amber-50' : ''
                    }`}>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {getRowTypeIcon(result.type)}
                          {getRowTypeBadge(result.type)}
                        </div>
                      </td>
                      {result.data.map((cell, cellIndex) => (
                        <td key={cellIndex} className="p-2 text-sm">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredResults.length > 100 && (
                <div className="text-center p-4 text-sm text-muted-foreground">
                  ... und {filteredResults.length - 100} weitere Einträge
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Zurück
          </Button>
          {onReturnToHub && (
            <Button variant="ghost" onClick={onReturnToHub}>
              Zurück zum Hub
            </Button>
          )}
        </div>
        
        <Button onClick={onFinish} className="px-8">
          Vergleich abschließen
        </Button>
      </div>
    </div>
  );
};

export default ComparisonStep;