import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutTemplate } from 'lucide-react';
import RecipeList from '../../RecipeList';
import { CSVFile, CSVTemplate } from '@/lib/transformationEngine';

interface TemplateStepProps {
  files: CSVFile[];
  selectedTemplate: CSVTemplate | null;
  onTemplateSelect: (template: CSVTemplate) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const TemplateStep: React.FC<TemplateStepProps> = ({
  files,
  selectedTemplate,
  onTemplateSelect,
  onNext,
  onBack,
  onSkip
}) => {
  return (
    <div className="space-y-6">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            Template auswählen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Wählen Sie ein Template aus, um Ihre Daten in ein bestimmtes Format zu transformieren, 
              oder überspringen Sie diesen Schritt, um die Daten unverändert zu verwenden.
            </p>
            
            {selectedTemplate && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h3 className="font-medium text-primary mb-1">Ausgewähltes Template</h3>
                <p className="text-sm text-muted-foreground mb-2">{selectedTemplate.name}</p>
                {selectedTemplate.description && (
                  <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                )}
              </div>
            )}
          </div>
          
          <RecipeList onTemplateSelect={onTemplateSelect} />
          
          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onBack}>
              Zurück
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onSkip}>
                Überspringen
              </Button>
              <Button 
                onClick={onNext}
                disabled={!selectedTemplate}
                className="px-8"
              >
                Template konfigurieren
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TemplateStep;