import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, BookText, ListChecks, Columns, LayoutTemplate, Save, RefreshCw } from 'lucide-react';
import FileUpload from './FileUpload';
import { CSVFile, TransformationRecipe, TemplateColumnMapping, NewColumn, ColumnMapping, CSVTemplate } from '@/lib/transformationEngine';
import { fileProcessor } from '@/lib/fileProcessor';
import LivePreview from './LivePreview';
import RecipeList from './RecipeList';
import { useToast } from "@/hooks/use-toast"

interface CSVTransformerProps {
  files?: CSVFile[];
  onTransform: (data: CSVFile) => void;
  onRecipesChange: (recipes: TransformationRecipe[]) => void;
}

const CSVTransformer: React.FC<CSVTransformerProps> = ({
  files: initialFiles = [],
  onTransform,
  onRecipesChange
}) => {
  const [files, setFiles] = useState<CSVFile[]>(initialFiles);
  const [activeTab, setActiveTab] = useState('upload');
  const [recipeName, setRecipeName] = useState('');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<CSVTemplate | null>(null);
  const [currentRecipe, setCurrentRecipe] = useState<Partial<TransformationRecipe>>({
    name: '',
    description: '',
    columnMappings: [],
    newColumns: [],
    templateMappings: []
  });
  const { toast } = useToast();

  // Handle file upload
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
      setFiles(prev => {
        const updated = [...prev, ...processedFiles];
        console.log('Updated files state:', updated);
        return updated;
      });
      toast({
        title: "Dateien hochgeladen",
        description: `${processedFiles.length} Datei(en) erfolgreich verarbeitet`,
      });
      
      // Auto-switch to upload tab to show the uploaded files
      setActiveTab('upload');
    }
  }, [toast]);

  // Generate smart mapping suggestions based on source files
  const getColumnSuggestions = (targetColumn: string): string[] => {
    if (!files.length) return [];
    
    // Get all unique column names from all source files
    const allSourceColumns = files.flatMap(file => file.headers);
    const uniqueColumns = [...new Set(allSourceColumns)];
    
    // Smart matching based on column name similarity
    const suggestions = uniqueColumns
      .map(sourceCol => ({
        column: sourceCol,
        score: calculateSimilarity(targetColumn.toLowerCase(), sourceCol.toLowerCase())
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Top 5 suggestions
      .map(item => item.column);
    
    return suggestions;
  };

  // Simple string similarity calculation
  const calculateSimilarity = (str1: string, str2: string): number => {
    // Exact match gets highest score
    if (str1 === str2) return 100;
    
    // Check if one contains the other
    if (str1.includes(str2) || str2.includes(str1)) return 80;
    
    // Check for common keywords
    const commonTerms = ['name', 'email', 'phone', 'address', 'first', 'last', 'nummer', 'strasse', 'plz', 'ort'];
    for (const term of commonTerms) {
      if (str1.includes(term) && str2.includes(term)) return 60;
    }
    
    // Basic character similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = levenshteinDistance(longer, shorter);
    return Math.max(0, ((longer.length - editDistance) / longer.length) * 40);
  };

  // Levenshtein distance for string similarity
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  const handleRecipeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecipeName(e.target.value);
    setCurrentRecipe(prev => ({ ...prev, name: e.target.value }));
  };

  const handleRecipeDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRecipeDescription(e.target.value);
    setCurrentRecipe(prev => ({ ...prev, description: e.target.value }));
  };

  const handleColumnMappingChange = (index: number, field: keyof ColumnMapping, value: string) => {
    const updatedMappings = [...(currentRecipe.columnMappings || [])];
    updatedMappings[index] = { ...updatedMappings[index], [field]: value };
    setCurrentRecipe(prev => ({ ...prev, columnMappings: updatedMappings }));
  };

  const handleNewColumnChange = (index: number, field: keyof NewColumn, value: string) => {
    const updatedColumns = [...(currentRecipe.newColumns || [])];
    updatedColumns[index] = { ...updatedColumns[index], [field]: value };
    setCurrentRecipe(prev => ({ ...prev, newColumns: updatedColumns }));
  };

  const addColumnMapping = () => {
    setCurrentRecipe(prev => ({
      ...prev,
      columnMappings: [...(prev.columnMappings || []), { sourceColumn: '', targetColumn: '' }]
    }));
  };

  const addNewColumn = () => {
    setCurrentRecipe(prev => ({
      ...prev,
      newColumns: [...(prev.newColumns || []), { name: '', type: 'fixed', value: '' }]
    }));
  };

  const removeColumnMapping = (index: number) => {
    const updatedMappings = [...(currentRecipe.columnMappings || [])];
    updatedMappings.splice(index, 1);
    setCurrentRecipe(prev => ({ ...prev, columnMappings: updatedMappings }));
  };

  const removeNewColumn = (index: number) => {
    const updatedColumns = [...(currentRecipe.newColumns || [])];
    updatedColumns.splice(index, 1);
    setCurrentRecipe(prev => ({ ...prev, newColumns: updatedColumns }));
  };

  const handleTemplateSelect = (template: CSVTemplate) => {
    setSelectedTemplate(template);
    setCurrentRecipe(prev => ({
      ...prev,
      templateId: template.id,
      templateMappings: template.headers.map(header => ({
        targetColumn: header,
        sourceType: 'column',
        sourceColumn: ''
      }))
    }));
  };

  const updateTemplateMapping = (columnName: string, field: keyof TemplateColumnMapping, value: string | object | undefined) => {
    const updatedMappings = [...(currentRecipe.templateMappings || [])];
    const mappingIndex = updatedMappings.findIndex(m => m.targetColumn === columnName);

    if (mappingIndex !== -1) {
      updatedMappings[mappingIndex] = {
        ...updatedMappings[mappingIndex],
        [field]: value
      };
      setCurrentRecipe(prev => ({ ...prev, templateMappings: updatedMappings }));
    } else {
      console.warn(`Mapping for column ${columnName} not found`);
    }
  };

  const applyRecipe = useCallback(() => {
    if (!selectedTemplate) {
      toast({
        title: "Template fehlt",
        description: "Bitte wählen Sie zuerst ein Template aus",
        variant: "destructive"
      })
      return;
    }

    // Find the file that matches the template headers
    const matchingFile = files.find(file =>
      file.headers.length === selectedTemplate.headers.length &&
      file.headers.every((header, index) => header === selectedTemplate.headers[index])
    );

    if (!matchingFile) {
      toast({
        title: "Datei-Fehler",
        description: "Keine passende Datei für das ausgewählte Template gefunden",
        variant: "destructive"
      })
      return;
    }

    onTransform(matchingFile);
  }, [selectedTemplate, files, onTransform, toast]);

  return (
    <div className="space-y-6">
      <FileUpload onFileUpload={handleFileUpload} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">
            <UploadCloud className="w-4 h-4 mr-2" />
            Hochladen
          </TabsTrigger>
          <TabsTrigger value="recipe">
            <BookText className="w-4 h-4 mr-2" />
            Rezept erstellen
          </TabsTrigger>
          <TabsTrigger value="mapping">
            <Columns className="w-4 h-4 mr-2" />
            Spalten-Mapping
          </TabsTrigger>
          <TabsTrigger value="template">
            <LayoutTemplate className="w-4 h-4 mr-2" />
            Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Dateien hochladen</CardTitle>
              <CardDescription>
                Laden Sie Ihre CSV-Dateien hoch, um die Transformation zu starten
              </CardDescription>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Keine Dateien hochgeladen. Verwenden Sie den Bereich oben zum Hochladen.
                </p>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Hochgeladene Dateien ({files.length})</h3>
                  <div className="grid gap-4">
                    {files.map((file) => (
                      <Card key={file.id} className="border border-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium">{file.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {file.data.length} Zeilen, {file.headers.length} Spalten
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {file.headers.slice(0, 5).map((header, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {header}
                                  </Badge>
                                ))}
                                {file.headers.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{file.headers.length - 5} weitere
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onTransform(file)}
                            >
                              Verarbeiten
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipe" className="space-y-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Rezept erstellen</CardTitle>
              <CardDescription>
                Definieren Sie ein neues Transformationsrezept
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="recipe-name">Rezeptname</Label>
                  <Input
                    type="text"
                    id="recipe-name"
                    value={recipeName}
                    onChange={handleRecipeNameChange}
                  />
                </div>
                <div>
                  <Label htmlFor="recipe-description">Beschreibung</Label>
                  <Textarea
                    id="recipe-description"
                    value={recipeDescription}
                    onChange={handleRecipeDescriptionChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Spalten-Mapping konfigurieren</CardTitle>
              <CardDescription>
                Ordnen Sie Quellspalten Zielspalten zu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentRecipe.columnMappings &&
                currentRecipe.columnMappings.map((mapping, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Quellspalte</Label>
                      <Input
                        type="text"
                        value={mapping.sourceColumn || ''}
                        onChange={(e) => handleColumnMappingChange(index, 'sourceColumn', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Zielspalte</Label>
                      <Input
                        type="text"
                        value={mapping.targetColumn || ''}
                        onChange={(e) => handleColumnMappingChange(index, 'targetColumn', e.target.value)}
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeColumnMapping(index)}>
                      Entfernen
                    </Button>
                  </div>
                ))}
              <Button variant="outline" onClick={addColumnMapping}>
                Mapping hinzufügen
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Neue Spalten hinzufügen</CardTitle>
              <CardDescription>
                Erstellen Sie neue Spalten mit festen Werten
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentRecipe.newColumns &&
                currentRecipe.newColumns.map((column, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Spaltenname</Label>
                      <Input
                        type="text"
                        value={column.name || ''}
                        onChange={(e) => handleNewColumnChange(index, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Typ</Label>
                      <Select
                        value={column.type || 'fixed'}
                        onValueChange={(value) => handleNewColumnChange(index, 'type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Typ wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fest</SelectItem>
                          <SelectItem value="formula">Formel</SelectItem>
                          <SelectItem value="conditional">Bedingt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Wert</Label>
                      <Input
                        type="text"
                        value={column.value || ''}
                        onChange={(e) => handleNewColumnChange(index, 'value', e.target.value)}
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeNewColumn(index)}>
                      Entfernen
                    </Button>
                  </div>
                ))}
              <Button variant="outline" onClick={addNewColumn}>
                Neue Spalte hinzufügen
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="template" className="space-y-6">
          <RecipeList onTemplateSelect={handleTemplateSelect} />

          {selectedTemplate && (
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Spalten-Mapping konfigurieren</CardTitle>
                <CardDescription>
                  Definieren Sie, wie die Daten in jede Zielspalte gemappt werden sollen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTemplate.headers.map((columnName, index) => {
                  const mapping = currentRecipe.templateMappings?.find(m => m.targetColumn === columnName);
                  const suggestions = getColumnSuggestions(columnName);
                  
                  return (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium text-base">{columnName}</Label>
                        <Badge variant="outline" className="text-xs">
                          Spalte {String.fromCharCode(65 + index)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">Mapping-Typ</Label>
                          <Select
                            value={mapping?.sourceType || 'column'}
                            onValueChange={(value: any) => updateTemplateMapping(columnName, 'sourceType', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Wählen Sie den Typ" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="column">Quell-Spalte</SelectItem>
                              <SelectItem value="formula">Formel</SelectItem>
                              <SelectItem value="fixed">Fester Wert</SelectItem>
                              <SelectItem value="conditional">Bedingt</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          {mapping?.sourceType === 'column' && (
                            <div className="space-y-2">
                              <Label className="text-sm">Quell-Spalte</Label>
                              <Select
                                value={mapping?.sourceColumn || ''}
                                onValueChange={(value) => updateTemplateMapping(columnName, 'sourceColumn', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Spalte wählen" />
                                </SelectTrigger>
                                <SelectContent>
                                  {files.flatMap(file => 
                                    file.headers.map(header => (
                                      <SelectItem key={`${file.name}-${header}`} value={header}>
                                        <div className="flex items-center justify-between w-full">
                                          <span>{header}</span>
                                          <Badge variant="outline" className="ml-2 text-xs">
                                            {file.name}
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              
                              {suggestions.length > 0 && (
                                <div className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">Vorschläge:</Label>
                                  <div className="flex flex-wrap gap-1">
                                    {suggestions.map((suggestion, idx) => (
                                      <Button
                                        key={idx}
                                        variant="outline"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => updateTemplateMapping(columnName, 'sourceColumn', suggestion)}
                                      >
                                        {suggestion}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {mapping?.sourceType === 'formula' && (
                            <div>
                              <Label className="text-sm">Formel (Excel-Syntax)</Label>
                              <Input
                                value={mapping?.formula || ''}
                                onChange={(e) => updateTemplateMapping(columnName, 'formula', e.target.value)}
                                placeholder='z.B. =A1&"@example.com" oder [vorname]&" "&[nachname]'
                                className="font-mono text-sm"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Verwenden Sie [spaltenname] oder A1-Referenzen
                              </p>
                            </div>
                          )}

                          {mapping?.sourceType === 'fixed' && (
                            <div>
                              <Label className="text-sm">Fester Wert</Label>
                              <Input
                                value={mapping?.fixedValue || ''}
                                onChange={(e) => updateTemplateMapping(columnName, 'fixedValue', e.target.value)}
                                placeholder="Konstanter Wert für alle Zeilen"
                              />
                            </div>
                          )}

                          {mapping?.sourceType === 'conditional' && (
                            <div>
                              <Label className="text-sm">Bedingte Logik</Label>
                              <Input
                                value={mapping?.conditions?.[0]?.condition || ''}
                                onChange={(e) => updateTemplateMapping(columnName, 'conditions', [{ 
                                  condition: e.target.value, 
                                  value: mapping?.conditions?.[0]?.value || '' 
                                }])}
                                placeholder='z.B. [rolle] === "Admin"'
                                className="mb-2"
                              />
                              <Input
                                value={mapping?.conditions?.[0]?.value || ''}
                                onChange={(e) => updateTemplateMapping(columnName, 'conditions', [{ 
                                  condition: mapping?.conditions?.[0]?.condition || '', 
                                  value: e.target.value 
                                }])}
                                placeholder="Wert wenn Bedingung erfüllt"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <Button 
                  onClick={applyRecipe} 
                  className="w-full" 
                  disabled={!selectedTemplate}
                >
                  Template anwenden
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CSVTransformer;
