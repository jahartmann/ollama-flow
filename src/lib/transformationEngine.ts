// CSV Transformation Engine - Handles complex data transformations
export interface CSVFile {
  id: string;
  name: string;
  headers: string[];
  data: string[][];
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
  mergeStrategy?: 'append' | 'join'; // How to combine multiple files
  joinColumn?: string; // Column to join on if using join strategy
  created: Date;
  lastUsed?: Date;
}

export class TransformationEngine {
  private recipes: TransformationRecipe[] = [];

  constructor() {
    this.loadRecipes();
  }

  // Recipe Management
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
        workingData = this.mergeFiles(files, recipe);
      }

      // Step 2: Apply column mappings (rename columns)
      workingData = this.applyColumnMappings(workingData, recipe.columnMappings);

      // Step 3: Add new columns
      workingData = this.addNewColumns(workingData, recipe.newColumns);

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

  private mergeFiles(files: CSVFile[], recipe: TransformationRecipe): CSVFile {
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

  private evaluateFormula(formula: string, row: string[], headers: string[]): string {
    let result = formula;
    
    // Replace column references like [firstName] with actual values
    headers.forEach((header, index) => {
      const placeholder = `[${header}]`;
      const value = row[index] || '';
      result = result.replace(new RegExp('\\[' + header + '\\]', 'g'), value);
    });
    
    // Handle simple string concatenation (remove quotes and + operators)
    result = result.replace(/'/g, '').replace(/"/g, '');
    result = result.replace(/\s*\+\s*/g, '');
    
    return result;
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
}

export const transformationEngine = new TransformationEngine();