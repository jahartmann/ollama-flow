import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Upload, FileText } from 'lucide-react';
import { CSVTemplate } from '@/lib/transformationEngine';

interface TemplateUploadProps {
  onTemplateCreate: (template: CSVTemplate) => void;
  onClose: () => void;
}

interface CustomColumn {
  id: string;
  name: string;
  type: 'string' | 'number' | 'email' | 'date' | 'boolean';
  required: boolean;
  formula?: string;
}

const TemplateUpload: React.FC<TemplateUploadProps> = ({ onTemplateCreate, onClose }) => {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [columns, setColumns] = useState<CustomColumn[]>([
    { id: '1', name: '', type: 'string', required: false }
  ]);

  const addColumn = () => {
    const newColumn: CustomColumn = {
      id: Date.now().toString(),
      name: '',
      type: 'string',
      required: false
    };
    setColumns(prev => [...prev, newColumn]);
  };

  const updateColumn = (id: string, field: keyof CustomColumn, value: any) => {
    setColumns(prev => prev.map(col => 
      col.id === id ? { ...col, [field]: value } : col
    ));
  };

  const removeColumn = (id: string) => {
    setColumns(prev => prev.filter(col => col.id !== id));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('=== TEMPLATE FILE UPLOAD ===');
    console.log('File:', file.name);

    try {
      const text = await file.text();
      console.log('File content (first 200 chars):', text.substring(0, 200));
      
      // Detect delimiter in file content
      const hasSemicolon = text.includes(';');
      const hasComma = text.includes(',');
      const delimiter = hasSemicolon ? ';' : hasComma ? ',' : ';';
      
      console.log('Detected delimiter for template:', delimiter);
      
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
      
      console.log('Extracted headers:', headers);
      console.log('Headers count:', headers.length);
      
      const newColumns: CustomColumn[] = headers.map((header, index) => ({
        id: (index + 1).toString(),
        name: header,
        type: 'string',
        required: false
      }));
      
      console.log('Created columns:', newColumns);
      
      setColumns(newColumns);
      setTemplateName(file.name.replace('.csv', ''));
      setTemplateDescription(`Importiert aus ${file.name}`);
      
      console.log('=== END TEMPLATE FILE UPLOAD ===');
    } catch (error) {
      console.error('Template upload error:', error);
    }
  };

  const handleCreate = () => {
    if (!templateName.trim() || columns.length === 0 || columns.some(col => !col.name.trim())) {
      return;
    }

    const template: CSVTemplate = {
      id: `custom_${Date.now()}`,
      name: templateName,
      description: templateDescription,
      columns: columns.map(col => ({
        name: col.name,
        type: col.type,
        required: col.required,
        formula: col.formula
      }))
    };

    onTemplateCreate(template);
  };

  const isValid = templateName.trim() && columns.length > 0 && columns.every(col => col.name.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Neues Template erstellen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Info */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Template Name</label>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="z.B. Kundenliste, Produktkatalog..."
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Beschreibung (optional)</label>
            <Input
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Kurze Beschreibung des Templates..."
            />
          </div>
        </div>

        {/* Template Upload */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
          <div className="text-center space-y-2">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Template aus CSV-Datei importieren (optional)
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="template-upload"
            />
            <Button variant="outline" size="sm" onClick={() => document.getElementById('template-upload')?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              CSV hochladen
            </Button>
          </div>
        </div>

        {/* Columns */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Spalten definieren</h3>
            <Button onClick={addColumn} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Spalte hinzufügen
            </Button>
          </div>

          <div className="space-y-3">
            {columns.map((column, index) => (
              <Card key={column.id} className="p-4">
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-4">
                    <label className="text-xs text-muted-foreground">Spaltenname</label>
                    <Input
                      value={column.name}
                      onChange={(e) => updateColumn(column.id, 'name', e.target.value)}
                      placeholder="Spaltenname..."
                      className="h-8"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Typ</label>
                    <Select
                      value={column.type}
                      onValueChange={(value) => updateColumn(column.id, 'type', value)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        <SelectItem value="string">Text</SelectItem>
                        <SelectItem value="number">Zahl</SelectItem>
                        <SelectItem value="email">E-Mail</SelectItem>
                        <SelectItem value="date">Datum</SelectItem>
                        <SelectItem value="boolean">Ja/Nein</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-4">
                    <label className="text-xs text-muted-foreground">Formel (optional)</label>
                    <Input
                      value={column.formula || ''}
                      onChange={(e) => updateColumn(column.id, 'formula', e.target.value)}
                      placeholder="z.B. CONCAT(Vorname, ' ', Nachname)"
                      className="h-8"
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={column.required}
                      onChange={(e) => updateColumn(column.id, 'required', e.target.checked)}
                      className="rounded"
                    />
                    <label className="text-xs ml-1">Req.</label>
                  </div>

                  <div className="col-span-1">
                    {columns.length > 1 && (
                      <Button
                        onClick={() => removeColumn(column.id)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          
          <Button onClick={handleCreate} disabled={!isValid}>
            Template erstellen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TemplateUpload;