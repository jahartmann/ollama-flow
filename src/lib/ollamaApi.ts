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
      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async getModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to fetch models');
      
      const data = await response.json();
      return data.models?.map((model: any) => ({
        name: model.name,
        size: this.formatBytes(model.size),
        modified: new Date(model.modified_at).toLocaleDateString('de-DE'),
        digest: model.digest
      })) || [];
    } catch (error) {
      console.error('Failed to fetch models:', error);
      throw error;
    }
  }

  async generateCompletion(prompt: string, context?: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.selectedModel,
          prompt: context ? `${context}\n\n${prompt}` : prompt,
          stream: false,
          options: {
            temperature: this.config.temperature,
            top_p: this.config.topP,
            num_predict: this.config.maxTokens,
            repeat_penalty: this.config.repeatPenalty
          }
        })
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      console.error('Generation failed:', error);
      throw error;
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

    const response = await this.generateCompletion('', dataContext);
    
    // Parse AI response and apply transformations
    // This would need actual data processing logic
    return {
      transformedData: data, // Placeholder - would implement actual transformation
      explanation: response
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const ollamaAPI = new OllamaAPI();
export type { OllamaModel, OllamaConfig };