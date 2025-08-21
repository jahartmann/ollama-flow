interface ParsedFile {
  id: string;
  name: string;
  columns: string[];
  data: string[][];
  rowCount: number;
  size: number;
  encoding: string;
  delimiter: string;
  hasHeader: boolean;
}

interface FileParseOptions {
  encoding?: string;
  delimiter?: string;
  hasHeader?: boolean;
}

class FileProcessor {
  async parseCSVFile(file: File, options: FileParseOptions = {}): Promise<ParsedFile> {
    const {
      encoding = 'utf-8',
      delimiter = ',',
      hasHeader = true
    } = options;

    try {
      const text = await this.readFileWithEncoding(file, encoding);
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('Datei ist leer');
      }

      const data = lines.map(line => this.parseCSVLine(line, delimiter));
      const columns = hasHeader ? data[0] : data[0].map((_, i) => `Spalte ${i + 1}`);
      const dataRows = hasHeader ? data.slice(1) : data;

      return {
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        columns,
        data: dataRows,
        rowCount: dataRows.length,
        size: file.size,
        encoding,
        delimiter,
        hasHeader
      };
    } catch (error) {
      console.error('File parsing error:', error);
      throw new Error(`Fehler beim Parsen der Datei: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  private async readFileWithEncoding(file: File, encoding: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei'));
      
      // Use TextDecoder for proper encoding support
      if (encoding !== 'utf-8') {
        reader.readAsArrayBuffer(file);
        reader.onload = () => {
          try {
            const decoder = new TextDecoder(encoding);
            const text = decoder.decode(reader.result as ArrayBuffer);
            resolve(text);
          } catch (error) {
            reject(new Error(`Unsupported encoding: ${encoding}`));
          }
        };
      } else {
        reader.readAsText(file, encoding);
      }
    });
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  exportToCSV(data: string[][], columns: string[], filename: string = 'export.csv'): void {
    const csvContent = [
      columns.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  exportToJSON(data: string[][], columns: string[], filename: string = 'export.json'): void {
    const jsonData = data.map(row => {
      const obj: Record<string, string> = {};
      columns.forEach((col, index) => {
        obj[col] = row[index] || '';
      });
      return obj;
    });

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  validateData(data: string[][], columns: string[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty data
    if (data.length === 0) {
      errors.push('Keine Datenzeilen gefunden');
    }

    // Check column consistency
    data.forEach((row, index) => {
      if (row.length !== columns.length) {
        warnings.push(`Zeile ${index + 1}: Ungleiche Anzahl von Spalten (${row.length} statt ${columns.length})`);
      }
    });

    // Check for completely empty rows
    const emptyRows = data.filter(row => row.every(cell => !cell.trim())).length;
    if (emptyRows > 0) {
      warnings.push(`${emptyRows} leere Zeilen gefunden`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export const fileProcessor = new FileProcessor();
export type { ParsedFile, FileParseOptions };