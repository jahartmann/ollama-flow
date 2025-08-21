// CSV Transformation Engine - Handles complex data transformations
export interface CSVFile {
  id: string;
  name: string;
  headers: string[];
  data: string[][];
  delimiter?: string;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  sourceFile?: string; // For multi-file scenarios
}

export interface NewColumn {
  name: string;
  type: 'fixed' | 'formula' | 'conditional';
  value?: string; // For fixed values
  formula?: string; // For formula-based values like "[firstName] + '@' + [domain]"
  conditions?: ConditionalRule[]; // For conditional logic
}

export interface CSVTemplate {
  id: string;
  name: string;
  description: string;
  columns: {
    name: string;
    type: 'string' | 'number' | 'email' | 'date' | 'boolean';
    required: boolean;
    formula?: string;
  }[];
}

export interface TemplateColumnMapping {
  templateColumn: string;
  sourceColumn: string;
  transformation?: 'direct' | 'uppercase' | 'lowercase' | 'trim' | 'format_phone' | 'formula';
  defaultValue?: string;
  formula?: string;
}

export interface ConditionalRule {
  condition: string; // e.g., "[role] === 'Lehrer'"
  value: string; // What to fill if condition is true
}

export interface TransformationRecipe {
  id: string;
  name: string;
  description: string;
  sourceFiles: string[]; // Expected file names/patterns
  columnMappings: ColumnMapping[];
  newColumns: NewColumn[];
  templateId?: string; // Reference to a CSV template
  templateMappings: TemplateColumnMapping[]; // Template-based column mappings
  mergeStrategy?: 'append' | 'join'; // How to combine multiple files
  joinColumn?: string; // Column to join on if using join strategy
  created: Date;
  lastUsed?: Date;
}

export class TransformationEngine {
  private recipes: TransformationRecipe[] = [];
  private templates: CSVTemplate[] = [];

  constructor() {
    this.loadRecipes();
    this.loadTemplates();
  }

  // Template Management
  saveTemplate(template: Omit<CSVTemplate, 'id'>): CSVTemplate {
    const newTemplate: CSVTemplate = {
      ...template,
      id: this.generateId()
    };
    
    this.templates.push(newTemplate);
    this.persistTemplates();
    return newTemplate;
  }

  getTemplates(): CSVTemplate[] {
    return [...this.templates];
  }

  getTemplate(id: string): CSVTemplate | undefined {
    return this.templates.find(t => t.id === id);
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

  createTemplateFromCSV(csvFile: CSVFile, name: string, description?: string): CSVTemplate {
    return this.saveTemplate({
      name,
      description: description || '',
      columns: csvFile.headers.map(header => ({
        name: header,
        type: 'string' as const,
        required: false
      }))
    });
  }

  // Recipe Management
  saveRecipe(recipe: Omit<TransformationRecipe, 'id' | 'created'>): TransformationRecipe {
    const newRecipe: TransformationRecipe = {
      ...recipe,
      templateMappings: recipe.templateMappings || [],
      id: this.generateId(),
      created: new Date()
    };
    
    this.recipes.push(newRecipe);
    this.persistRecipes();
    return newRecipe;
  }

  getRecipes(): TransformationRecipe[] {
    return [...this.recipes];
  }

  getRecipe(id: string): TransformationRecipe | undefined {
    return this.recipes.find(r => r.id === id);
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

  updateRecipeUsage(id: string): void {
    const recipe = this.recipes.find(r => r.id === id);
    if (recipe) {
      recipe.lastUsed = new Date();
      this.persistRecipes();
    }
  }

  // Transformation Logic
  applyRecipe(files: CSVFile[], recipe: TransformationRecipe): {
    success: boolean;
    data?: CSVFile;
    error?: string;
  } {
    try {
      // Step 1: Merge files if multiple
      let workingData: CSVFile;
      
      if (files.length === 1) {
        workingData = { ...files[0] };
      } else {
        workingData = this.mergeFilesForRecipe(files, recipe);
      }

      // Step 2: Apply template-based transformation if template is specified
      if (recipe.templateId && recipe.templateMappings.length > 0) {
        const template = this.getTemplate(recipe.templateId);
        if (template) {
          workingData = this.applyTemplateTransformation(workingData, template, recipe.templateMappings);
        }
      } else {
        // Step 2 (fallback): Apply column mappings (rename columns)
        workingData = this.applyColumnMappings(workingData, recipe.columnMappings);

        // Step 3 (fallback): Add new columns
        workingData = this.addNewColumns(workingData, recipe.newColumns);
      }

      this.updateRecipeUsage(recipe.id);

      return {
        success: true,
        data: workingData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Public method for CSV wizard - handles merging files
  public mergeFiles(files: CSVFile[], operation: 'append' | 'join', joinColumn?: string): CSVFile {
    if (operation === 'append') {
      return this.appendFiles(files);
    } else if (operation === 'join' && joinColumn) {
      return this.joinFiles(files, joinColumn);
    } else {
      throw new Error('Invalid merge operation or missing join column');
    }
  }

  // Private method for recipe-based merging  
  private mergeFilesForRecipe(files: CSVFile[], recipe: TransformationRecipe): CSVFile {
    if (recipe.mergeStrategy === 'join' && recipe.joinColumn) {
      return this.joinFiles(files, recipe.joinColumn);
    } else {
      return this.appendFiles(files);
    }
  }

  private appendFiles(files: CSVFile[]): CSVFile {
    if (files.length === 0) throw new Error('No files to merge');
    
    const mergedFile: CSVFile = {
      id: this.generateId(),
      name: `merged_${files.map(f => f.name).join('_')}`,
      headers: files[0].headers,
      data: []
    };

    // Append all data, ensuring consistent column structure
    files.forEach(file => {
      file.data.forEach(row => {
        const alignedRow = mergedFile.headers.map(header => {
          const columnIndex = file.headers.indexOf(header);
          return columnIndex !== -1 ? row[columnIndex] || '' : '';
        });
        mergedFile.data.push(alignedRow);
      });
    });

    return mergedFile;
  }

  private joinFiles(files: CSVFile[], joinColumn: string): CSVFile {
    if (files.length !== 2) {
      throw new Error('Join operation requires exactly 2 files');
    }

    const [file1, file2] = files;
    const joinIndex1 = file1.headers.indexOf(joinColumn);
    const joinIndex2 = file2.headers.indexOf(joinColumn);

    if (joinIndex1 === -1 || joinIndex2 === -1) {
      throw new Error(`Join column "${joinColumn}" not found in both files`);
    }

    // Create merged headers (avoiding duplicates)
    const mergedHeaders = [...file1.headers];
    file2.headers.forEach(header => {
      if (!mergedHeaders.includes(header)) {
        mergedHeaders.push(header);
      }
    });

    const mergedData: string[][] = [];

    // Perform inner join
    file1.data.forEach(row1 => {
      const joinValue = row1[joinIndex1];
      const matchingRows = file2.data.filter(row2 => row2[joinIndex2] === joinValue);
      
      matchingRows.forEach(row2 => {
        const mergedRow = [...row1];
        
        // Add columns from file2 that aren't already in file1
        file2.headers.forEach((header, index) => {
          if (!file1.headers.includes(header)) {
            mergedRow.push(row2[index] || '');
          }
        });
        
        mergedData.push(mergedRow);
      });
    });

    return {
      id: this.generateId(),
      name: `joined_${file1.name}_${file2.name}`,
      headers: mergedHeaders,
      data: mergedData
    };
  }

  private applyColumnMappings(file: CSVFile, mappings: ColumnMapping[]): CSVFile {
    const newHeaders = [...file.headers];
    
    mappings.forEach(mapping => {
      const index = newHeaders.indexOf(mapping.sourceColumn);
      if (index !== -1) {
        newHeaders[index] = mapping.targetColumn;
      }
    });

    return {
      ...file,
      headers: newHeaders
    };
  }

  private addNewColumns(file: CSVFile, newColumns: NewColumn[]): CSVFile {
    const updatedHeaders = [...file.headers, ...newColumns.map(col => col.name)];
    const updatedData = file.data.map(row => {
      const newRow = [...row];
      
      newColumns.forEach(column => {
        let value = '';
        
        switch (column.type) {
          case 'fixed':
            value = column.value || '';
            break;
            
          case 'formula':
            value = this.evaluateFormula(column.formula || '', row, file.headers);
            break;
            
          case 'conditional':
            value = this.evaluateConditional(column.conditions || [], row, file.headers);
            break;
        }
        
        newRow.push(value);
      });
      
      return newRow;
    });

    return {
      ...file,
      headers: updatedHeaders,
      data: updatedData
    };
  }

  private applyTemplateTransformation(file: CSVFile, template: CSVTemplate, mappings: TemplateColumnMapping[]): CSVFile {
    const transformedData: string[][] = [];
    
    // Create headers based on template
    const newHeaders = template.columns.map(col => col.name);
    
    // Transform each row according to template mappings
    file.data.forEach(row => {
      const newRow: string[] = [];
      
      newHeaders.forEach(templateColumn => {
        const mapping = mappings.find(m => m.templateColumn === templateColumn);
        let value = '';
        
        if (mapping) {
          if (mapping.sourceColumn) {
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

  private evaluateFormula(formula: string, row: string[], headers: string[]): string {
    // Support Excel-like formulas: =A1&"@domain.com" or =[firstName]&"@"&[domain]
    let result = formula.trim();
    
    // Remove leading = if present (Excel-style)
    if (result.startsWith('=')) {
      result = result.substring(1);
    }
    
    // Replace column references
    // Support both Excel-style (A1, B2) and named references ([columnName])
    headers.forEach((header, index) => {
      const value = row[index] || '';
      
      // Replace named references like [firstName]
      const namedPlaceholder = `[${header}]`;
      result = result.replace(new RegExp('\\[' + header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\]', 'g'), `"${value}"`);
      
      // Replace Excel-style references like A1, B1, etc.
      const excelRef = this.getExcelColumnName(index + 1) + '1';
      result = result.replace(new RegExp(excelRef, 'g'), `"${value}"`);
    });
    
    // Handle string concatenation with & operator (Excel-style)
    result = result.replace(/&/g, '+');
    
    // Evaluate the expression safely
    try {
      // Only allow safe operations: string concatenation and basic operations
      if (/^["\w\s+().-]+$/.test(result.replace(/'/g, '"'))) {
        return eval(result.replace(/'/g, '"')) || '';
      }
    } catch (error) {
      console.warn('Formula evaluation failed:', error);
    }
    
    return result;
  }

  private getExcelColumnName(columnNumber: number): string {
    let columnName = '';
    while (columnNumber > 0) {
      columnNumber--; // Make it 0-indexed
      columnName = String.fromCharCode(65 + (columnNumber % 26)) + columnName;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return columnName;
  }

  private evaluateConditional(conditions: ConditionalRule[], row: string[], headers: string[]): string {
    for (const rule of conditions) {
      if (this.evaluateCondition(rule.condition, row, headers)) {
        return rule.value;
      }
    }
    return '';
  }

  private evaluateCondition(condition: string, row: string[], headers: string[]): boolean {
    let evalCondition = condition;
    
    // Replace column references with actual values
    headers.forEach((header, index) => {
      const placeholder = `[${header}]`;
      const value = row[index] || '';
      evalCondition = evalCondition.replace(new RegExp('\\[' + header + '\\]', 'g'), `"${value}"`);
    });
    
    // Simple condition evaluation (extend as needed)
    try {
      // Only allow safe comparisons
      if (evalCondition.includes('===') || evalCondition.includes('!==') || 
          evalCondition.includes('==') || evalCondition.includes('!=')) {
        return eval(evalCondition);
      }
    } catch {
      // If evaluation fails, return false
    }
    
    return false;
  }

  // Utility methods
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