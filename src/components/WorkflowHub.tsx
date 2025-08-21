import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus,
  Search,
  Workflow,
  Play,
  Edit,
  Trash2,
  Copy,
  Clock,
  Database,
  Zap
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SavedWorkflow {
  id: string;
  name: string;
  description: string;
  steps: number;
  lastUsed: Date;
  category: 'cleaning' | 'transformation' | 'analysis' | 'custom';
}

const WorkflowHub = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Mock data - in real app this would come from storage/API
  const [workflows, setWorkflows] = useState<SavedWorkflow[]>([
    {
      id: '1',
      name: 'Kunden-Datenmigration',
      description: 'Bereinigung und Normalisierung von Kundendaten mit E-Mail-Validierung',
      steps: 8,
      lastUsed: new Date('2024-01-15'),
      category: 'cleaning'
    },
    {
      id: '2',
      name: 'Produktkatalog-Transformation',
      description: 'Konvertierung von Legacy-Produktdaten in neues Schema',
      steps: 12,
      lastUsed: new Date('2024-01-10'),
      category: 'transformation'
    },
    {
      id: '3',
      name: 'Verkaufsdaten-Analyse',
      description: 'Aggregation und Pivot-Analyse von Verkaufsdaten',
      steps: 6,
      lastUsed: new Date('2024-01-08'),
      category: 'analysis'
    }
  ]);

  const categories = [
    { value: 'all', label: 'Alle Workflows', icon: Workflow },
    { value: 'cleaning', label: 'Datenbereinigung', icon: Database },
    { value: 'transformation', label: 'Transformation', icon: Zap },
    { value: 'analysis', label: 'Analyse', icon: Search }
  ];

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || workflow.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cleaning': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'transformation': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'analysis': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const handleRunWorkflow = (workflowId: string) => {
    console.log('Running workflow:', workflowId);
  };

  const handleEditWorkflow = (workflowId: string) => {
    console.log('Editing workflow:', workflowId);
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
  };

  const handleDuplicateWorkflow = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      const newWorkflow = {
        ...workflow,
        id: Date.now().toString(),
        name: `${workflow.name} (Kopie)`,
        lastUsed: new Date()
      };
      setWorkflows(prev => [...prev, newWorkflow]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-data bg-clip-text text-transparent">
          Workflow Hub
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Verwalten Sie Ihre gespeicherten Datenverarbeitungs-Workflows und wenden Sie sie auf neue Datensätze an
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Workflows durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Button className="bg-gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          Neuer Workflow
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              {category.label}
            </Button>
          );
        })}
      </div>

      <Separator />

      {/* Empty State */}
      {filteredWorkflows.length === 0 && (
        <Alert>
          <Workflow className="w-4 h-4" />
          <AlertTitle>Keine Workflows gefunden</AlertTitle>
          <AlertDescription>
            {searchTerm ? 
              'Keine Workflows entsprechen Ihren Suchkriterien.' : 
              'Erstellen Sie Ihren ersten Workflow, um loszulegen.'
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Workflow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkflows.map((workflow) => (
          <Card key={workflow.id} className="shadow-elegant hover:shadow-lg transition-smooth">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{workflow.name}</CardTitle>
                  <Badge variant="secondary" className={getCategoryColor(workflow.category)}>
                    {workflow.category === 'cleaning' && 'Bereinigung'}
                    {workflow.category === 'transformation' && 'Transformation'}
                    {workflow.category === 'analysis' && 'Analyse'}
                    {workflow.category === 'custom' && 'Benutzerdefiniert'}
                  </Badge>
                </div>
                <Workflow className="w-5 h-5 text-muted-foreground" />
              </div>
              <CardDescription>{workflow.description}</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {workflow.steps} Schritte
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {workflow.lastUsed.toLocaleDateString('de-DE')}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleRunWorkflow(workflow.id)}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Ausführen
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleEditWorkflow(workflow.id)}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDuplicateWorkflow(workflow.id)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDeleteWorkflow(workflow.id)}
                  className="hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WorkflowHub;