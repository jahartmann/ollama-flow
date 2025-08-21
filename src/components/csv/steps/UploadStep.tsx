import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Upload, X, Eye, Settings } from 'lucide-react';
import FileUpload from '../../FileUpload';
import DataPreview from '../../DataPreview';
import DelimiterSelector from '../../DelimiterSelector';
import { CSVFile } from '@/lib/transformationEngine';
import { fileProcessor } from '@/lib/fileProcessor';

interface UploadStepProps {
  files: CSVFile[];
  onFileUpload: (files: File[]) => void;
  onRemoveFile: (fileId: string) => void;
  onPreviewFile: (file: CSVFile) => void;
  onNext: () => void;
}

const UploadStep: React.FC<UploadStepProps> = ({
  files,
  onFileUpload,
  onRemoveFile,
  onPreviewFile,
  onNext
}) => {
  const [previewFile, setPreviewFile] = useState<CSVFile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [delimiterOverrides, setDelimiterOverrides] = useState<{[fileId: string]: string}>({});
  const [processingFiles, setProcessingFiles] = useState<{[fileName: string]: File}>({});

  const handlePreviewFile = (file: CSVFile) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
    onPreviewFile(file);
  };

  const handleDelimiterChange = (fileId: string, delimiter: string) => {
    setDelimiterOverrides(prev => ({
      ...prev,
      [fileId]: delimiter
    }));
  };

  const handleReprocessFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    const originalFile = processingFiles[file?.name || ''];
    
    if (!file || !originalFile) return;

    try {
      const newDelimiter = delimiterOverrides[fileId];
      const reprocessedFile = await fileProcessor.processFile(originalFile, newDelimiter);
      
      // Remove old file and add reprocessed one
      onRemoveFile(fileId);
      onFileUpload([originalFile]); // This will use the new delimiter
    } catch (error) {
      console.error('Error reprocessing file:', error);
    }
  };

  const handleFileUploadWithDelimiter = async (uploadedFiles: File[]) => {
    // Store original files for reprocessing
    uploadedFiles.forEach(file => {
      setProcessingFiles(prev => ({
        ...prev,
        [file.name]: file
      }));
    });
    
    onFileUpload(uploadedFiles);
  };
  return (
    <div className="space-y-6">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            CSV-Dateien hochladen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload onFileUpload={handleFileUploadWithDelimiter} />
          
          {files.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Hochgeladene Dateien ({files.length})
                </h3>
                <Badge variant="secondary">
                  {files.reduce((total, file) => total + file.data.length, 0)} Datensätze gesamt
                </Badge>
              </div>
              
              <div className="grid gap-4">
                {files.map((file) => (
                  <div key={file.id} className="space-y-3">
                    <Card className="border-l-4 border-l-primary/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-primary" />
                            <div className="space-y-1">
                              <h4 className="font-medium">{file.name}</h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{file.data.length} Zeilen</span>
                                <span>{file.headers.length} Spalten</span>
                                {file.delimiter && (
                                  <Badge variant="outline" className="text-xs">
                                    {file.delimiter === ';' ? 'Semikolon' : 
                                     file.delimiter === ',' ? 'Komma' : 
                                     file.delimiter === '\t' ? 'Tab' : file.delimiter}
                                  </Badge>
                                )}
                                <div className="flex flex-wrap gap-1">
                                  {file.headers.slice(0, 3).map((header, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {header}
                                    </Badge>
                                  ))}
                                  {file.headers.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{file.headers.length - 3} weitere
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreviewFile(file)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Vorschau
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRemoveFile(file.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Delimiter Selector for files with potential issues */}
                    {file.headers.length <= 1 && file.delimiter && (
                      <DelimiterSelector
                        detectedDelimiter={file.delimiter}
                        selectedDelimiter={delimiterOverrides[file.id] || file.delimiter}
                        onDelimiterChange={(delimiter) => handleDelimiterChange(file.id, delimiter)}
                        onReprocess={() => handleReprocessFile(file.id)}
                        fileName={file.name}
                        sampleData={file.headers}
                      />
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <Button 
                  onClick={onNext}
                  disabled={files.length === 0}
                  className="px-8"
                >
                  Weiter zur Verarbeitung
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <DataPreview 
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
};

export default UploadStep;