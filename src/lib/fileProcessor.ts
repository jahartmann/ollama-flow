import Papa from 'papaparse';
import { CSVFile } from './transformationEngine';

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
  // Convert File to CSVFile format with delimiter detection
  async processFile(file: File, delimiter?: string): Promise<CSVFile> {
    console.log('=== PROCESSING FILE ===');
    console.log('File name:', file.name);
    console.log('Provided delimiter:', delimiter);
    
    // Auto-detect delimiter if not provided
    const detectedDelimiter = delimiter || await this.detectDelimiter(file);
    console.log('Using delimiter:', detectedDelimiter);
    
    // Force semicolon for template files or files with semicolon in name
    const finalDelimiter = file.name.includes('template') || detectedDelimiter === ';' ? ';' : detectedDelimiter;
    console.log('Final delimiter to use:', finalDelimiter);
    
    const parseResult = await this.parseCSV(file, { 
      delimiter: finalDelimiter,
      hasHeaders: true,
      skipEmptyLines: true 
    });
    
    console.log('Parse result headers count:', parseResult.headers.length);
    console.log('Parse result headers:', parseResult.headers);
    
    const csvFile = {
      id: `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: parseResult.filename,
      headers: parseResult.headers,
      data: parseResult.data,
      rowCount: parseResult.data.length,
      delimiter: finalDelimiter
    };
    
    console.log('Created CSV file object:', csvFile);
    console.log('=== END PROCESSING FILE ===');
    
    return csvFile;
  }

  async parseCSV(file: File, options: ParseOptions = {}): Promise<CSVParseResult> {
    return new Promise((resolve, reject) => {
      console.log('=== CSV PARSING DEBUG ===');
      console.log('File:', file.name);
      console.log('Options:', options);
      
        Papa.parse(file, {
          complete: (results) => {
            console.log('Papa.parse results:', results);
            console.log('Raw data sample:', results.data.slice(0, 2));
            console.log('Used delimiter in Papa.parse:', options.delimiter);
            
            const data = results.data as string[][];
            const errors = results.errors.map(err => err.message);
            
            console.log('Parsed data length:', data.length);
            console.log('First row:', data[0]);
            console.log('First row length:', data[0]?.length);
            
            // If we still have only 1 column and delimiter is semicolon, force split
            if (data[0]?.length === 1 && options.delimiter === ';' && data[0][0]?.includes(';')) {
              console.log('Forcing semicolon split because Papa.parse failed');
              const forcedData = data.map(row => row[0]?.split(';') || []);
              console.log('Forced split first row:', forcedData[0]);
              
              // Use the forced split data
              const filteredData = forcedData.filter(row => row.some(cell => cell && cell.trim() !== ''));
              
              let headers: string[] = [];
              let rows: string[][] = filteredData;
              
              if (options.hasHeaders !== false && filteredData.length > 0) {
                headers = filteredData[0].map(h => h.trim());
                rows = filteredData.slice(1);
              } else {
                const columnCount = filteredData[0]?.length || 0;
                headers = Array.from({ length: columnCount }, (_, i) => 
                  String.fromCharCode(65 + i)
                );
              }
              
              console.log('Forced headers:', headers);
              console.log('Forced headers count:', headers.length);
              
              const result: CSVParseResult = {
                data: rows,
                headers,
                errors,
                filename: file.name,
                rowCount: rows.length,
                columnCount: headers.length
              };
              
              console.log('Forced CSV result:', result);
              resolve(result);
              return;
            }
            
            // Normal processing continues...
            
            // Filter out empty rows
            const filteredData = options.skipEmptyLines !== false 
              ? data.filter(row => row.some(cell => cell && cell.trim() !== ''))
              : data;
              
            console.log('Filtered data length:', filteredData.length);
            console.log('First filtered row:', filteredData[0]);
              
            // Extract headers if specified
            let headers: string[] = [];
            let rows: string[][] = filteredData;
            
            if (options.hasHeaders !== false && filteredData.length > 0) {
              headers = filteredData[0].map(h => (h || '').trim());
              rows = filteredData.slice(1);
            } else {
              // Generate column names like Excel: A, B, C, etc.
              const columnCount = filteredData[0]?.length || 0;
              headers = Array.from({ length: columnCount }, (_, i) => 
                String.fromCharCode(65 + i) // A, B, C, D...
              );
            }

            console.log('Final headers:', headers);
            console.log('Headers count:', headers.length);
            console.log('Sample row data:', rows[0]);

            const result: CSVParseResult = {
              data: rows,
              headers,
              errors,
              filename: file.name,
              rowCount: rows.length,
              columnCount: headers.length
            };

            console.log('Final CSV result:', result);
            console.log('=== END CSV PARSING DEBUG ===');
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

  // Auto-detect delimiter with improved logic for semicolon detection
  detectDelimiter(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const sample = (e.target?.result as string)?.slice(0, 2000) || '';
        
        // Check for BOM and remove it
        const cleanSample = sample.replace(/^\uFEFF/, '');
        
        const delimiters = [';', ',', '\t', '|'];
        let bestDelimiter = ';'; // Default to semicolon for European CSVs
        let maxScore = 0;

        delimiters.forEach(delimiter => {
          const lines = cleanSample.split('\n').filter(line => line.trim()).slice(0, 5);
          if (lines.length < 1) return;
          
          const columnCounts = lines.map(line => line.split(delimiter).length);
          const avgColumns = columnCounts.reduce((a, b) => a + b, 0) / columnCounts.length;
          
          // Calculate consistency (how uniform the column counts are)
          const maxCols = Math.max(...columnCounts);
          const minCols = Math.min(...columnCounts);
          const consistency = maxCols > 0 ? 1 - (maxCols - minCols) / maxCols : 0;
          
          // Bonus for semicolon (European standard)
          const bonus = delimiter === ';' ? 1.2 : 1.0;
          
          // Score based on number of columns, consistency, and delimiter preference
          const score = avgColumns * consistency * bonus;
          
          console.log(`Delimiter '${delimiter}': avg columns=${avgColumns}, consistency=${consistency}, score=${score}`);
          
          if (score > maxScore && avgColumns > 1) {
            maxScore = score;
            bestDelimiter = delimiter;
          }
        });

        console.log('Best detected delimiter:', bestDelimiter);
        resolve(bestDelimiter);
      };
      reader.readAsText(file.slice(0, 2000), 'UTF-8');
    });
  }

  // Export data as CSV with customizable delimiter
  exportAsCSV(data: string[][], headers: string[], filename: string = 'exported_data.csv', delimiter: string = ','): void {
    const csvContent = Papa.unparse({
      fields: headers,
      data: data
    }, {
      delimiter: delimiter
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