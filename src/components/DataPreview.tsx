import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload,
  Eye,
  FileText,
  AlertCircle,
  CheckCircle2,
  Settings,
  RefreshCw,
  Brain
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { fileProcessor, type ParsedFile } from '@/lib/fileProcessor';
import { ollamaAPI } from '@/lib/ollamaApi';

interface FileUpload extends ParsedFile {
  file: File;
  status: 'uploaded' | 'parsing' | 'ready' | 'error';
  errorMessage?: string;
  previewData: string[][];
}

const DataPreview = () => {
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isProcessingAi, setIsProcessingAi] = useState(false);

  const encodingOptions = [
    { value: 'utf-8', label: 'UTF-8' },
    { value: 'iso-8859-1', label: 'ISO-8859-1 (Latin-1)' },
    { value: 'windows-1252', label: 'Windows-1252' },
    { value: 'utf-16', label: 'UTF-16' }
  ];

  const delimiterOptions = [
    { value: ',', label: 'Komma (,)' },
    { value: ';', label: 'Semikolon (;)' },
    { value: '\t', label: 'Tab (\\t)' },
    { value: '|', label: 'Pipe (|)' }
  ];

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      const fileUpload: FileUpload = {
        id: Date.now().toString() + Math.random(),
        file,
        name: file.name,
        columns: [],
        data: [],
        rowCount: 0,
        size: file.size,
        encoding: 'utf-8',
        delimiter: ',',
        hasHeader: true,
        previewData: [],
        status: 'uploaded'
      };
      
      setUploadedFiles(prev => [...prev, fileUpload]);
      parseFile(fileUpload);
    });
  }, []);

  const parseFile = async (fileUpload: FileUpload) => {
    setUploadedFiles(prev => 
      prev.map(f => f.id === fileUpload.id ? { ...f, status: 'parsing' } : f)
    );

    try {
      const parsedFile = await fileProcessor.parseCSVFile(fileUpload.file, {
        encoding: fileUpload.encoding,
        delimiter: fileUpload.delimiter,
        hasHeader: fileUpload.hasHeader
      });

      const previewData = parsedFile.data.slice(0, 5); // Show first 5 rows
      
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileUpload.id ? {
          ...f,
          ...parsedFile,
          previewData,
          status: 'ready'
        } : f)
      );
      
      if (!activeFileId) {
        setActiveFileId(fileUpload.id);
      }
    } catch (error) {
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileUpload.id ? {
          ...f,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unbekannter Fehler'
        } : f)
      );
    }
  };

  const updateFileSettings = (fileId: string, updates: Partial<FileUpload>) => {
    setUploadedFiles(prev => {
      const updated = prev.map(f => f.id === fileId ? { ...f, ...updates } : f);
      const fileToReparse = updated.find(f => f.id === fileId);
      if (fileToReparse) {
        parseFile(fileToReparse);
      }
      return updated;
    });
  };

  const handleAiProcess = async () => {
    if (!aiPrompt.trim() || !activeFileId) return;
    
    const activeFile = uploadedFiles.find(f => f.id === activeFileId);
    if (!activeFile) return;

    setIsProcessingAi(true);
    
    try {
      const result = await ollamaAPI.processDataTransformation(
        [activeFile.columns, ...activeFile.previewData],
        aiPrompt
      );

      // Update the file with transformed data
      setUploadedFiles(prev => 
        prev.map(f => f.id === activeFileId ? {
          ...f,
          data: result.transformedData,
          previewData: result.transformedData.slice(0, 5)
        } : f)
      );

      // Show explanation in console for now
      console.log('AI Transformation Result:', result.explanation);
    } catch (error) {
      console.error('AI processing failed:', error);
    } finally {
      setIsProcessingAi(false);
    }
  };

  const activeFile = uploadedFiles.find(f => f.id === activeFileId);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-data bg-clip-text text-transparent">
          Datenvorschau & Import
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Importieren Sie Ihre Dateien und überprüfen Sie die Datenstruktur vor der Verarbeitung
        </p>
      </div>

      {/* File Upload */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Datei-Upload
          </CardTitle>
          <CardDescription>
            Wählen Sie eine oder mehrere CSV-Dateien für den Import aus
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-smooth">
            <input
              type="file"
              multiple
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Dateien hier ablegen oder klicken</p>
              <p className="text-sm text-muted-foreground">CSV, TXT-Dateien werden unterstützt</p>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* File Tabs */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.map((file) => (
            <Button
              key={file.id}
              variant={activeFileId === file.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFileId(file.id)}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {file.file.name}
              {file.status === 'ready' && <CheckCircle2 className="w-3 h-3 text-success" />}
              {file.status === 'parsing' && <RefreshCw className="w-3 h-3 animate-spin" />}
              {file.status === 'error' && <AlertCircle className="w-3 h-3 text-destructive" />}
            </Button>
          ))}
        </div>
      )}

      {/* Active File Configuration */}
      {activeFile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Parse-Einstellungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Zeichenkodierung</Label>
                <Select
                  value={activeFile.encoding}
                  onValueChange={(value) => updateFileSettings(activeFile.id, { encoding: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {encodingOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Trennzeichen</Label>
                <Select
                  value={activeFile.delimiter}
                  onValueChange={(value) => updateFileSettings(activeFile.id, { delimiter: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {delimiterOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has-header"
                  checked={activeFile.hasHeader}
                  onChange={(e) => updateFileSettings(activeFile.id, { hasHeader: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="has-header">Erste Zeile enthält Spaltennamen</Label>
              </div>

              <div className="pt-4">
                <Badge variant="outline" className="mb-2">
                  {activeFile.columns.length} Spalten erkannt
                </Badge>
                <div className="text-xs text-muted-foreground space-y-1">
                  {activeFile.columns.slice(0, 5).map((col, i) => (
                    <div key={i}>• {col}</div>
                  ))}
                  {activeFile.columns.length > 5 && (
                    <div>... und {activeFile.columns.length - 5} weitere</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card className="lg:col-span-2 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Datenvorschau
              </CardTitle>
              <CardDescription>
                Erste 5 Zeilen von {activeFile.file.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeFile.status === 'ready' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {activeFile.columns.map((col, i) => (
                          <th key={i} className="text-left p-2 font-medium text-muted-foreground">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeFile.previewData.map((row, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          {row.map((cell, j) => (
                            <td key={j} className="p-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeFile.status === 'error' ? (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertTitle>Parsing-Fehler</AlertTitle>
                  <AlertDescription>
                    {activeFile.errorMessage}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Datei wird verarbeitet...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI-Assisted Processing */}
      {activeFile?.status === 'ready' && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              KI-gestützte Datenbearbeitung
            </CardTitle>
            <CardDescription>
              Beschreiben Sie, welche Transformationen oder Analysen durchgeführt werden sollen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="z.B. 'Teile die Spalte Adresse in Straße, PLZ und Ort auf' oder 'Fasse Vor- und Nachname zu einem Vollnamen zusammen'"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={3}
            />
            <div className="flex gap-4">
              <Button
                onClick={handleAiProcess}
                disabled={!aiPrompt.trim() || isProcessingAi}
                className="bg-gradient-primary"
              >
                {isProcessingAi ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verarbeitung läuft...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    KI-Transformation starten
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataPreview;