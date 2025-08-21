import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { UploadCloud, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFileUpload?: (files: File[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFileUpload?.(acceptedFiles);
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: true
  });

  return (
    <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
      <CardContent className="p-8">
        <div
          {...getRootProps()}
          className={`text-center cursor-pointer ${
            isDragActive ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4">
            <div className={`p-4 rounded-full ${
              isDragActive ? 'bg-primary/10' : 'bg-muted'
            }`}>
              {isDragActive ? (
                <UploadCloud className="h-8 w-8 text-primary" />
              ) : (
                <FileText className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive ? 'Dateien hier ablegen...' : 'CSV-Dateien hochladen'}
              </p>
              <p className="text-sm text-muted-foreground">
                Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen
              </p>
              <Button variant="outline" size="sm">
                Dateien auswählen
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUpload;