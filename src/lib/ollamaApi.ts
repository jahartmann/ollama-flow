
// Update Ollama API to use CORS proxy
import { corsProxy } from './corsProxy';

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
      console.log('Testing Ollama connection via CORS proxy to:', this.baseUrl);
      return await corsProxy.testConnection(this.baseUrl);
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async getModels(): Promise<OllamaModel[]> {
    try {
      console.log('Fetching models via CORS proxy from:', `${this.baseUrl}/api/tags`);
      
      const response = await corsProxy.makeRequest(`${this.baseUrl}/api/tags`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Models response:', data);

      if (!data.models || !Array.isArray(data.models)) {
        console.warn('No models found in response');
        return [];
      }

      return data.models.map((model: any) => ({
        name: model.name,
        size: this.formatBytes(model.size || 0),
        modified: new Date(model.modified_at).toLocaleDateString('de-DE'),
        digest: model.digest || model.id || ''
      }));
    } catch (error) {
      console.error('Failed to fetch models:', error);
      throw error;
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

  async processDataTransformation(data: string[][], prompt: string, headers?: string[]): Promise<{ 
    transformedData: string[][], 
    explanation: string,
    suggestedHeaders?: string[]
  }> {
    const dataPreview = data.slice(0, 10);
    const headerInfo = headers ? `Headers: ${headers.join(', ')}` : 'No headers provided';
    
    const systemPrompt = `Du bist ein intelligenter CSV-Datenanalyst. Analysiere die bereitgestellten CSV-Daten und führe die gewünschte Transformation durch.

WICHTIG: Du sollst echte, praktische Transformationen durchführen, nicht nur Vorschläge machen.

Verfügbare Transformationen:
- Neue Spalten erstellen (z.B. Vollname aus Vor-/Nachname)
- Daten bereinigen (z.B. Formatierung, Entfernung von Sonderzeichen)
- Daten filtern (z.B. nur bestimmte Einträge behalten)
- Daten umstrukturieren oder konvertieren
- Bedingte Transformationen (z.B. Kategorisierung basierend auf Werten)

Gib eine strukturierte Antwort im JSON-Format zurück:
{
  "transformation_steps": ["Schritt 1", "Schritt 2", ...],
  "explanation": "Detaillierte Erklärung der durchgeführten Transformationen",
  "success": true/false,
  "suggested_actions": ["weitere mögliche Verbesserungen"]
}`;

    const userPrompt = `${headerInfo}

CSV Datenvorschau (erste 10 Zeilen):
${dataPreview.map((row, i) => `Zeile ${i + 1}: ${row.join(' | ')}`).join('\n')}

Gewünschte Transformation: ${prompt}

Führe die Transformation durch und erkläre, was du gemacht hast.`;

    try {
      const response = await this.generateCompletion(userPrompt, systemPrompt);
      
      // Try to parse JSON response
      let analysisResult;
      try {
        // Extract JSON from response if it's wrapped in text
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback to plain text response
          analysisResult = {
            explanation: response,
            transformation_steps: ["KI-Analyse durchgeführt"],
            success: true,
            suggested_actions: []
          };
        }
      } catch (parseError) {
        analysisResult = {
          explanation: response,
          transformation_steps: ["KI-Analyse durchgeführt"],
          success: true,
          suggested_actions: []
        };
      }

      // For now, return original data with AI explanation
      // In a more advanced implementation, we would actually transform the data based on the AI analysis
      return {
        transformedData: data,
        explanation: analysisResult.explanation || response,
        suggestedHeaders: headers
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
