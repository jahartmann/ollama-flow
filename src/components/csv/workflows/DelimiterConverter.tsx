import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Home, Download, Edit, CheckCircle } from 'lucide-react';
import { CSVFile } from '@/lib/transformationEngine';
import { fileProcessor } from '@/lib/fileProcessor';
import { useToast } from '@/hooks/use-toast';

interface DelimiterConverterProps {
  files: CSVFile[];
  onComplete: (data?: CSVFile) => void;
  onBack: () => void;
  onReturnToHub: () => void;
}

const DelimiterConverter: React.FC<DelimiterConverterProps> = ({
  files,
  onComplete,
  onBack,
  onReturnToHub
}) => {
  const [selectedDelimiter, setSelectedDelimiter] = useState<string>(',');
  const [isConverting, setIsConverting] = useState(false);
  const { toast } = useToast();

  const delimiters = [
    { value: ',', label: 'Komma (,)', name: 'Komma' },
    { value: ';', label: 'Semikolon (;)', name: 'Semikolon' },
    { value: '\t', label: 'Tab', name: 'Tab' },
    { value: '|', label: 'Pipe (|)', name: 'Pipe' }
  ];

  const file = files[0];
  const currentDelimiter = file?.delimiter || ',';
  const currentDelimiterInfo = delimiters.find(d => d.value === currentDelimiter);
  const newDelimiterInfo = delimiters.find(d => d.value === selectedDelimiter);

  const handleConvert = () => {
    if (!file) return;

    setIsConverting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `converted_${timestamp}.csv`;
      
      fileProcessor.exportAsCSV(file.data, file.headers, filename, selectedDelimiter);
      
      toast({
        title: "Konvertierung erfolgreich",
        description: `Datei als "${filename}" heruntergeladen`
      });
      
      onComplete();
    } catch (error) {
      toast({
        title: "Fehler bei der Konvertierung",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    } finally {
      setIsConverting(false);
    }
  };

  const isDifferentDelimiter = selectedDelimiter !== currentDelimiter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <Edit className="w-6 h-6 text-green-600" />
          CSV Format umwandeln
        </CardTitle>
        <p className="text-muted-foreground">
          Delimiter ändern und CSV herunterladen
        </p>
      </div>

      {/* File Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dateiinformationen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Aktuelle Datei
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Datei:</span>
                  <span className="font-medium">{file.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delimiter:</span>
                  <Badge variant="outline">{currentDelimiterInfo?.name || 'Unbekannt'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Zeilen:</span>
                  <span className="font-medium">{file.data.length.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Spalten:</span>
                  <span className="font-medium">{file.headers.length}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Neues Format
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Neuer Delimiter:</label>
                  <Select value={selectedDelimiter} onValueChange={setSelectedDelimiter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Delimiter wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {delimiters.map((delimiter) => (
                        <SelectItem key={delimiter.value} value={delimiter.value}>
                          {delimiter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isDifferentDelimiter && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {currentDelimiterInfo?.name} → {newDelimiterInfo?.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datenvorschau</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {file.headers.map((header, index) => (
                    <th key={index} className="px-4 py-3 text-left font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {file.data.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b">
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
          {file.data.length > 5 && (
            <p className="text-sm text-muted-foreground mt-3">
              ... und {(file.data.length - 5).toLocaleString()} weitere Zeilen
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          onClick={handleConvert}
          disabled={isConverting || !isDifferentDelimiter}
          size="lg"
          className="gap-2 px-8"
        >
          <Download className="w-4 h-4" />
          {isConverting ? 'Konvertiere...' : 'CSV herunterladen'}
        </Button>

        {!isDifferentDelimiter && (
          <p className="text-center text-sm text-muted-foreground self-center">
            Wählen Sie einen anderen Delimiter zum Konvertieren
          </p>
        )}
      </div>

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
      </div>
    </div>
  );
};

export default DelimiterConverter;