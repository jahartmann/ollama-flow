import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutTemplate, Plus } from 'lucide-react';
import { CSVTemplate, transformationEngine } from '@/lib/transformationEngine';
import TemplateManager from './TemplateManager';

interface RecipeListProps {
  onTemplateSelect: (template: CSVTemplate) => void;
}

const RecipeList: React.FC<RecipeListProps> = ({ onTemplateSelect }) => {
  const [templates, setTemplates] = useState<CSVTemplate[]>([]);
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    const savedTemplates = transformationEngine.getTemplates();
    setTemplates(savedTemplates);
  };

  const handleTemplateUpdate = () => {
    loadTemplates();
    setShowTemplateManager(false);
  };

  if (showTemplateManager) {
    return (
      <TemplateManager
        onClose={() => setShowTemplateManager(false)}
        onTemplateUpdate={handleTemplateUpdate}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            CSV Templates
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateManager(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Verwalten
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Keine Templates vorhanden</p>
            <p className="text-sm mb-4">
              Erstellen Sie Ihr erstes Template um loszulegen
            </p>
            <Button
              variant="outline"
              onClick={() => setShowTemplateManager(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Template erstellen
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onTemplateSelect(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="font-medium">{template.name}</h3>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {template.columns.slice(0, 3).map((column, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {column.name}
                            </Badge>
                          ))}
                          {template.columns.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.columns.length - 3} weitere
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {template.columns.length} Spalten
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default RecipeList;