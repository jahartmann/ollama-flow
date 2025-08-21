import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, FileText } from 'lucide-react';

interface DelimiterSelectorProps {
  detectedDelimiter: string;
  selectedDelimiter: string;
  onDelimiterChange: (delimiter: string) => void;
  onReprocess: () => void;
  fileName?: string;
  sampleData?: string[];
}

const DelimiterSelector: React.FC<DelimiterSelectorProps> = ({
  detectedDelimiter,
  selectedDelimiter,
  onDelimiterChange,
  onReprocess,
  fileName,
  sampleData = []
}) => {
  const delimiters = [
    { value: ';', label: 'Semikolon (;)', description: 'Europäisches Format' },
    { value: ',', label: 'Komma (,)', description: 'Amerikanisches Format' },
    { value: '\t', label: 'Tab', description: 'Tabulator-getrennt' },
    { value: '|', label: 'Pipe (|)', description: 'Pipe-getrennt' }
  ];

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="w-4 h-4" />
          CSV-Trennzeichen
          {fileName && (
            <Badge variant="outline" className="ml-2">
              <FileText className="w-3 h-3 mr-1" />
              {fileName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p className="text-muted-foreground mb-2">
            Automatisch erkannt: <Badge variant="secondary">{detectedDelimiter === ';' ? 'Semikolon' : detectedDelimiter === ',' ? 'Komma' : detectedDelimiter}</Badge>
          </p>
          <p className="text-xs text-muted-foreground">
            Wählen Sie das richtige Trennzeichen für Ihre CSV-Datei:
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {delimiters.map((delimiter) => (
            <Button
              key={delimiter.value}
              variant={selectedDelimiter === delimiter.value ? "default" : "outline"}
              size="sm"
              onClick={() => onDelimiterChange(delimiter.value)}
              className="justify-start text-left h-auto py-2"
            >
              <div>
                <div className="font-medium text-xs">{delimiter.label}</div>
                <div className="text-xs text-muted-foreground">{delimiter.description}</div>
              </div>
            </Button>
          ))}
        </div>

        {sampleData.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium mb-2">Vorschau erste Zeile:</p>
            <div className="bg-muted/50 p-2 rounded text-xs font-mono overflow-x-auto">
              {sampleData.slice(0, 8).map((cell, index) => (
                <span key={index} className="mr-2 px-1 bg-background rounded">
                  {cell || '(leer)'}
                  {index < Math.min(sampleData.length - 1, 7) && <span className="text-muted-foreground ml-1">|</span>}
                </span>
              ))}
              {sampleData.length > 8 && (
                <span className="text-muted-foreground">... +{sampleData.length - 8} weitere</span>
              )}
            </div>
          </div>
        )}

        <Button 
          onClick={onReprocess}
          size="sm"
          className="w-full"
          disabled={selectedDelimiter === detectedDelimiter}
        >
          Mit ausgewähltem Trennzeichen neu laden
        </Button>
      </CardContent>
    </Card>
  );
};

export default DelimiterSelector;