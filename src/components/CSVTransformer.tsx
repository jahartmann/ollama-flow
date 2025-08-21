import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Upload,
  FileText,
  Settings,
  Play,
  Save,
  Trash2,
  Plus,
  Download,
  Merge,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { fileProcessor, type CSVParseResult } from '@/lib/fileProcessor';
import { 
  transformationEngine, 
  type CSVFile, 
  type TransformationRecipe,
  type ColumnMapping,
  type NewColumn,
  type ConditionalRule
} from '@/lib/transformationEngine';
import { useToast } from '@/hooks/use-toast';

const CSVTransformer = () => {
  const [csvFiles, setCsvFiles] = useState<CSVFile[]>([]);
  const [currentRecipe, setCurrentRecipe] = useState<Partial<TransformationRecipe>>({
    name: '',
    description: '',
    sourceFiles: [],
    columnMappings: [],
    newColumns: [],
    mergeStrategy: 'append'
  });
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [transformedData, setTransformedData] = useState<CSVFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const recipes = transformationEngine.getRecipes();

  // File Upload
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    const newFiles: CSVFile[] = [];

    try {
      for (const file of Array.from(files)) {
        const result: CSVParseResult = await fileProcessor.parseCSV(file, {
          delimiter: '',
          hasHeaders: true,
          skipEmptyLines: true
        });

        const csvFile: CSVFile = {
          id: Math.random().toString(36).substring(2),
          name: file.name,
          headers: result.headers,
          data: result.data
        };

        newFiles.push(csvFile);
      }

      setCsvFiles(prev => [...prev, ...newFiles]);
      
      toast({
        title: "Dateien geladen",
        description: `${newFiles.length} CSV-Datei(en) erfolgreich importiert`
      });

    } catch (error) {
      toast({
        title: "Import-Fehler",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Recipe Management
  const saveCurrentRecipe = useCallback(() => {
    if (!currentRecipe.name?.trim()) {
      toast({
        title: "Fehler",
        description: "Please enter a recipe name",
        variant: "destructive"
      });
      return;
    }

    try {
      const recipe = transformationEngine.saveRecipe({
        name: currentRecipe.name,
        description: currentRecipe.description || '',
        sourceFiles: currentRecipe.sourceFiles || [],
        columnMappings: currentRecipe.columnMappings || [],
        newColumns: currentRecipe.newColumns || [],
        mergeStrategy: currentRecipe.mergeStrategy || 'append',
        joinColumn: currentRecipe.joinColumn
      });

      toast({
        title: "Rezept gespeichert",
        description: `"${recipe.name}" wurde erfolgreich gespeichert`
      });

      setCurrentRecipe({
        name: '',
        description: '',
        sourceFiles: [],
        columnMappings: [],
        newColumns: [],
        mergeStrategy: 'append'
      });

    } catch (error) {
      toast({
        title: "Speicher-Fehler",
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: "destructive"
      });
    }
  }, [currentRecipe, toast]);

  const loadRecipe = useCallback((recipeId: string) => {
    const recipe = transformationEngine.getRecipe(recipeId);
    if (recipe) {
      setCurrentRecipe(recipe);
      setSelectedRecipeId(recipeId);
    }
  }, []);

  const deleteRecipe = useCallback((recipeId: string) => {
    if (transformationEngine.deleteRecipe(recipeId)) {
      toast({
        title: "Rezept gelöscht",
        description: "Das Rezept wurde erfolgreich entfernt"
      });
      
      if (selectedRecipeId === recipeId) {
        setSelectedRecipeId('');
        setCurrentRecipe({
          name: '',
          description: '',
          sourceFiles: [],
          columnMappings: [],
          newColumns: [],
          mergeStrategy: 'append'
        });
      }
    }
  }, [selectedRecipeId, toast]);

  // Transformation Logic
  const applyTransformation = useCallback(() => {
    if (csvFiles.length === 0) {
      toast({
        title: "Keine Dateien",
        description: "Bitte laden Sie mindestens eine CSV-Datei hoch",
        variant: "destructive"
      });
      return;
    }

    if (!currentRecipe.name) {
      toast({
        title: "Kein Rezept",
        description: "Bitte erstellen Sie ein Rezept oder laden Sie ein bestehendes",
        variant: "destructive"
      });
      return;
    }

    const result = transformationEngine.applyRecipe(csvFiles, currentRecipe as TransformationRecipe);
    
    if (result.success && result.data) {
      setTransformedData(result.data);
      toast({
        title: "Transformation erfolgreich",
        description: "Die Daten wurden erfolgreich transformiert"
      });
    } else {
      toast({
        title: "Transformation fehlgeschlagen",
        description: result.error || 'Unbekannter Fehler',
        variant: "destructive"
      });
    }
  }, [csvFiles, currentRecipe, toast]);

  // Column Mapping Management
  const addColumnMapping = useCallback(() => {
    setCurrentRecipe(prev => ({
      ...prev,
      columnMappings: [
        ...(prev.columnMappings || []),
        { sourceColumn: '', targetColumn: '' }
      ]
    }));
  }, []);

  const updateColumnMapping = useCallback((index: number, field: keyof ColumnMapping, value: string) => {
    setCurrentRecipe(prev => ({
      ...prev,
      columnMappings: prev.columnMappings?.map((mapping, i) => 
        i === index ? { ...mapping, [field]: value } : mapping
      ) || []
    }));
  }, []);

  const removeColumnMapping = useCallback((index: number) => {
    setCurrentRecipe(prev => ({
      ...prev,
      columnMappings: prev.columnMappings?.filter((_, i) => i !== index) || []
    }));
  }, []);

  // New Column Management
  const addNewColumn = useCallback(() => {
    setCurrentRecipe(prev => ({
      ...prev,
      newColumns: [
        ...(prev.newColumns || []),
        { name: '', type: 'fixed', value: '' }
      ]
    }));
  }, []);

  const updateNewColumn = useCallback((index: number, field: keyof NewColumn, value: any) => {
    setCurrentRecipe(prev => ({
      ...prev,
      newColumns: prev.newColumns?.map((column, i) => 
        i === index ? { ...column, [field]: value } : column
      ) || []
    }));
  }, []);

  const removeNewColumn = useCallback((index: number) => {
    setCurrentRecipe(prev => ({
      ...prev,
      newColumns: prev.newColumns?.filter((_, i) => i !== index) || []
    }));
  }, []);

  // Export transformed data
  const exportTransformedData = useCallback((format: 'csv' | 'json') => {
    if (!transformedData) return;

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `transformed_${transformedData.name}_${timestamp}`;

    if (format === 'csv') {
      fileProcessor.exportAsCSV(transformedData.data, transformedData.headers, `${filename}.csv`);
    } else {
      const jsonData = transformedData.data.map(row => {
        const obj: Record<string, string> = {};
        transformedData.headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { 
        type: 'application/json;charset=utf-8;' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast({
      title: "Export erfolgreich",
      description: `Daten als ${format.toUpperCase()} exportiert`
    });
  }, [transformedData, toast]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-data bg-clip-text text-transparent">
          CSV Transformer
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
          Erstellen Sie wiederverwendbare Rezepte für komplexe Daten-Transformationen. 
          Kombinieren Sie Dateien, benennen Sie Spalten um und fügen Sie neue Daten hinzu.
        </p>
      </div>

      <Tabs defaultValue="files" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="files">Dateien laden</TabsTrigger>
          <TabsTrigger value="recipe">Rezept erstellen</TabsTrigger>
          <TabsTrigger value="recipes">Gespeicherte Rezepte</TabsTrigger>
          <TabsTrigger value="result">Ergebnis</TabsTrigger>
        </TabsList>

        {/* File Upload Tab */}
        <TabsContent value="files">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  CSV-Dateien hochladen
                </CardTitle>
                <CardDescription>
                  Laden Sie eine oder mehrere CSV-Dateien für die Transformation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".csv,.tsv"
                    multiple
                    onChange={handleFileUpload}
                    disabled={isLoading}
                    className="hidden"
                    id="csv-upload"
                  />
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="text-lg font-medium">
                        {isLoading ? 'Dateien werden verarbeitet...' : 'CSV-Dateien hier ablegen oder auswählen'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Mehrere Dateien gleichzeitig möglich (.csv, .tsv)
                      </p>
                    </div>
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geladene Dateien ({csvFiles.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {csvFiles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Noch keine Dateien geladen
                  </p>
                ) : (
                  <div className="space-y-3">
                    {csvFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{file.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {file.data.length} Zeilen, {file.headers.length} Spalten
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCsvFiles(prev => prev.filter(f => f.id !== file.id))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recipe Creation Tab */}
        <TabsContent value="recipe">
          <div className="space-y-6">
            {/* Recipe Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Rezept-Informationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Rezept-Name</Label>
                    <Input
                      value={currentRecipe.name || ''}
                      onChange={(e) => setCurrentRecipe(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="z.B. Schulverwaltung zu Relution"
                    />
                  </div>
                  <div>
                    <Label>Merge-Strategie</Label>
                    <Select
                      value={currentRecipe.mergeStrategy || 'append'}
                      onValueChange={(value: 'append' | 'join') => 
                        setCurrentRecipe(prev => ({ ...prev, mergeStrategy: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border shadow-lg z-50">
                        <SelectItem value="append">Anhängen (Append)</SelectItem>
                        <SelectItem value="join">Verknüpfen (Join)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {currentRecipe.mergeStrategy === 'join' && (
                  <div>
                    <Label>Join-Spalte</Label>
                    <Input
                      value={currentRecipe.joinColumn || ''}
                      onChange={(e) => setCurrentRecipe(prev => ({ ...prev, joinColumn: e.target.value }))}
                      placeholder="Spaltenname für Verknüpfung"
                    />
                  </div>
                )}

                <div>
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={currentRecipe.description || ''}
                    onChange={(e) => setCurrentRecipe(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Beschreibung des Transformation-Rezepts..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Column Mappings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Spalten umbenennen
                  <Button onClick={addColumnMapping} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Mapping hinzufügen
                  </Button>
                </CardTitle>
                <CardDescription>
                  Benennen Sie Spalten um (z.B. "Nachname" → "surname")
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentRecipe.columnMappings?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Keine Spalten-Mappings definiert
                  </p>
                ) : (
                  <div className="space-y-3">
                    {currentRecipe.columnMappings?.map((mapping, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Input
                          value={mapping.sourceColumn}
                          onChange={(e) => updateColumnMapping(index, 'sourceColumn', e.target.value)}
                          placeholder="Quell-Spalte"
                        />
                        <span className="text-muted-foreground">→</span>
                        <Input
                          value={mapping.targetColumn}
                          onChange={(e) => updateColumnMapping(index, 'targetColumn', e.target.value)}
                          placeholder="Ziel-Spalte"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeColumnMapping(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* New Columns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Neue Spalten hinzufügen
                  <Button onClick={addNewColumn} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Spalte hinzufügen
                  </Button>
                </CardTitle>
                <CardDescription>
                  Erstellen Sie neue Spalten mit festen Werten, Formeln oder bedingter Logik
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentRecipe.newColumns?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Keine neuen Spalten definiert
                  </p>
                ) : (
                  <div className="space-y-4">
                    {currentRecipe.newColumns?.map((column, index) => (
                      <div key={index} className="p-4 border rounded space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <Input
                              value={column.name}
                              onChange={(e) => updateNewColumn(index, 'name', e.target.value)}
                              placeholder="Spalten-Name"
                              className="max-w-xs"
                            />
                            <Select
                              value={column.type}
                              onValueChange={(value) => updateNewColumn(index, 'type', value)}
                            >
                              <SelectTrigger className="max-w-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border shadow-lg z-50">
                                <SelectItem value="fixed">Fester Wert</SelectItem>
                                <SelectItem value="formula">Formel</SelectItem>
                                <SelectItem value="conditional">Bedingt</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeNewColumn(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {column.type === 'fixed' && (
                          <Input
                            value={column.value || ''}
                            onChange={(e) => updateNewColumn(index, 'value', e.target.value)}
                            placeholder="Fester Wert (z.B. 'passw0rd')"
                          />
                        )}

                        {column.type === 'formula' && (
                          <div>
                            <Input
                              value={column.formula || ''}
                              onChange={(e) => updateNewColumn(index, 'formula', e.target.value)}
                              placeholder="Formel (z.B. '[firstName]' + '@' + 'domain.com')"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Verwenden Sie [SpaltenName] für Spalten-Referenzen
                            </p>
                          </div>
                        )}

                        {column.type === 'conditional' && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Bedingte Regeln:</p>
                            {column.conditions?.map((condition, condIndex) => (
                              <div key={condIndex} className="flex items-center gap-2">
                                <Input
                                  value={condition.condition}
                                  onChange={(e) => {
                                    const newConditions = [...(column.conditions || [])];
                                    newConditions[condIndex] = { ...condition, condition: e.target.value };
                                    updateNewColumn(index, 'conditions', newConditions);
                                  }}
                                  placeholder="Bedingung (z.B. [role] === 'Lehrer')"
                                  className="flex-1"
                                />
                                <span className="text-muted-foreground">→</span>
                                <Input
                                  value={condition.value}
                                  onChange={(e) => {
                                    const newConditions = [...(column.conditions || [])];
                                    newConditions[condIndex] = { ...condition, value: e.target.value };
                                    updateNewColumn(index, 'conditions', newConditions);
                                  }}
                                  placeholder="Wert"
                                  className="flex-1"
                                />
                              </div>
                            )) || null}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newConditions = [...(column.conditions || []), { condition: '', value: '' }];
                                updateNewColumn(index, 'conditions', newConditions);
                              }}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Regel hinzufügen
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={saveCurrentRecipe} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Rezept speichern
              </Button>
              <Button onClick={applyTransformation} variant="outline" className="flex-1">
                <Play className="w-4 h-4 mr-2" />
                Transformation anwenden
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Saved Recipes Tab */}
        <TabsContent value="recipes">
          <Card>
            <CardHeader>
              <CardTitle>Gespeicherte Rezepte ({recipes.length})</CardTitle>
              <CardDescription>
                Laden oder verwalten Sie Ihre gespeicherten Transformation-Rezepte
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recipes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Noch keine Rezepte gespeichert
                </p>
              ) : (
                <div className="space-y-3">
                  {recipes.map((recipe) => (
                    <div key={recipe.id} className="p-4 border rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{recipe.name}</h3>
                          <p className="text-sm text-muted-foreground">{recipe.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {recipe.columnMappings.length} Mappings
                          </Badge>
                          <Badge variant="outline">
                            {recipe.newColumns.length} Neue Spalten
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Erstellt: {recipe.created.toLocaleDateString()}
                          {recipe.lastUsed && (
                            <span className="ml-2">
                              Zuletzt verwendet: {recipe.lastUsed.toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadRecipe(recipe.id)}
                          >
                            Laden
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteRecipe(recipe.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Result Tab */}
        <TabsContent value="result">
          <div className="space-y-6">
            {transformedData ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      Transformation erfolgreich
                    </CardTitle>
                    <CardDescription>
                      {transformedData.data.length} Zeilen, {transformedData.headers.length} Spalten
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto max-h-96 border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            {transformedData.headers.map((header, index) => (
                              <th key={index} className="p-2 text-left font-medium border-r">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {transformedData.data.slice(0, 50).map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b hover:bg-muted/50">
                              {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="p-2 border-r">
                                  {cell || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {transformedData.data.length > 50 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Zeige erste 50 von {transformedData.data.length} Zeilen
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Export</CardTitle>
                    <CardDescription>
                      Exportieren Sie die transformierten Daten
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button onClick={() => exportTransformedData('csv')} className="h-20 flex-col gap-2">
                        <FileText className="w-6 h-6" />
                        Als CSV exportieren
                        <span className="text-xs text-muted-foreground">Für Excel und andere Tools</span>
                      </Button>
                      
                      <Button onClick={() => exportTransformedData('json')} variant="outline" className="h-20 flex-col gap-2">
                        <Settings className="w-6 h-6" />
                        Als JSON exportieren
                        <span className="text-xs text-muted-foreground">Für APIs und Entwicklung</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Keine Transformation durchgeführt</h3>
                  <p className="text-muted-foreground">
                    Laden Sie Dateien und erstellen Sie ein Rezept, um mit der Transformation zu beginnen.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CSVTransformer;