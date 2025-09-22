// Enhanced CSV Transformation Engine
// Handles file merging, template mapping, and data transformations

export interface CSVFile {
  id: string;
  name: string;
  headers: string[];
  data: string[][];
  rowCount: number;
  delimiter: string;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  defaultValue?: string;
}

export interface NewColumn {
  name: string;
  type: 'fixed' | 'formula' | 'conditional';
  value?: string;
  conditionalRules?: ConditionalRule[];
}

export interface CSVTemplate {
  id: string;
  name: string;
  description: string;
  columns: { name: string; type: string }[];
  created: Date;
}

export interface TemplateColumnMapping {
  templateColumn: string;
  sourceColumn: string;
  transformation: 'direct' | 'uppercase' | 'lowercase' | 'trim' | 'format_phone';
  defaultValue: string;
  formula?: string;
}

export interface ConditionalRule {
  condition: string;
  value: string;
}

export interface TransformationRecipe {
  id: string;
  name: string;
  description: string;
  columnMappings: ColumnMapping[];
  newColumns: NewColumn[];
  mergeSettings?: {
    method: 'append' | 'join';
    joinColumn?: string;
  };
  created: Date;
  lastUsed?: Date;
}

class TransformationEngine {
  private recipes: TransformationRecipe[] = [];
  private templates: CSVTemplate[] = [];

  constructor() {
    this.loadRecipes();
    this.loadTemplates();
  }

  // Recipe management
  saveRecipe(recipe: Omit<TransformationRecipe, 'id' | 'created'>): TransformationRecipe {
    const newRecipe: TransformationRecipe = {
      ...recipe,
      id: this.generateId(),
      created: new Date()
    };
    this.recipes.push(newRecipe);
    this.persistRecipes();
    return newRecipe;
  }

  getRecipes(): TransformationRecipe[] {
    return this.recipes;
  }

  deleteRecipe(id: string): boolean {
    const index = this.recipes.findIndex(r => r.id === id);
    if (index !== -1) {
      this.recipes.splice(index, 1);
      this.persistRecipes();
      return true;
    }
    return false;
  }

  // Template management
  saveTemplate(template: Omit<CSVTemplate, 'id' | 'created'>): CSVTemplate {
    const newTemplate: CSVTemplate = {
      ...template,
      id: this.generateId(),
      created: new Date()
    };
    this.templates.push(newTemplate);
    this.persistTemplates();
    return newTemplate;
  }

  getTemplates(): CSVTemplate[] {
    return this.templates;
  }

  deleteTemplate(id: string): boolean {
    const index = this.templates.findIndex(t => t.id === id);
    if (index !== -1) {
      this.templates.splice(index, 1);
      this.persistTemplates();
      return true;
    }
    return false;
  }

  // File operations
  mergeFiles(files: CSVFile[], method: 'append' | 'join', joinColumn?: string): CSVFile {
    if (files.length < 2) return files[0];

    if (method === 'append') {
      const mergedData: string[][] = [];
      const commonHeaders = files[0].headers;
      
      files.forEach(file => {
        file.data.forEach(row => {
          const alignedRow: string[] = [];
          commonHeaders.forEach(header => {
            const index = file.headers.indexOf(header);
            alignedRow.push(index !== -1 ? (row[index] || '') : '');
          });
          mergedData.push(alignedRow);
        });
      });

      return {
        id: this.generateId(),
        name: `merged_${files.map(f => f.name).join('_')}`,
        headers: commonHeaders,
        data: mergedData,
        rowCount: mergedData.length,
        delimiter: files[0].delimiter
      };
    } else if (method === 'join' && joinColumn) {
      const baseFile = files[0];
      const joinFile = files[1];
      
      const joinColumnIndex = baseFile.headers.indexOf(joinColumn);
      const joinFileJoinIndex = joinFile.headers.indexOf(joinColumn);
      
      if (joinColumnIndex === -1 || joinFileJoinIndex === -1) {
        throw new Error('Join column not found in both files');
      }
      
      const mergedHeaders = [...baseFile.headers];
      joinFile.headers.forEach(header => {
        if (!mergedHeaders.includes(header)) {
          mergedHeaders.push(header);
        }
      });
      
      const mergedData: string[][] = [];
      
      baseFile.data.forEach(baseRow => {
        const joinValue = baseRow[joinColumnIndex];
        const matchingJoinRow = joinFile.data.find(row => row[joinFileJoinIndex] === joinValue);
        
        const mergedRow: string[] = [...baseRow];
        
        joinFile.headers.forEach((header, index) => {
          if (!baseFile.headers.includes(header)) {
            mergedRow.push(matchingJoinRow ? (matchingJoinRow[index] || '') : '');
          }
        });
        
        mergedData.push(mergedRow);
      });
      
      return {
        id: this.generateId(),
        name: `joined_${baseFile.name}_${joinFile.name}`,
        headers: mergedHeaders,
        data: mergedData,
        rowCount: mergedData.length,
        delimiter: baseFile.delimiter
      };
    }
    
    return files[0];
  }

  // Apply template with enhanced formula support
  applyTemplate(file: CSVFile, template: CSVTemplate, mappings: TemplateColumnMapping[]): CSVFile {
    const newHeaders = mappings.map(m => m.templateColumn);
    const transformedData: string[][] = [];
    
    file.data.forEach(row => {
      const newRow: string[] = [];
      
      mappings.forEach(mapping => {
        let value = '';
        
        // If there's a formula, prioritize it
        if (mapping.formula) {
          value = this.evaluateFormula(mapping.formula, row, file.headers);
        } else if (mapping.sourceColumn) {
          const sourceIndex = file.headers.indexOf(mapping.sourceColumn);
          value = sourceIndex !== -1 ? (row[sourceIndex] || '') : '';
          
          // Apply transformation
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
        } else {
          value = mapping.defaultValue || '';
        }
        
        newRow.push(value);
      });
      
      transformedData.push(newRow);
    });

    return {
      ...file,
      headers: newHeaders,
      data: transformedData,
      name: `${file.name}_template_${template.name}`
    };
  }

  // Enhanced formula evaluation with better variable handling
  private evaluateFormula(formula: string, row: string[], headers: string[]): string {
    try {
      let result = formula.trim();
      
      // Replace column references with actual values (case-insensitive)
      headers.forEach((header, index) => {
        const value = row[index] || '';
        // Replace {ColumnName} pattern
        result = result.replace(new RegExp(`\\{${header}\\}`, 'gi'), value);
        // Replace direct column name references (for formulas like "Name@domain.de")
        const regex = new RegExp(`\\b${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        result = result.replace(regex, value);
      });
      
      // Function processing
      if (result.includes('CONCAT(')) {
        const match = result.match(/CONCAT\(([^)]+)\)/i);
        if (match) {
          const params = match[1].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
          return params.join('');
        }
      }
      
      if (result.includes('UPPER(')) {
        const match = result.match(/UPPER\(([^)]+)\)/i);
        if (match) {
          return match[1].trim().replace(/^["']|["']$/g, '').toUpperCase();
        }
      }
      
      if (result.includes('LOWER(')) {
        const match = result.match(/LOWER\(([^)]+)\)/i);
        if (match) {
          return match[1].trim().replace(/^["']|["']$/g, '').toLowerCase();
        }
      }
      
      return result;
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return '';
    }
  }

  private evaluateConditional(rules: ConditionalRule[], row: string[], headers: string[]): string {
    for (const rule of rules) {
      if (this.evaluateCondition(rule.condition, row, headers)) {
        return rule.value;
      }
    }
    return '';
  }

  private evaluateCondition(condition: string, row: string[], headers: string[]): boolean {
    let evalCondition = condition;
    
    headers.forEach((header, index) => {
      const placeholder = `[${header}]`;
      const value = row[index] || '';
      evalCondition = evalCondition.replace(new RegExp('\\[' + header + '\\]', 'g'), `"${value}"`);
    });
    
    try {
      if (evalCondition.includes('===') || evalCondition.includes('!==') || 
          evalCondition.includes('==') || evalCondition.includes('!=')) {
        return eval(evalCondition);
      }
    } catch {
      // If evaluation fails, return false
    }
    
    return false;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private loadRecipes(): void {
    try {
      const stored = localStorage.getItem('transformation-recipes');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.recipes = parsed.map((recipe: any) => ({
          ...recipe,
          created: new Date(recipe.created),
          lastUsed: recipe.lastUsed ? new Date(recipe.lastUsed) : undefined
        }));
      }
    } catch (error) {
      console.error('Failed to load recipes:', error);
      this.recipes = [];
    }
  }

  private persistRecipes(): void {
    try {
      localStorage.setItem('transformation-recipes', JSON.stringify(this.recipes));
    } catch (error) {
      console.error('Failed to save recipes:', error);
    }
  }

  private loadTemplates(): void {
    try {
      const stored = localStorage.getItem('csv-templates');
      if (stored) {
        this.templates = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      this.templates = [];
    }
  }

  private persistTemplates(): void {
    try {
      localStorage.setItem('csv-templates', JSON.stringify(this.templates));
    } catch (error) {
      console.error('Failed to save templates:', error);
    }
  }
}

export const transformationEngine = new TransformationEngine();