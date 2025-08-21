interface WorkflowStep {
  id: string;
  type: 'source' | 'transform' | 'filter' | 'output';
  name: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

interface FieldMapping {
  source: string;
  target: string;
  transformation?: string;
}

interface SavedWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  mappings: FieldMapping[];
  category: 'cleaning' | 'transformation' | 'analysis' | 'custom';
  created: string;
  lastUsed: string;
  version: number;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  inputFiles: string[];
  outputFiles: string[];
  logs: string[];
  error?: string;
}

class WorkflowStorage {
  private readonly WORKFLOWS_KEY = 'saved-workflows';
  private readonly EXECUTIONS_KEY = 'workflow-executions';

  // Workflow Management
  saveWorkflow(workflow: Omit<SavedWorkflow, 'id' | 'created' | 'lastUsed' | 'version'>): SavedWorkflow {
    const workflows = this.getWorkflows();
    const existingIndex = workflows.findIndex(w => w.name === workflow.name);
    
    const savedWorkflow: SavedWorkflow = {
      ...workflow,
      id: existingIndex >= 0 ? workflows[existingIndex].id : Date.now().toString(),
      created: existingIndex >= 0 ? workflows[existingIndex].created : new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      version: existingIndex >= 0 ? workflows[existingIndex].version + 1 : 1
    };

    if (existingIndex >= 0) {
      workflows[existingIndex] = savedWorkflow;
    } else {
      workflows.push(savedWorkflow);
    }

    localStorage.setItem(this.WORKFLOWS_KEY, JSON.stringify(workflows));
    return savedWorkflow;
  }

  getWorkflows(): SavedWorkflow[] {
    const stored = localStorage.getItem(this.WORKFLOWS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  getWorkflow(id: string): SavedWorkflow | null {
    const workflows = this.getWorkflows();
    return workflows.find(w => w.id === id) || null;
  }

  deleteWorkflow(id: string): boolean {
    const workflows = this.getWorkflows();
    const filteredWorkflows = workflows.filter(w => w.id !== id);
    
    if (filteredWorkflows.length !== workflows.length) {
      localStorage.setItem(this.WORKFLOWS_KEY, JSON.stringify(filteredWorkflows));
      return true;
    }
    return false;
  }

  duplicateWorkflow(id: string): SavedWorkflow | null {
    const workflow = this.getWorkflow(id);
    if (!workflow) return null;

    const duplicate = {
      ...workflow,
      name: `${workflow.name} (Kopie)`,
      description: `Kopie von: ${workflow.description}`
    };

    delete (duplicate as any).id;
    delete (duplicate as any).created;
    delete (duplicate as any).lastUsed;
    delete (duplicate as any).version;

    return this.saveWorkflow(duplicate);
  }

  // Workflow Execution
  async executeWorkflow(workflowId: string, inputFiles: File[]): Promise<WorkflowExecution> {
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow nicht gefunden');
    }

    const execution: WorkflowExecution = {
      id: Date.now().toString(),
      workflowId,
      status: 'running',
      startTime: new Date().toISOString(),
      inputFiles: inputFiles.map(f => f.name),
      outputFiles: [],
      logs: []
    };

    this.saveExecution(execution);

    try {
      // Update workflow last used
      workflow.lastUsed = new Date().toISOString();
      this.saveWorkflow(workflow);

      // Execute workflow steps
      execution.logs.push('Workflow-Ausführung gestartet');
      
      for (const step of workflow.steps) {
        execution.logs.push(`Führe Schritt aus: ${step.name}`);
        await this.executeStep(step, execution);
      }

      execution.status = 'completed';
      execution.endTime = new Date().toISOString();
      execution.logs.push('Workflow erfolgreich abgeschlossen');

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date().toISOString();
      execution.error = error instanceof Error ? error.message : 'Unbekannter Fehler';
      execution.logs.push(`Fehler: ${execution.error}`);
    }

    this.saveExecution(execution);
    return execution;
  }

  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    // Simulate step execution based on type
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    switch (step.type) {
      case 'source':
        execution.logs.push(`Datenquelle geladen: ${step.config.file || 'Unbekannte Datei'}`);
        break;
      case 'transform':
        execution.logs.push(`Transformation angewendet: ${step.config.type || 'Unbekannte Transformation'}`);
        break;
      case 'filter':
        execution.logs.push(`Filter angewendet: ${step.config.condition || 'Keine Bedingung'}`);
        break;
      case 'output':
        const outputFile = step.config.outputFile || 'output.csv';
        execution.outputFiles.push(outputFile);
        execution.logs.push(`Ausgabe erstellt: ${outputFile}`);
        break;
    }
  }

  // Execution Management
  private saveExecution(execution: WorkflowExecution): void {
    const executions = this.getExecutions();
    const existingIndex = executions.findIndex(e => e.id === execution.id);
    
    if (existingIndex >= 0) {
      executions[existingIndex] = execution;
    } else {
      executions.push(execution);
    }

    // Keep only last 50 executions
    if (executions.length > 50) {
      executions.splice(0, executions.length - 50);
    }

    localStorage.setItem(this.EXECUTIONS_KEY, JSON.stringify(executions));
  }

  getExecutions(): WorkflowExecution[] {
    const stored = localStorage.getItem(this.EXECUTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  getExecutionsByWorkflow(workflowId: string): WorkflowExecution[] {
    return this.getExecutions().filter(e => e.workflowId === workflowId);
  }

  // Import/Export
  exportWorkflow(id: string): string | null {
    const workflow = this.getWorkflow(id);
    return workflow ? JSON.stringify(workflow, null, 2) : null;
  }

  importWorkflow(jsonData: string): SavedWorkflow {
    try {
      const workflow = JSON.parse(jsonData);
      
      // Validate workflow structure
      if (!workflow.name || !workflow.steps || !Array.isArray(workflow.steps)) {
        throw new Error('Ungültiges Workflow-Format');
      }

      // Remove ID to create new workflow
      delete workflow.id;
      delete workflow.created;
      delete workflow.lastUsed;
      delete workflow.version;

      return this.saveWorkflow(workflow);
    } catch (error) {
      throw new Error(`Import fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  // Analytics
  getWorkflowStats(): {
    totalWorkflows: number;
    totalExecutions: number;
    successRate: number;
    mostUsedWorkflows: Array<{workflow: SavedWorkflow, executions: number}>;
  } {
    const workflows = this.getWorkflows();
    const executions = this.getExecutions();
    
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const successRate = executions.length > 0 ? (successfulExecutions / executions.length) * 100 : 0;

    const workflowExecutionCounts = workflows.map(workflow => ({
      workflow,
      executions: executions.filter(e => e.workflowId === workflow.id).length
    })).sort((a, b) => b.executions - a.executions).slice(0, 5);

    return {
      totalWorkflows: workflows.length,
      totalExecutions: executions.length,
      successRate: Math.round(successRate),
      mostUsedWorkflows: workflowExecutionCounts
    };
  }
}

export const workflowStorage = new WorkflowStorage();
export type { SavedWorkflow, WorkflowStep, FieldMapping, WorkflowExecution };
