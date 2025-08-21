// Simple Template Engine for Data Transformation
// Works like Excel formulas - simple, direct, no complex workflows

export interface DataTemplate {
  id: string;
  name: string;
  description: string;
  category: 'cleaning' | 'transformation' | 'analysis' | 'formatting';
  formula: string;
  example: string;
  parameters?: string[];
}

export interface CSVData {
  headers: string[];
  rows: string[][];
  filename: string;
}

export interface TransformationResult {
  success: boolean;
  data: string[][];
  message: string;
  appliedTemplate?: DataTemplate;
}

// Built-in templates like Excel formulas
export const DEFAULT_TEMPLATES: DataTemplate[] = [
  {
    id: 'clean_whitespace',
    name: 'Leerzeichen entfernen',
    description: 'Entfernt führende und nachfolgende Leerzeichen',
    category: 'cleaning',
    formula: 'TRIM({column})',
    example: ' Text → Text'
  },
  {
    id: 'uppercase',
    name: 'Großbuchstaben',
    description: 'Konvertiert Text zu Großbuchstaben',
    category: 'formatting',
    formula: 'UPPER({column})',
    example: 'text → TEXT'
  },
  {
    id: 'lowercase',
    name: 'Kleinbuchstaben', 
    description: 'Konvertiert Text zu Kleinbuchstaben',
    category: 'formatting',
    formula: 'LOWER({column})',
    example: 'TEXT → text'
  },
  {
    id: 'extract_numbers',
    name: 'Zahlen extrahieren',
    description: 'Extrahiert nur Zahlen aus Text',
    category: 'transformation',
    formula: 'REGEX_EXTRACT({column}, "[0-9]+")',
    example: 'ABC123DEF → 123'
  },
  {
    id: 'date_format',
    name: 'Datum formatieren',
    description: 'Konvertiert Datum zu DD.MM.YYYY Format',
    category: 'formatting',
    formula: 'DATE_FORMAT({column}, "DD.MM.YYYY")',
    example: '2024-12-01 → 01.12.2024'
  },
  {
    id: 'email_validation',
    name: 'E-Mail validieren',
    description: 'Prüft ob E-Mail-Adresse gültig ist',
    category: 'analysis',
    formula: 'IS_EMAIL({column})',
    example: 'test@example.com → GÜLTIG'
  },
  {
    id: 'split_column',
    name: 'Spalte teilen',
    description: 'Teilt Spalte an Trennzeichen',
    category: 'transformation',
    formula: 'SPLIT({column}, "{separator}")',
    example: 'Max Mustermann → Max, Mustermann',
    parameters: ['separator']
  },
  {
    id: 'combine_columns',
    name: 'Spalten kombinieren',
    description: 'Verbindet mehrere Spalten mit Trennzeichen',
    category: 'transformation',
    formula: 'CONCAT({column1}, "{separator}", {column2})',
    example: 'Max + Mustermann → Max Mustermann',
    parameters: ['column1', 'column2', 'separator']
  },
  {
    id: 'replace_text',
    name: 'Text ersetzen',
    description: 'Ersetzt Text durch anderen Text',
    category: 'transformation',
    formula: 'REPLACE({column}, "{find}", "{replace}")',
    example: 'Hello World → Hello Universe',
    parameters: ['find', 'replace']
  },
  {
    id: 'count_chars',
    name: 'Zeichen zählen',
    description: 'Zählt Anzahl Zeichen in Spalte',
    category: 'analysis',
    formula: 'LEN({column})',
    example: 'Hello → 5'
  }
];

class TemplateEngine {
  private templates: DataTemplate[] = [...DEFAULT_TEMPLATES];

  // Get all templates
  getTemplates(): DataTemplate[] {
    return this.templates;
  }

  // Get templates by category
  getTemplatesByCategory(category: DataTemplate['category']): DataTemplate[] {
    return this.templates.filter(t => t.category === category);
  }

  // Apply a template to CSV data
  applyTemplate(
    csvData: CSVData, 
    templateId: string, 
    targetColumn: string,
    parameters: Record<string, string> = {}
  ): TransformationResult {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) {
      return {
        success: false,
        data: csvData.rows,
        message: 'Template nicht gefunden'
      };
    }

    const columnIndex = csvData.headers.indexOf(targetColumn);
    if (columnIndex === -1) {
      return {
        success: false,
        data: csvData.rows,
        message: `Spalte "${targetColumn}" nicht gefunden`
      };
    }

    try {
      const transformedRows = csvData.rows.map(row => {
        const newRow = [...row];
        const cellValue = row[columnIndex] || '';
        
        // Apply transformation based on template
        const transformedValue = this.executeFormula(template.formula, cellValue, parameters);
        newRow[columnIndex] = transformedValue;
        
        return newRow;
      });

      return {
        success: true,
        data: transformedRows,
        message: `Template "${template.name}" erfolgreich angewendet`,
        appliedTemplate: template
      };
    } catch (error) {
      return {
        success: false,
        data: csvData.rows,
        message: `Fehler beim Anwenden der Vorlage: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      };
    }
  }

  // Simple formula execution (like Excel)
  private executeFormula(formula: string, value: string, parameters: Record<string, string>): string {
    let result = value;

    try {
      // Replace parameters in formula
      let processedFormula = formula.replace(/{column}/g, value);
      
      // Replace additional parameters
      Object.entries(parameters).forEach(([key, val]) => {
        processedFormula = processedFormula.replace(new RegExp(`{${key}}`, 'g'), val);
      });

      // Execute built-in functions
      if (formula.startsWith('TRIM')) {
        result = value.trim();
      } else if (formula.startsWith('UPPER')) {
        result = value.toUpperCase();
      } else if (formula.startsWith('LOWER')) {
        result = value.toLowerCase();
      } else if (formula.startsWith('LEN')) {
        result = value.length.toString();
      } else if (formula.startsWith('REGEX_EXTRACT')) {
        const match = value.match(/[0-9]+/);
        result = match ? match[0] : '';
      } else if (formula.startsWith('IS_EMAIL')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        result = emailRegex.test(value) ? 'GÜLTIG' : 'UNGÜLTIG';
      } else if (formula.startsWith('DATE_FORMAT')) {
        // Simple date formatting
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          result = date.toLocaleDateString('de-DE');
        } else {
          result = value;
        }
      } else if (formula.startsWith('REPLACE')) {
        const findText = parameters.find || '';
        const replaceText = parameters.replace || '';
        result = value.replace(new RegExp(findText, 'g'), replaceText);
      } else if (formula.startsWith('SPLIT')) {
        const separator = parameters.separator || ' ';
        const parts = value.split(separator);
        result = parts[0] || ''; // Return first part for now
      }

      return result;
    } catch (error) {
      console.error('Formula execution error:', error);
      return value; // Return original value on error
    }
  }

  // Add custom template
  addTemplate(template: Omit<DataTemplate, 'id'>): DataTemplate {
    const newTemplate: DataTemplate = {
      ...template,
      id: `custom_${Date.now()}`
    };
    this.templates.push(newTemplate);
    this.saveTemplates();
    return newTemplate;
  }

  // Remove template
  removeTemplate(id: string): boolean {
    const index = this.templates.findIndex(t => t.id === id);
    if (index > -1) {
      this.templates.splice(index, 1);
      this.saveTemplates();
      return true;
    }
    return false;
  }

  // Save templates to localStorage
  private saveTemplates() {
    const customTemplates = this.templates.filter(t => t.id.startsWith('custom_'));
    localStorage.setItem('csv-templates', JSON.stringify(customTemplates));
  }

  // Load templates from localStorage
  loadCustomTemplates() {
    try {
      const stored = localStorage.getItem('csv-templates');
      if (stored) {
        const customTemplates: DataTemplate[] = JSON.parse(stored);
        this.templates = [...DEFAULT_TEMPLATES, ...customTemplates];
      }
    } catch (error) {
      console.error('Error loading custom templates:', error);
    }
  }
}

export const templateEngine = new TemplateEngine();

// Initialize templates on module load
templateEngine.loadCustomTemplates();