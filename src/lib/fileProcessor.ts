import Papa from 'papaparse';

export interface CSVParseResult {
  data: string[][];
  headers: string[];
  errors: string[];
  filename: string;
  rowCount: number;
  columnCount: number;
}

export interface ParseOptions {
  delimiter?: string;
  encoding?: string;
  hasHeaders?: boolean;
  skipEmptyLines?: boolean;
}

class FileProcessor {
  async parseCSV(file: File, options: ParseOptions = {}): Promise<CSVParseResult> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          console.log('CSV parsing completed:', results);
          
          const data = results.data as string[][];
          const errors = results.errors.map(err => err.message);
          
          // Filter out empty rows
          const filteredData = options.skipEmptyLines !== false 
            ? data.filter(row => row.some(cell => cell && cell.trim() !== ''))
            : data;
            
          // Extract headers if specified
          let headers: string[] = [];
          let rows: string[][] = filteredData;
          
          if (options.hasHeaders !== false && filteredData.length > 0) {
            headers = filteredData[0];
            rows = filteredData.slice(1);
          } else {
            // Generate column names like Excel: A, B, C, etc.
            const columnCount = filteredData[0]?.length || 0;
            headers = Array.from({ length: columnCount }, (_, i) => 
              String.fromCharCode(65 + i) // A, B, C, D...
            );
          }

          const result: CSVParseResult = {
            data: rows,
            headers,
            errors,
            filename: file.name,
            rowCount: rows.length,
            columnCount: headers.length
          };

          console.log('Parsed CSV result:', result);
          resolve(result);
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
        header: false,
        delimiter: options.delimiter || '',
        skipEmptyLines: options.skipEmptyLines !== false,
        dynamicTyping: false,
        transformHeader: undefined
      });
    });
  }

  // Auto-detect delimiter
  detectDelimiter(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const sample = (e.target?.result as string)?.slice(0, 1000) || '';
        
        const delimiters = [',', ';', '\t', '|'];
        let bestDelimiter = ',';
        let maxColumns = 0;

        delimiters.forEach(delimiter => {
          const lines = sample.split('\n').slice(0, 3);
          const columnCounts = lines.map(line => line.split(delimiter).length);
          const avgColumns = columnCounts.reduce((a, b) => a + b, 0) / columnCounts.length;
          
          if (avgColumns > maxColumns) {
            maxColumns = avgColumns;
            bestDelimiter = delimiter;
          }
        });

        console.log('Detected delimiter:', bestDelimiter);
        resolve(bestDelimiter);
      };
      reader.readAsText(file.slice(0, 1000));
    });
  }

  // Export data as CSV
  exportAsCSV(data: string[][], headers: string[], filename: string = 'exported_data.csv'): void {
    const csvContent = Papa.unparse({
      fields: headers,
      data: data
    });

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
    }
  }

  // Get data statistics
  getDataStatistics(data: string[][], headers: string[]) {
    return {
      totalRows: data.length,
      totalColumns: headers.length,
      emptyRows: data.filter(row => row.every(cell => !cell || !cell.trim())).length,
      columnStats: headers.map((header, index) => {
        const columnData = data.map(row => row[index] || '');
        const nonEmpty = columnData.filter(cell => cell && cell.trim() !== '');
        
        return {
          name: header,
          totalValues: columnData.length,
          nonEmptyValues: nonEmpty.length,
          emptyValues: columnData.length - nonEmpty.length,
          uniqueValues: new Set(nonEmpty).size,
          sampleValues: [...new Set(nonEmpty)].slice(0, 5)
        };
      })
    };
  }
}

export const fileProcessor = new FileProcessor();
export default fileProcessor;