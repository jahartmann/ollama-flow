import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, CheckCircle2 } from 'lucide-react';
import LivePreview from '../../LivePreview';
import { CSVFile, CSVTemplate } from '@/lib/transformationEngine';

interface PreviewStepProps {
  originalFiles: CSVFile[];
  processedData: CSVFile | null;
  selectedTemplate: CSVTemplate | null;
  onExport: () => void;
  onBack: () => void;
  onFinish: () => void;
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  originalFiles,
  processedData,
  selectedTemplate,
  onExport,
  onBack,
  onFinish
}) => {
  const finalData = processedData || (originalFiles.length > 0 ? originalFiles[0] : null);

  return (
    <div className="space-y-6">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Ergebnis-Vorschau
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Quell-Dateien</Badge>
                </div>
                <p className="text-2xl font-bold mt-2">{originalFiles.length}</p>
                <p className="text-sm text-muted-foreground">
                  {originalFiles.reduce((total, file) => total + file.data.length, 0)} Datensätze gesamt
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Ergebnis</Badge>
                </div>
                <p className="text-2xl font-bold mt-2">
                  {finalData ? finalData.data.length : 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  Zeilen, {finalData ? finalData.headers.length : 0} Spalten
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Template</Badge>
                </div>
                <p className="text-lg font-medium mt-2">
                  {selectedTemplate ? selectedTemplate.name : 'Kein Template'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate ? 'Angewendet' : 'Original-Format'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview */}
          {finalData && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Datenvorschau</h3>
              <LivePreview 
                files={[finalData]} 
                recipe={{ 
                  name: 'Verarbeitung abgeschlossen',
                  description: 'Finales Ergebnis',
                  columnMappings: [],
                  newColumns: [],
                  templateMappings: []
                }} 
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={onExport}
              className="flex-1 sm:flex-none"
              disabled={!finalData}
            >
              <Download className="w-4 h-4 mr-2" />
              CSV exportieren
            </Button>
            
            <div className="flex gap-2 flex-1 sm:flex-none">
              <Button variant="outline" onClick={onBack} className="flex-1 sm:flex-none">
                Zurück
              </Button>
              <Button onClick={onFinish} className="flex-1 sm:flex-none">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Fertig
              </Button>
            </div>
          </div>

          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Verarbeitung erfolgreich abgeschlossen!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Ihre CSV-Daten wurden erfolgreich verarbeitet und sind bereit für den Export.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PreviewStep;