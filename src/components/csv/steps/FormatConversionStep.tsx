import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CSVFile } from '@/lib/transformationEngine';
import { fileProcessor } from '@/lib/fileProcessor';
import { ArrowLeft, ArrowRight, Download } from 'lucide-react';

interface FormatConversionStepProps {
  files: CSVFile[];
  onBack: () => void;
  onReturnToHub?: () => void;
}

const FormatConversionStep: React.FC<FormatConversionStepProps> = ({
  files,
  onBack,
  onReturnToHub
}) => {
  const [selectedDelimiter, setSelectedDelimiter] = useState<string>(',');
  const [isConverting, setIsConverting] = useState(false);

  const delimiters = [
    { value: ',', label: 'Komma (,)' },
    { value: ';', label: 'Semikolon (;)' },
    { value: '\t', label: 'Tab' },
    { value: '|', label: 'Pipe (|)' }
  ];

  const handleConvert = () => {
    if (files.length === 0) return;

    setIsConverting(true);

    try {
      const file = files[0];
      
      // Export mit neuem Delimiter
      const newFilename = file.name.replace(/\.[^/.]+$/, '') + '_converted.csv';
      fileProcessor.exportAsCSV(file.data, file.headers, newFilename, selectedDelimiter);
      
    } catch (error) {
      console.error('Fehler bei der Konvertierung:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const currentDelimiter = files[0]?.delimiter || ',';
  const currentDelimiterLabel = delimiters.find(d => d.value === currentDelimiter)?.label || 'Unbekannt';

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">CSV Format umwandeln</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {files.length > 0 && (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Aktuelles Format</h3>
                <div className="p-4 bg-muted rounded-lg">
                  <p><strong>Datei:</strong> {files[0].name}</p>
                  <p><strong>Delimiter:</strong> {currentDelimiterLabel}</p>
                  <p><strong>Zeilen:</strong> {files[0].data.length}</p>
                  <p><strong>Spalten:</strong> {files[0].headers.length}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Neues Format</h3>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="space-y-3">
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
                  </div>
                </div>
              </div>
            </div>

            {/* Vorschau der ersten paar Zeilen */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Datenvorschau</h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {files[0].headers.map((header, index) => (
                        <th key={index} className="px-4 py-2 text-left font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {files[0].data.slice(0, 5).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-2">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {files[0].data.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  ... und {files[0].data.length - 5} weitere Zeilen
                </p>
              )}
            </div>

            {/* Konvertierungsbereich */}
            <div className="flex justify-center pt-4">
              <Button 
                onClick={handleConvert}
                disabled={isConverting || selectedDelimiter === currentDelimiter}
                size="lg"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {isConverting ? 'Konvertiere...' : 'CSV herunterladen'}
              </Button>
            </div>

            {selectedDelimiter === currentDelimiter && (
              <p className="text-center text-sm text-muted-foreground">
                Das gewählte Format ist identisch mit dem aktuellen Format
              </p>
            )}
          </>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </Button>

          <div className="space-x-2">
            {onReturnToHub && (
              <Button variant="outline" onClick={onReturnToHub}>
                Zurück zum Hub
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FormatConversionStep;