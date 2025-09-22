import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, GitCompare, LayoutTemplate, Eye, ArrowRight } from 'lucide-react';
import { CSVFile, CSVTemplate, TemplateColumnMapping, transformationEngine } from '@/lib/transformationEngine';
import { fileProcessor } from '@/lib/fileProcessor';
import { WizardCacheManager } from '@/lib/wizardCache';
import ProgressIndicator, { Step } from './ProgressIndicator';
import UploadStep from './steps/UploadStep';
import OperationSelectionStep from './steps/OperationSelectionStep';
import ProcessStep from './steps/ProcessStep';
import ComparisonStep from './steps/ComparisonStep';
import TemplateMappingStep from './steps/TemplateMappingStep';
import PreviewStep from './steps/PreviewStep';

interface CSVWizardProps {
  onComplete?: (data: CSVFile) => void;
}

const CSVWizard: React.FC<CSVWizardProps> = ({ onComplete }) => {
  // State management with cache restoration
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [files, setFiles] = useState<CSVFile[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<'transform' | 'compare' | null>(null);
  const [processedData, setProcessedData] = useState<CSVFile | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CSVTemplate | null>(null);
  const [columnMappings, setColumnMappings] = useState<TemplateColumnMapping[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<any[]>([]);
  const { toast } = useToast();

  // Load cached state on component mount
  useEffect(() => {
    const cachedState = WizardCacheManager.loadState();
    if (cachedState) {
      setCurrentStep(cachedState.currentStep || 0);
      setFiles(cachedState.files || []);
      setSelectedOperation(cachedState.selectedOperation as 'transform' | 'compare' | null);
      setProcessedData(cachedState.processedData || null);
      setSelectedTemplate(cachedState.selectedTemplate || null);
      setColumnMappings(cachedState.columnMappings || []);
      setAppliedFilters(cachedState.appliedFilters || []);
      
      if (cachedState.files && cachedState.files.length > 0) {
        toast({
          title: "Session wiederhergestellt",
          description: "Ihre vorherigen Daten wurden wiederhergestellt"
        });
      }
    }
  }, [toast]);

  // Save state to cache whenever critical state changes
  useEffect(() => {
    WizardCacheManager.saveState({
      currentStep,
      files,
      selectedOperation,
      processedData,
      selectedTemplate,
      columnMappings,
      appliedFilters
    });
  }, [currentStep, files, selectedOperation, processedData, selectedTemplate, columnMappings, appliedFilters]);

  // Define wizard steps - dynamic based on operation
  const getSteps = (): Step[] => {
    const baseSteps = [
      {
        id: 'upload',
        title: 'Dateien hochladen',
        description: 'CSV-Dateien auswählen und hochladen',
        icon: <Upload className="w-4 h-4" />
      },
      {
        id: 'operation',
        title: 'Operation wählen',
        description: 'Zwischen Bearbeitung und Vergleich wählen',
        icon: <ArrowRight className="w-4 h-4" />
      }
    ];

    if (selectedOperation === 'transform') {
      return [
        ...baseSteps,
        {
          id: 'process',
          title: 'Verarbeitung',
          description: 'Daten verarbeiten und transformieren',
          icon: <GitCompare className="w-4 h-4" />
        },
        {
          id: 'mapping',
          title: 'Template & Mapping',
          description: 'Felder zuordnen und Live-Vorschau',
          icon: <LayoutTemplate className="w-4 h-4" />
        },
        {
          id: 'preview',
          title: 'Vorschau & Export',
          description: 'Ergebnis prüfen und exportieren',
          icon: <Eye className="w-4 h-4" />
        }
      ];
    } else if (selectedOperation === 'compare') {
      return [
        ...baseSteps,
        {
          id: 'compare',
          title: 'Vergleichen',
          description: 'Unterschiede zwischen Dateien analysieren',
          icon: <GitCompare className="w-4 h-4" />
        }
      ];
    }

    return baseSteps;
  };

  const steps = getSteps();

  // File upload handler with automatic delimiter detection
  const handleFileUpload = useCallback(async (uploadedFiles: File[]) => {
    console.log('Files uploaded:', uploadedFiles);
    const processedFiles: CSVFile[] = [];
    
    for (const file of uploadedFiles) {
      try {
        console.log(`Processing file: ${file.name}`);
        
        // Auto-detect delimiter
        const detectedDelimiter = await fileProcessor.detectDelimiter(file);
        console.log(`Detected delimiter for ${file.name}:`, detectedDelimiter);
        
        // Process with detected delimiter
        const csvFile = await fileProcessor.processFile(file, detectedDelimiter);
        console.log('Processed CSV file:', csvFile);
        
        // If only 1 column detected with semicolon data, try comma
        if (csvFile.headers.length === 1 && csvFile.headers[0].includes(';')) {
          console.log('Detected semicolon in single column, reprocessing with semicolon delimiter');
          const reprocessedFile = await fileProcessor.processFile(file, ';');
          processedFiles.push(reprocessedFile);
        } else if (csvFile.headers.length === 1 && csvFile.headers[0].includes(',')) {
          console.log('Detected comma in single column, reprocessing with comma delimiter');
          const reprocessedFile = await fileProcessor.processFile(file, ',');
          processedFiles.push(reprocessedFile);
        } else {
          processedFiles.push(csvFile);
        }
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
  }, [toast, setFiles]);

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
          
        case 'ai_transform':
          // AI transformation - use the transformedData from the AI if available
          result = {
            ...files[0],
            id: `ai_transformed_${files[0].id}`,
            name: `ai_transformed_${files[0].name}`,
            data: options.transformedData || files[0].data // Use AI result or fallback to original
          };
          
          // Store AI analysis for later reference
          toast({
            title: "KI-Transformation angewendet",
            description: "Die KI-Analyse wurde erfolgreich auf Ihre Daten angewendet"
          });
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

  // Operation selection handler
  const handleOperationSelect = useCallback((operation: 'transform' | 'compare') => {
    setSelectedOperation(operation);
    // Reset step to continue with selected operation
    setCurrentStep(2);
    toast({
      title: "Operation ausgewählt",
      description: `${operation === 'transform' ? 'Transformation' : 'Vergleich'} wurde ausgewählt`
    });
  }, [toast]);

  // Template selection handler
  const handleTemplateSelect = useCallback((template: CSVTemplate) => {
    setSelectedTemplate(template);
    toast({
      title: "Template ausgewählt",
      description: `Template "${template.name}" wurde ausgewählt`
    });
  }, [toast]);

  // Mapping completion handler
  const handleMappingComplete = useCallback((mappings: TemplateColumnMapping[], filters: any[]) => {
    console.log('CSVWizard handleMappingComplete called:', { mappings, filters });
    setColumnMappings(mappings);
    setAppliedFilters(filters);
    
    // Save to cache
    WizardCacheManager.saveState({
      columnMappings: mappings,
      appliedFilters: filters
    });
    
    toast({
      title: "Mapping abgeschlossen",
      description: "Feldmappings und Filter wurden konfiguriert"
    });
  }, [toast]);

  // Enhanced export handler with proper formula processing
  const handleExport = useCallback((filename?: string) => {
    const dataToExport = processedData || (files.length > 0 ? files[0] : null);
    if (!dataToExport) return;

    // Apply template format if available
    let finalData = dataToExport.data;
    let finalHeaders = dataToExport.headers;

    // If we have a template and mappings, transform the data using enhanced formula processing
    if (selectedTemplate && columnMappings.length > 0) {
      finalHeaders = columnMappings.map(mapping => mapping.templateColumn);
      finalData = dataToExport.data.map(row => {
        return columnMappings.map(mapping => {
          let value = '';
          
          // Priority 1: Check if there's a formula
          if (mapping.formula && mapping.formula.trim()) {
            value = evaluateFormula(mapping.formula, row, dataToExport.headers);
          }
          // Priority 2: Use source column mapping
          else if (mapping.sourceColumn) {
            const sourceIndex = dataToExport.headers.indexOf(mapping.sourceColumn);
            if (sourceIndex !== -1) {
              value = row[sourceIndex] || '';
              
              // Apply transformations
              switch (mapping.transformation) {
                case 'uppercase':
                  value = value.toUpperCase();
                  break;
                case 'lowercase':
                  value = value.toLowerCase();
                  break;
                case 'trim':
                  value = value.trim();
                  break;
                case 'format_phone':
                  value = value.replace(/\D/g, '').replace(/(\d{4})(\d{3})(\d{4})/, '+49 $1 $2 $3');
                  break;
              }
            }
          }
          // Priority 3: Use default value
          else {
            value = mapping.defaultValue || '';
          }
          
          return value;
        });
      });
    }

    try {
      const exportName = filename ? `${filename}.csv` : `processed_${dataToExport.name}`;
      fileProcessor.exportAsCSV(finalData, finalHeaders, exportName);
      toast({
        title: "Export erfolgreich",
        description: `CSV-Datei "${exportName}" wurde heruntergeladen`
      });
    } catch (error) {
      toast({
        title: "Export-Fehler",
        description: error instanceof Error ? error.message : 'Export fehlgeschlagen',
        variant: "destructive"
      });
    }
  }, [processedData, files, selectedTemplate, columnMappings, toast]);

  // Enhanced formula evaluation function
  const evaluateFormula = useCallback((formula: string, row: string[], headers: string[]): string => {
    try {
      let result = formula.trim();
      
      // Replace column references with actual values (case-insensitive)
      headers.forEach((header, index) => {
        const value = row[index] || '';
        // Replace direct column name references (for formulas like "Name@domain.de")
        const regex = new RegExp(`\\b${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        result = result.replace(regex, value);
      });
      
      return result;
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return formula; // Return original formula if evaluation fails
    }
  }, []);

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
    console.log('goToNextStep called:', { currentStep, stepsLength: steps.length });
    markStepCompleted(currentStep);
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      console.log('Moving to step:', nextStep);
      setCurrentStep(nextStep);
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
      description: selectedOperation === 'compare' ? "Vergleich erfolgreich beendet" : "CSV-Transformation erfolgreich beendet"
    });
    
    // Reset wizard and clear cache
    setCurrentStep(0);
    setCompletedSteps([]);
    setFiles([]);
    setSelectedOperation(null);
    setProcessedData(null);
    setSelectedTemplate(null);
    setColumnMappings([]);
    setAppliedFilters([]);
    WizardCacheManager.clearCache();
  }, [processedData, files, onComplete, selectedOperation, toast]);

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Modern Header */}
        <div className="text-center space-y-4">
          <div className="relative">
            <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              CSV Wizard
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Transformieren Sie Ihre Daten mit Leichtigkeit
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
          {/* Modern Progress Sidebar */}
          <div className="xl:col-span-1">
            <div className="glass-card sticky top-8 p-6">
              <ProgressIndicator
                steps={steps}
                currentStep={currentStep}
                completedSteps={completedSteps}
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="xl:col-span-4">
            <div className="data-card p-8 min-h-[600px]">
              
              {/* Debug Info */}
              <div className="mb-4 p-3 bg-muted/20 rounded text-xs text-muted-foreground">
                Debug: Step {currentStep} / {steps.length - 1} | Operation: {selectedOperation} | Files: {files.length} | 
                ProcessedData: {processedData ? 'Yes' : 'No'} | Template: {selectedTemplate ? selectedTemplate.name : 'None'} | 
                Mappings: {columnMappings.length}
              </div>
              
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
            <OperationSelectionStep
              files={files}
              onOperationSelect={handleOperationSelect}
              onBack={goToPreviousStep}
            />
          )}

          {/* Transform workflow */}
          {selectedOperation === 'transform' && (
            <>
              {currentStep === 2 && (
                <ProcessStep
                  files={files}
                  onProcess={handleProcess}
                  onNext={goToNextStep}
                  onBack={goToPreviousStep}
                />
              )}

              {currentStep === 3 && (
                <TemplateMappingStep
                  files={files}
                  processedData={processedData}
                  selectedTemplate={selectedTemplate}
                  onTemplateSelect={handleTemplateSelect}
                  onMappingComplete={handleMappingComplete}
                  onNext={goToNextStep}
                  onBack={goToPreviousStep}
                />
              )}

              {currentStep === 4 && (
                <PreviewStep
                  originalFiles={files}
                  processedData={processedData}
                  selectedTemplate={selectedTemplate}
                  columnMappings={columnMappings}
                  onExport={handleExport}
                  onBack={goToPreviousStep}
                  onFinish={handleFinish}
                />
              )}
            </>
          )}

          {/* Compare workflow */}
          {selectedOperation === 'compare' && currentStep === 2 && (
            <ComparisonStep
              files={files}
              onBack={goToPreviousStep}
              onFinish={handleFinish}
            />
          )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVWizard;