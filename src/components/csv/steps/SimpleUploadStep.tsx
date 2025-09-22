import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface SimpleUploadStepProps {
  onFileUpload: (files: File[]) => void;
}

const SimpleUploadStep: React.FC<SimpleUploadStepProps> = ({ onFileUpload }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFiles = acceptedFiles.filter(file => 
      file.type === 'text/csv' || 
      file.name.toLowerCase().endsWith('.csv') ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.toLowerCase().endsWith('.xlsx')
    );
    
    if (csvFiles.length > 0) {
      onFileUpload(csvFiles);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xlsx', '.xls']
    },
    multiple: true,
    maxFiles: 10
  });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <Upload className="w-6 h-6 text-primary" />
          CSV-Dateien hochladen
        </CardTitle>
        <p className="text-muted-foreground">
          Ziehen Sie Ihre CSV-Dateien hierher oder klicken Sie zum Auswählen
        </p>
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
          ${isDragActive 
            ? 'border-primary bg-primary/5 scale-105' 
            : 'border-border hover:border-primary/50 hover:bg-primary/5'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          
          {isDragActive ? (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-primary">
                Dateien hier ablegen...
              </h3>
              <p className="text-muted-foreground">
                Lassen Sie die Dateien los, um sie hochzuladen
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                CSV-Dateien auswählen
              </h3>
              <p className="text-muted-foreground">
                Unterstützte Formate: .csv, .xlsx, .xls
              </p>
              <Button size="lg" className="mt-4">
                <Upload className="w-4 h-4 mr-2" />
                Dateien auswählen
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="font-medium text-blue-900">Hinweise:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Maximum 10 Dateien gleichzeitig</li>
                <li>• Dateigröße bis zu 20MB pro Datei</li>
                <li>• Delimiter werden automatisch erkannt</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleUploadStep;