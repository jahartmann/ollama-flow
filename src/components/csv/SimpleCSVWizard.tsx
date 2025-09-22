import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CSVFile } from '@/lib/transformationEngine';
import { fileProcessor } from '@/lib/fileProcessor';
import { useToast } from '@/hooks/use-toast';
import SimpleUploadStep from './steps/SimpleUploadStep';
import SimpleOperationStep from './steps/SimpleOperationStep';
import DelimiterConverter from './workflows/DelimiterConverter';
import TemplateTransformer from './workflows/TemplateTransformer';
import FileComparator from './workflows/FileComparator';

interface SimpleCSVWizardProps {
  onComplete?: (data: CSVFile) => void;
}

type WorkflowType = 'delimiter' | 'template' | 'compare' | null;

const SimpleCSVWizard: React.FC<SimpleCSVWizardProps> = ({ onComplete }) => {
  const [files, setFiles] = useState<CSVFile[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowType>(null);
  const { toast } = useToast();

  // Upload handler
  const handleFileUpload = async (uploadedFiles: File[]) => {
    const processedFiles: CSVFile[] = [];
    
    for (const file of uploadedFiles) {
      try {
        const detectedDelimiter = await fileProcessor.detectDelimiter(file);
        const csvFile = await fileProcessor.processFile(file, detectedDelimiter);
        
        // Auto-correct delimiter detection if needed
        if (csvFile.headers.length === 1 && csvFile.headers[0].includes(';')) {
          const reprocessed = await fileProcessor.processFile(file, ';');
          processedFiles.push(reprocessed);
        } else if (csvFile.headers.length === 1 && csvFile.headers[0].includes(',')) {
          const reprocessed = await fileProcessor.processFile(file, ',');
          processedFiles.push(reprocessed);
        } else {
          processedFiles.push(csvFile);
        }
      } catch (error) {
        toast({
          title: "Fehler beim Verarbeiten",
          description: `Datei "${file.name}" konnte nicht verarbeitet werden`,
          variant: "destructive"
        });
      }
    }
    
    if (processedFiles.length > 0) {
      setFiles(processedFiles);
      toast({
        title: "Dateien hochgeladen",
        description: `${processedFiles.length} Datei(en) erfolgreich verarbeitet`
      });
    }
  };

  // Workflow selection handler
  const handleWorkflowSelect = (workflow: WorkflowType) => {
    setCurrentWorkflow(workflow);
  };

  // Reset to hub
  const handleReturnToHub = () => {
    setFiles([]);
    setCurrentWorkflow(null);
  };

  // Complete handler
  const handleComplete = (data?: CSVFile) => {
    if (data && onComplete) {
      onComplete(data);
    }
    handleReturnToHub();
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            CSV Wizard
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Drei einfache Tools für Ihre CSV-Dateien
          </p>
        </div>

        {/* Main Content */}
        <Card className="glass-card">
          <CardContent className="p-8">
            {/* Step 1: Upload Files */}
            {files.length === 0 && (
              <SimpleUploadStep onFileUpload={handleFileUpload} />
            )}

            {/* Step 2: Choose Workflow */}
            {files.length > 0 && !currentWorkflow && (
              <SimpleOperationStep
                files={files}
                onWorkflowSelect={handleWorkflowSelect}
                onReturnToHub={handleReturnToHub}
              />
            )}

            {/* Step 3: Execute Workflow */}
            {files.length > 0 && currentWorkflow === 'delimiter' && (
              <DelimiterConverter
                files={files}
                onComplete={handleComplete}
                onBack={() => setCurrentWorkflow(null)}
                onReturnToHub={handleReturnToHub}
              />
            )}

            {files.length > 0 && currentWorkflow === 'template' && (
              <TemplateTransformer
                files={files}
                onComplete={handleComplete}
                onBack={() => setCurrentWorkflow(null)}
                onReturnToHub={handleReturnToHub}
              />
            )}

            {files.length > 0 && currentWorkflow === 'compare' && (
              <FileComparator
                files={files}
                onComplete={handleComplete}
                onBack={() => setCurrentWorkflow(null)}
                onReturnToHub={handleReturnToHub}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimpleCSVWizard;