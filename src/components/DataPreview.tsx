import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileText,
  BarChart3,
  Download,
  Zap,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react';
import { fileProcessor, type CSVParseResult, type ParseOptions } from '@/lib/fileProcessor';
import { templateEngine, type DataTemplate, type CSVData } from '@/lib/templateEngine';
import { useToast } from '@/hooks/use-toast';

const DataPreview = () => {
  const [csvData, setCsvData] = useState<CSVParseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parseOptions, setParseOptions] = useState<ParseOptions>({
    delimiter: '',
    hasHeaders: true,
    skipEmptyLines: true
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [templateParameters, setTemplateParameters] = useState<Record<string, string>>({});
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    
    try {
      // Auto-detect delimiter if not specified
      if (!parseOptions.delimiter) {
        const detectedDelimiter = await fileProcessor.detectDelimiter(file);
        setParseOptions(prev => ({ ...prev, delimiter: detectedDelimiter }));
      }

      const result = await fileProcessor.parseCSV(file, parseOptions);
      setCsvData(result);
      
      toast({
        title: "CSV erfolgreich geladen",
        description: `${result.rowCount} Zeilen und ${result.columnCount} Spalten importiert`,
      });

      if (result.errors.length > 0) {
        toast({
          title: "Warnungen beim Import",
          description: result.errors.slice(0, 3).join(', '),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('CSV import error:', error);
      toast({
        title: "Import-Fehler",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [parseOptions, toast]);

  const applyTemplate = useCallback(async () => {
    if (!csvData || !selectedTemplate || !selectedColumn) return;

    setIsApplyingTemplate(true);
    
    try {
      const csvDataForTemplate: CSVData = {
        headers: csvData.headers,
        rows: csvData.data,
        filename: csvData.filename
      };

      const result = templateEngine.applyTemplate(
        csvDataForTemplate,
        selectedTemplate,
        selectedColumn,
        templateParameters
      );

      if (result.success) {
        setCsvData(prev => prev ? {
          ...prev,
          data: result.data
        } : null);
        
        toast({
          title: "Vorlage angewendet",
          description: result.message
        });
      } else {
        toast({
          title: "Fehler beim Anwenden der Vorlage",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Template application error:', error);
      toast({
        title: "Unerwarteter Fehler",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    } finally {
      setIsApplyingTemplate(false);
    }
  }, [csvData, selectedTemplate, selectedColumn, templateParameters, toast]);

  const exportData = useCallback((format: 'csv' | 'json') => {
    if (!csvData) return;

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${csvData.filename.replace('.csv', '')}_processed_${timestamp}`;

    if (format === 'csv') {
      fileProcessor.exportAsCSV(csvData.data, csvData.headers, `${filename}.csv`);
    } else {
      // Export as JSON
      const jsonData = csvData.data.map(row => {
        const obj: Record<string, string> = {};
        csvData.headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { 
        type: 'application/json;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast({
      title: "Export erfolgreich",
      description: `Datei als ${format.toUpperCase()} exportiert`
    });
  }, [csvData, toast]);

  const templates = templateEngine.getTemplates();
  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
  const statistics = csvData ? fileProcessor.getDataStatistics(csvData.data, csvData.headers) : null;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-data bg-clip-text text-transparent">
          Daten-Vorschau & Bearbeitung
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Importieren Sie CSV-Dateien und wenden Sie einfache Vorlagen wie Excel-Formeln an
        </p>
      </div>

      {/* File Upload */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            CSV-Datei importieren
          </CardTitle>
          <CardDescription>
            Laden Sie eine CSV-Datei hoch und konfigurieren Sie die Import-Optionen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Trennzeichen</Label>
              <Select 
                value={parseOptions.delimiter} 
                onValueChange={(value) => setParseOptions(prev => ({...prev, delimiter: value}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border shadow-lg z-50">
                  <SelectItem value="">Auto-detect</SelectItem>
                  <SelectItem value=",">Komma (,)</SelectItem>
                  <SelectItem value=";">Semikolon (;)</SelectItem>
                  <SelectItem value="\t">Tab (\t)</SelectItem>
                  <SelectItem value="|">Pipe (|)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="hasHeaders"
                checked={parseOptions.hasHeaders}
                onChange={(e) => setParseOptions(prev => ({...prev, hasHeaders: e.target.checked}))}
              />
              <Label htmlFor="hasHeaders">Erste Zeile als Überschrift</Label>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="skipEmpty"
                checked={parseOptions.skipEmptyLines}
                onChange={(e) => setParseOptions(prev => ({...prev, skipEmptyLines: e.target.checked}))}
              />
              <Label htmlFor="skipEmpty">Leere Zeilen überspringen</Label>
            </div>
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv,.tsv"
              onChange={handleFileUpload}
              disabled={isLoading}
              className="hidden"
              id="csv-upload"
            />
            <Label htmlFor="csv-upload" className="cursor-pointer">
              <div className="space-y-2">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">
                  {isLoading ? 'Datei wird verarbeitet...' : 'CSV-Datei hier ablegen oder klicken'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Unterstützte Formate: .csv, .tsv (max. 50MB)
                </p>
              </div>
            </Label>
          </div>
        </CardContent>
      </Card>

      {csvData && (
        <Tabs defaultValue="preview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Vorschau
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Vorlagen
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Statistiken
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* Data Preview */}
          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <CardTitle>Daten-Vorschau</CardTitle>
                <CardDescription>
                  {csvData.rowCount} Zeilen, {csvData.columnCount} Spalten
                  {csvData.errors.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {csvData.errors.length} Fehler
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-96 border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {csvData.headers.map((header, index) => (
                          <th key={index} className="p-2 text-left font-medium border-r">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.data.slice(0, 50).map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b hover:bg-muted/50">
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="p-2 border-r">
                              {cell || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvData.data.length > 50 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Zeige erste 50 von {csvData.rowCount} Zeilen
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vorlage auswählen</CardTitle>
                  <CardDescription>
                    Wählen Sie eine Vorlage und Spalte für die Transformation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Vorlage</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vorlage auswählen" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border shadow-lg z-50">
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{template.category}</Badge>
                              {template.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Zielspalte</Label>
                    <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                      <SelectTrigger>
                        <SelectValue placeholder="Spalte auswählen" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border shadow-lg z-50">
                        {csvData.headers.map((header) => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplateData?.parameters?.map((param) => (
                    <div key={param}>
                      <Label>{param}</Label>
                      <Input
                        value={templateParameters[param] || ''}
                        onChange={(e) => setTemplateParameters(prev => ({
                          ...prev,
                          [param]: e.target.value
                        }))}
                        placeholder={`${param} eingeben`}
                      />
                    </div>
                  ))}

                  <Button 
                    onClick={applyTemplate} 
                    disabled={!selectedTemplate || !selectedColumn || isApplyingTemplate}
                    className="w-full"
                  >
                    {isApplyingTemplate ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Wird angewendet...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Vorlage anwenden
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vorlage-Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTemplateData ? (
                    <div className="space-y-4">
                      <div>
                        <Badge>{selectedTemplateData.category}</Badge>
                        <h3 className="font-medium mt-2">{selectedTemplateData.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedTemplateData.description}</p>
                      </div>
                      
                      <div>
                        <Label>Formel</Label>
                        <code className="block p-2 bg-muted rounded text-sm mt-1">
                          {selectedTemplateData.formula}
                        </code>
                      </div>

                      <div>
                        <Label>Beispiel</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedTemplateData.example}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Wählen Sie eine Vorlage aus</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Statistics */}
          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>Daten-Statistiken</CardTitle>
              </CardHeader>
              <CardContent>
                {statistics && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold">{statistics.totalRows}</div>
                        <div className="text-sm text-muted-foreground">Gesamtzeilen</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold">{statistics.totalColumns}</div>
                        <div className="text-sm text-muted-foreground">Spalten</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold">{statistics.emptyRows}</div>
                        <div className="text-sm text-muted-foreground">Leere Zeilen</div>
                      </div>
                      <div className="text-center p-4 border rounded">
                        <div className="text-2xl font-bold">{Math.round(csvData.rowCount / 1024 * 100) / 100}K</div>
                        <div className="text-sm text-muted-foreground">Datenpunkte</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-4">Spalten-Analyse</h3>
                      <div className="space-y-3">
                        {statistics.columnStats.map((stat, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <div className="font-medium">{stat.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {stat.nonEmptyValues} von {stat.totalValues} Werte | {stat.uniqueValues} eindeutig
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Beispiele:</div>
                              <div className="text-sm">{stat.sampleValues.slice(0, 2).join(', ')}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export */}
          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Daten exportieren</CardTitle>
                <CardDescription>
                  Exportieren Sie die bearbeiteten Daten in verschiedenen Formaten
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button onClick={() => exportData('csv')} className="h-20 flex-col gap-2">
                    <FileText className="w-6 h-6" />
                    Als CSV exportieren
                    <span className="text-xs text-muted-foreground">Kompatibel mit Excel</span>
                  </Button>
                  
                  <Button onClick={() => exportData('json')} variant="outline" className="h-20 flex-col gap-2">
                    <Settings className="w-6 h-6" />
                    Als JSON exportieren
                    <span className="text-xs text-muted-foreground">Für APIs und Entwicklung</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default DataPreview;