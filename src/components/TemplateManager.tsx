import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Plus,
  FileText,
  Upload,
  Trash2,
  Copy,
  Download
} from 'lucide-react';
import { 
  transformationEngine, 
  type CSVTemplate, 
  type CSVFile 
} from '@/lib/transformationEngine';
import { fileProcessor } from '@/lib/fileProcessor';
import { useToast } from '@/hooks/use-toast';

interface TemplateManagerProps {
  onTemplateSelect?: (template: CSVTemplate) => void;
  onClose?: () => void;
  onTemplateUpdate?: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ 
  onTemplateSelect, 
  onClose, 
  onTemplateUpdate 
}) => {
  const [templates, setTemplates] = useState<CSVTemplate[]>(transformationEngine.getTemplates());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', headers: '' });
  const { toast } = useToast();

  const refreshTemplates = useCallback(() => {
    setTemplates(transformationEngine.getTemplates());
  }, []);

  // Create template manually
  const handleCreateTemplate = useCallback(() => {
    if (!newTemplate.name.trim() || !newTemplate.headers.trim()) {
      toast({
        title: "Fehler",
        description: "Name und Spalten sind erforderlich",
        variant: "destructive"
      });
      return;
    }

    const headers = newTemplate.headers
      .split(',')
      .map(h => h.trim())
      .filter(h => h.length > 0);

    if (headers.length === 0) {
      toast({
        title: "Fehler", 
        description: "Mindestens eine Spalte ist erforderlich",
        variant: "destructive"
      });
      return;
    }

    try {
      const template = transformationEngine.saveTemplate({
        name: newTemplate.name,
        description: newTemplate.description,
        columns: headers.map(header => ({
          name: header,
          type: 'string' as const,
          required: false
        }))
      });

      refreshTemplates();
      setIsCreateDialogOpen(false);
      setNewTemplate({ name: '', description: '', headers: '' });

      toast({
        title: "Template erstellt",
        description: `"${template.name}" wurde erfolgreich erstellt`
      });

      if (onTemplateSelect) {
        onTemplateSelect(template);
      }
      
      onTemplateUpdate?.();
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    }
  }, [newTemplate, toast, refreshTemplates, onTemplateSelect]);

  // Import template from CSV
  const handleImportTemplate = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await fileProcessor.parseCSV(file, {
        delimiter: '',
        hasHeaders: true,
        skipEmptyLines: true
      });

      const csvFile: CSVFile = {
        id: 'import',
        name: file.name,
        headers: result.headers,
        data: result.data,
        rowCount: result.data.length,
        delimiter: ','
      };

      const templateName = file.name.replace(/\.[^/.]+$/, '') + '_template';
      
      // Create template manually since createTemplateFromCSV doesn't exist
      const savedTemplate = transformationEngine.saveTemplate({
        name: templateName,
        description: `Importiert aus ${file.name}`,
        columns: result.headers.map(header => ({ name: header, type: 'string' }))
      });

      refreshTemplates();
      setIsImportDialogOpen(false);

      toast({
        title: "Template importiert",
        description: `"${savedTemplate.name}" wurde aus der CSV-Datei erstellt`
      });

      if (onTemplateSelect) {
        onTemplateSelect(savedTemplate);
      }
      
      onTemplateUpdate?.();
    } catch (error) {
      toast({
        title: "Import-Fehler",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    }
  }, [toast, refreshTemplates, onTemplateSelect]);

  const handleDeleteTemplate = useCallback((templateId: string) => {
    if (transformationEngine.deleteTemplate(templateId)) {
      refreshTemplates();
      toast({
        title: "Template gelöscht",
        description: "Das Template wurde erfolgreich entfernt"
      });
    }
  }, [toast, refreshTemplates]);

  const handleDuplicateTemplate = useCallback((template: CSVTemplate) => {
    try {
      const duplicatedTemplate = transformationEngine.saveTemplate({
        name: `${template.name} (Kopie)`,
        description: template.description,
        columns: template.columns.map(col => ({ ...col }))
      });

      refreshTemplates();
      toast({
        title: "Template dupliziert",
        description: `"${duplicatedTemplate.name}" wurde erstellt`
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    }
  }, [toast, refreshTemplates]);

  const handleExportTemplate = useCallback((template: CSVTemplate) => {
    const csvContent = template.columns.map(col => col.name).join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${template.name}_template.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Template exportiert",
      description: `"${template.name}" wurde als CSV exportiert`
    });
  }, [toast]);

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          CSV Templates ({templates.length})
          <div className="flex gap-2">
            {onClose && (
              <Button size="sm" variant="outline" onClick={onClose}>
                Zurück
              </Button>
            )}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Erstellen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neues Template erstellen</DialogTitle>
                  <DialogDescription>
                    Definieren Sie die Struktur Ihrer Ziel-CSV manuell
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Template-Name</Label>
                    <Input
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="z.B. Relution Import Format"
                    />
                  </div>
                  <div>
                    <Label>Beschreibung (optional)</Label>
                    <Textarea
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Beschreibung des Templates..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Spalten (kommagetrennt)</Label>
                    <Textarea
                      value={newTemplate.headers}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, headers: e.target.value }))}
                      placeholder="surname,firstName,email,password,teacherOfClasses,studentOfClasses"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Geben Sie die Spaltennamen getrennt durch Kommas ein
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Abbrechen
                    </Button>
                    <Button onClick={handleCreateTemplate}>
                      Template erstellen
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Importieren
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Template aus CSV importieren</DialogTitle>
                  <DialogDescription>
                    Importieren Sie ein Template aus einer bestehenden CSV-Datei
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".csv,.tsv"
                      onChange={handleImportTemplate}
                      className="hidden"
                      id="template-import"
                    />
                    <Label htmlFor="template-import" className="cursor-pointer">
                      <div className="space-y-2">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                        <p className="text-lg font-medium">CSV-Template hochladen</p>
                        <p className="text-sm text-muted-foreground">
                          Die Spaltenüberschriften werden als Template-Struktur verwendet
                        </p>
                      </div>
                    </Label>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
        <CardDescription>
          Definieren Sie wiederverwendbare CSV-Strukturen für Ihre Transformationen
        </CardDescription>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Noch keine Templates erstellt</p>
            <p className="text-sm mt-1">Erstellen Sie Templates für wiederverwendbare CSV-Strukturen</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div key={template.id} className="p-4 border rounded space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.columns.slice(0, 6).map((column, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {column.name}
                        </Badge>
                      ))}
                      {template.columns.length > 6 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.columns.length - 6} weitere
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTemplateSelect?.(template)}
                      title="Template verwenden"
                    >
                      Verwenden
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDuplicateTemplate(template)}
                      title="Duplizieren"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleExportTemplate(template)}
                      title="Als CSV exportieren"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteTemplate(template.id)}
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {template.columns.length} Spalten
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TemplateManager;