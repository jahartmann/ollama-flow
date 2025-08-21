import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, Settings, LayoutTemplate, Eye } from 'lucide-react';
import { CSVFile, CSVTemplate, transformationEngine } from '@/lib/transformationEngine';
import { fileProcessor } from '@/lib/fileProcessor';
import ProgressIndicator, { Step } from './ProgressIndicator';
import UploadStep from './steps/UploadStep';
import ProcessStep from './steps/ProcessStep';
import TemplateStep from './steps/TemplateStep';
import PreviewStep from './steps/PreviewStep';

interface CSVWizardProps {
  onComplete?: (data: CSVFile) => void;
}

const CSVWizard: React.FC<CSVWizardProps> = ({ onComplete }) => {
  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [files, setFiles] = useState<CSVFile[]>([]);
  const [processedData, setProcessedData] = useState<CSVFile | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CSVTemplate | null>(null);
  const [previewFile, setPreviewFile] = useState<CSVFile | null>(null);
  const { toast } = useToast();

  // Define wizard steps
  const steps: Step[] = [
    {
      id: 'upload',
      title: 'Dateien hochladen',
      description: 'CSV-Dateien auswählen und hochladen',
      icon: <Upload className="w-4 h-4" />
    },
    {
      id: 'process',
      title: 'Verarbeitung',
      description: 'Daten verarbeiten und transformieren (optional)',
      icon: <Settings className="w-4 h-4" />
    },
    {
      id: 'template',
      title: 'Template',
      description: 'Output-Format mit Template definieren (optional)',
      icon: <LayoutTemplate className="w-4 h-4" />
    },
    {
      id: 'preview',
      title: 'Vorschau & Export',
      description: 'Ergebnis prüfen und exportieren',
      icon: <Eye className="w-4 h-4" />
    }
  ];

  // File upload handler
  const handleFileUpload = useCallback(async (uploadedFiles: File[]) => {
    console.log('Files uploaded:', uploadedFiles);
    const processedFiles: CSVFile[] = [];
    
    for (const file of uploadedFiles) {
      try {
        console.log(`Processing file: ${file.name}`);
        const csvFile = await fileProcessor.processFile(file);
        console.log('Processed CSV file:', csvFile);
        processedFiles.push(csvFile);
      } catch (error) {
        console.error('File processing error:', error);
        toast({
          title: "Fehler beim Verarbeiten",
          description: `Datei "${file.name}" konnte nicht verarbeitet werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
          variant: "destructive"
        });
      }
    }
    
    if (processedFiles.length > 0) {
      console.log('Adding processed files to state:', processedFiles);
      setFiles(prev => [...prev, ...processedFiles]);
      toast({
        title: "Dateien hochgeladen",
        description: `${processedFiles.length} Datei(en) erfolgreich verarbeitet`,
      });
    }
  }, [toast]);

  // Remove file handler
  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
    toast({
      title: "Datei entfernt",
      description: "Die Datei wurde aus der Liste entfernt"
    });
  }, [toast]);

  // File preview handler
  const handlePreviewFile = useCallback((file: CSVFile) => {
    setPreviewFile(file);
    // Could open a modal or navigate to preview
    toast({
      title: "Vorschau",
      description: `Zeige Vorschau für ${file.name}`
    });
  }, [toast]);

  // Data processing handler
  const handleProcess = useCallback((operation: string, options: any) => {
    try {
      let result: CSVFile;
      
      switch (operation) {
        case 'merge':
          if (options.method === 'append') {
            result = transformationEngine.mergeFiles(files, 'append');
          } else if (options.method === 'join') {
            result = transformationEngine.mergeFiles(files, 'join', options.joinColumn);
          } else {
            throw new Error('Unknown merge method');
          }
          break;
          
        case 'filter':
          // Apply filter to first file (could be extended to handle multiple files)
          result = {
            ...files[0],
            id: `filtered_${files[0].id}`,
            name: `filtered_${files[0].name}`,
            data: files[0].data.filter(row => {
              const columnIndex = files[0].headers.indexOf(options.column);
              if (columnIndex === -1) return true;
              
              const cellValue = row[columnIndex] || '';
              switch (options.condition) {
                case 'contains':
                  return cellValue.includes(options.value);
                case 'equals':
                  return cellValue === options.value;
                case 'starts_with':
                  return cellValue.startsWith(options.value);
                case 'not_empty':
                  return cellValue.trim() !== '';
                default:
                  return true;
              }
            })
          };
          break;
          
        default:
          result = files[0]; // No processing
      }
      
      setProcessedData(result);
      toast({
        title: "Verarbeitung abgeschlossen",
        description: `Operation "${operation}" erfolgreich ausgeführt`
      });
    } catch (error) {
      toast({
        title: "Verarbeitungsfehler",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    }
  }, [files, toast]);

  // Template selection handler
  const handleTemplateSelect = useCallback((template: CSVTemplate) => {
    setSelectedTemplate(template);
    toast({
      title: "Template ausgewählt",
      description: `Template "${template.name}" wurde ausgewählt`
    });
  }, [toast]);

  // Export handler
  const handleExport = useCallback(() => {
    const dataToExport = processedData || (files.length > 0 ? files[0] : null);
    if (!dataToExport) return;

    try {
      fileProcessor.exportAsCSV(
        dataToExport.data,
        dataToExport.headers,
        `processed_${dataToExport.name}`
      );
      toast({
        title: "Export erfolgreich",
        description: "CSV-Datei wurde heruntergeladen"
      });
    } catch (error) {
      toast({
        title: "Export-Fehler",
        description: error instanceof Error ? error.message : 'Export fehlgeschlagen',
        variant: "destructive"
      });
    }
  }, [processedData, files, toast]);

  // Navigation helpers
  const markStepCompleted = useCallback((stepIndex: number) => {
    setCompletedSteps(prev => {
      if (!prev.includes(stepIndex)) {
        return [...prev, stepIndex];
      }
      return prev;
    });
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    setCurrentStep(stepIndex);
  }, []);

  const goToNextStep = useCallback(() => {
    markStepCompleted(currentStep);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, markStepCompleted, steps.length]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleFinish = useCallback(() => {
    const finalData = processedData || (files.length > 0 ? files[0] : null);
    if (finalData && onComplete) {
      onComplete(finalData);
    }
    
    toast({
      title: "Verarbeitung abgeschlossen",
      description: "CSV-Transformation erfolgreich beendet"
    });
    
    // Reset wizard
    setCurrentStep(0);
    setCompletedSteps([]);
    setFiles([]);
    setProcessedData(null);
    setSelectedTemplate(null);
  }, [processedData, files, onComplete, toast]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          CSV Transformation Wizard
        </h1>
        <p className="text-muted-foreground">
          Verarbeiten Sie Ihre CSV-Dateien Schritt für Schritt
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Progress Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardContent className="p-6">
              <ProgressIndicator
                steps={steps}
                currentStep={currentStep}
                completedSteps={completedSteps}
              />
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {currentStep === 0 && (
            <UploadStep
              files={files}
              onFileUpload={handleFileUpload}
              onRemoveFile={handleRemoveFile}
              onPreviewFile={handlePreviewFile}
              onNext={goToNextStep}
            />
          )}

          {currentStep === 1 && (
            <ProcessStep
              files={files}
              onProcess={handleProcess}
              onNext={goToNextStep}
              onBack={goToPreviousStep}
            />
          )}

          {currentStep === 2 && (
            <TemplateStep
              files={files}
              selectedTemplate={selectedTemplate}
              onTemplateSelect={handleTemplateSelect}
              onNext={goToNextStep}
              onBack={goToPreviousStep}
              onSkip={goToNextStep}
            />
          )}

          {currentStep === 3 && (
            <PreviewStep
              originalFiles={files}
              processedData={processedData}
              selectedTemplate={selectedTemplate}
              onExport={handleExport}
              onBack={goToPreviousStep}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVWizard;