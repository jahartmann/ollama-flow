
interface OllamaModel {
  name: string;
  size: string;
  modified: string;
  digest: string;
}

interface OllamaConfig {
  serverUrl: string;
  port: string;
  selectedModel: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  repeatPenalty: number;
}

class OllamaAPI {
  private config: OllamaConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): OllamaConfig {
    const stored = localStorage.getItem('ollama-config');
    return stored ? JSON.parse(stored) : {
      serverUrl: 'http://localhost',
      port: '11434',
      selectedModel: '',
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2048,
      repeatPenalty: 1.1
    };
  }

  saveConfig(config: OllamaConfig) {
    this.config = config;
    localStorage.setItem('ollama-config', JSON.stringify(config));
  }

  getConfig(): OllamaConfig {
    return this.config;
  }

  private get baseUrl(): string {
    return `${this.config.serverUrl}:${this.config.port}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Ollama connection to:', this.baseUrl);
      
      // Create a more robust request with proper CORS handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const requestOptions: RequestInit = {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal,
        mode: 'cors', // Explicit CORS mode
        credentials: 'omit' // Don't send credentials for CORS
      };

      let response: Response;
      try {
        // Try version endpoint first
        response = await fetch(`${this.baseUrl}/api/version`, requestOptions);
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Ollama version:', data);
          return true;
        }
      } catch (versionError) {
        console.log('Version endpoint failed, trying tags:', versionError);
      }

      // If version fails, try tags endpoint
      try {
        const tagsController = new AbortController();
        const tagsTimeoutId = setTimeout(() => tagsController.abort(), 15000);
        
        response = await fetch(`${this.baseUrl}/api/tags`, {
          ...requestOptions,
          signal: tagsController.signal
        });
        
        clearTimeout(tagsTimeoutId);
        
        if (response.ok) {
          console.log('Tags endpoint successful');
          return true;
        }
      } catch (tagsError) {
        console.log('Tags endpoint also failed:', tagsError);
      }

      // If both fail, try a simple ping
      try {
        const pingController = new AbortController();
        const pingTimeoutId = setTimeout(() => pingController.abort(), 10000);
        
        response = await fetch(`${this.baseUrl}/`, {
          ...requestOptions,
          signal: pingController.signal
        });
        
        clearTimeout(pingTimeoutId);
        
        // Even a 404 or other status code means the server is running
        console.log('Ping response status:', response.status);
        return response.status !== 0; // 0 means network error
      } catch (pingError) {
        console.log('Ping failed:', pingError);
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Connection test completely failed:', error);
      
      // Check if it's a CORS error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('CORS or network error detected. Make sure Ollama is running and accessible.');
      }
      
      return false;
    }
  }

  async getModels(): Promise<OllamaModel[]> {
    try {
      console.log('Fetching models from:', `${this.baseUrl}/api/tags`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      });
      
      clearTimeout(timeoutId);
      console.log('Models response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Models fetch error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Raw models data:', data);
      
      if (!data.models || !Array.isArray(data.models)) {
        console.warn('Unexpected response format, models array not found:', data);
        throw new Error('Invalid response format from Ollama API');
      }

      const models = data.models.map((model: any) => ({
        name: model.name || 'Unknown',
        size: typeof model.size === 'number' ? this.formatBytes(model.size) : (model.size || 'Unknown'),
        modified: model.modified_at ? new Date(model.modified_at).toLocaleDateString('de-DE') : 'Unknown',
        digest: model.digest || model.id || ''
      }));

      console.log('Processed models:', models);
      return models;
    } catch (error) {
      console.error('Failed to fetch models:', error);
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Netzwerk-Fehler: Überprüfen Sie die Ollama-Verbindung und CORS-Einstellungen');
      } else if (error instanceof Error) {
        throw new Error(`API-Fehler: ${error.message}`);
      } else {
        throw new Error('Unbekannter Fehler beim Laden der Modelle');
      }
    }
  }

  async generateCompletion(prompt: string, context?: string): Promise<string> {
    try {
      if (!this.config.selectedModel) {
        throw new Error('Kein Modell ausgewählt. Wählen Sie ein Modell in den Einstellungen.');
      }

      console.log('Generating completion with model:', this.config.selectedModel);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for generation

      const requestBody = {
        model: this.config.selectedModel,
        prompt: context ? `${context}\n\n${prompt}` : prompt,
        stream: false,
        options: {
          temperature: this.config.temperature,
          top_p: this.config.topP,
          num_predict: this.config.maxTokens,
          repeat_penalty: this.config.repeatPenalty
        }
      };

      console.log('Generation request:', requestBody);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify(requestBody)
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('Generation error response:', errorText);
        throw new Error(`Generation fehlgeschlagen (HTTP ${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('Generation response:', data);
      
      if (!data.response) {
        console.warn('No response field in generation result:', data);
        throw new Error('Leere Antwort von Ollama erhalten');
      }

      return data.response;
    } catch (error) {
      console.error('Generation failed:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Netzwerk-Fehler: Überprüfen Sie die Ollama-Verbindung');
      } else if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Unbekannter Fehler bei der Text-Generierung');
      }
    }
  }

  async processDataTransformation(data: string[][], prompt: string): Promise<{ 
    transformedData: string[][], 
    explanation: string 
  }> {
    const dataContext = `CSV Data Preview (first 5 rows):
${data.slice(0, 5).map(row => row.join(',')).join('\n')}

Task: ${prompt}

Please provide:
1. Specific transformation steps
2. Expected output format
3. Any data validation concerns

Format your response as JSON with keys: "steps", "outputFormat", "concerns"`;

    try {
      const response = await this.generateCompletion(prompt, dataContext);
      
      // Parse AI response and apply transformations
      // This would need actual data processing logic
      return {
        transformedData: data, // Placeholder - would implement actual transformation
        explanation: response
      };
    } catch (error) {
      throw new Error(`KI-Transformation fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  // Check if Ollama is properly configured and accessible
  async validateSetup(): Promise<{ 
    isValid: boolean; 
    issues: string[]; 
    suggestions: string[] 
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check configuration
    if (!this.config.serverUrl || !this.config.port) {
      issues.push('Server-URL oder Port nicht konfiguriert');
      suggestions.push('Konfigurieren Sie Server-URL und Port in den Einstellungen');
    }

    // Check connection
    try {
      const isConnected = await this.testConnection();
      if (!isConnected) {
        issues.push('Keine Verbindung zu Ollama möglich');
        suggestions.push('Stellen Sie sicher, dass Ollama läuft: ollama serve');
        suggestions.push('Überprüfen Sie die URL und den Port');
        suggestions.push('Bei CORS-Fehlern: Starten Sie Ollama mit CORS aktiviert');
      }
    } catch (error) {
      issues.push('Verbindungstest fehlgeschlagen');
      suggestions.push('Überprüfen Sie Ihre Netzwerkverbindung');
    }

    // Check models
    if (!this.config.selectedModel) {
      issues.push('Kein Modell ausgewählt');
      suggestions.push('Wählen Sie ein Modell in den Einstellungen aus');
      suggestions.push('Laden Sie ein Modell: ollama pull llama2');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Helper method to get detailed error information
  getConnectionHelp(): { 
    commonIssues: string[]; 
    solutions: string[] 
  } {
    return {
      commonIssues: [
        'CORS-Fehler im Browser',
        'Ollama läuft nicht',
        'Falsche URL oder Port',
        'Firewall blockiert Zugriff'
      ],
      solutions: [
        'Starten Sie Ollama: ollama serve',
        'Überprüfen Sie http://localhost:11434 im Browser',
        'Verwenden Sie korrekte IP-Adresse bei Remote-Zugriff',
        'Aktivieren Sie CORS in Ollama falls nötig'
      ]
    };
  }
}

export const ollamaAPI = new OllamaAPI();
export type { OllamaModel, OllamaConfig };
