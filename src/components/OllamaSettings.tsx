import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Brain,
  Server,
  Sliders
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

const OllamaSettings = () => {
  const [config, setConfig] = useState<OllamaConfig>({
    serverUrl: 'http://localhost',
    port: '11434',
    selectedModel: '',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2048,
    repeatPenalty: 1.1
  });

  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Mock data for demonstration
  const mockModels: OllamaModel[] = [
    {
      name: 'llama3.2:latest',
      size: '2.0 GB',
      modified: '2024-01-15',
      digest: 'abc123'
    },
    {
      name: 'mistral:7b',
      size: '4.1 GB', 
      modified: '2024-01-10',
      digest: 'def456'
    },
    {
      name: 'phi3:medium',
      size: '7.9 GB',
      modified: '2024-01-08',
      digest: 'ghi789'
    }
  ];

  const testConnection = async () => {
    setConnectionStatus('connecting');
    setErrorMessage('');
    
    try {
      // Mock API call - in real app would fetch from Ollama API
      const fullUrl = `${config.serverUrl}:${config.port}`;
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock success
      setConnectionStatus('connected');
      await loadModels();
      
    } catch (error) {
      setConnectionStatus('error');
      setErrorMessage('Verbindung fehlgeschlagen. Stellen Sie sicher, dass Ollama läuft und die URL korrekt ist.');
    }
  };

  const loadModels = async () => {
    if (connectionStatus !== 'connected') return;
    
    setIsLoadingModels(true);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAvailableModels(mockModels);
      
      if (mockModels.length > 0 && !config.selectedModel) {
        setConfig(prev => ({ ...prev, selectedModel: mockModels[0].name }));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Modelle:', error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleConfigChange = (field: keyof OllamaConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const resetToDefaults = () => {
    setConfig(prev => ({
      ...prev,
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2048,
      repeatPenalty: 1.1
    }));
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-success text-success-foreground';
      case 'connecting': return 'bg-warning text-warning-foreground';
      case 'error': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-data bg-clip-text text-transparent">
          Ollama Konfiguration
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Konfigurieren Sie die Verbindung zu Ihrem lokalen Ollama-Server und wählen Sie das gewünschte KI-Modell
        </p>
      </div>

      {/* Connection Settings */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Server-Verbindung
          </CardTitle>
          <CardDescription>
            Konfigurieren Sie die Verbindungsparameter für Ihren Ollama-Server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="server-url">Server URL</Label>
              <Input
                id="server-url"
                value={config.serverUrl}
                onChange={(e) => handleConfigChange('serverUrl', e.target.value)}
                placeholder="http://localhost"
              />
            </div>
            <div>
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                value={config.port}
                onChange={(e) => handleConfigChange('port', e.target.value)}
                placeholder="11434"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                onClick={testConnection}
                disabled={connectionStatus === 'connecting'}
                variant="outline"
                className="flex items-center gap-2"
              >
                {connectionStatus === 'connecting' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Verbinde...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Verbindung testen
                  </>
                )}
              </Button>

              <Badge className={getConnectionStatusColor()}>
                {connectionStatus === 'connected' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                {connectionStatus === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                {connectionStatus === 'connecting' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                
                {connectionStatus === 'connected' && 'Verbunden'}
                {connectionStatus === 'connecting' && 'Verbinde...'}
                {connectionStatus === 'error' && 'Fehler'}
                {connectionStatus === 'disconnected' && 'Nicht verbunden'}
              </Badge>
            </div>
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Verbindungsfehler</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Model Selection */}
      {connectionStatus === 'connected' && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Modell-Auswahl
            </CardTitle>
            <CardDescription>
              Wählen Sie das KI-Modell für Ihre Datenverarbeitungsaufgaben
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingModels ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                Lade verfügbare Modelle...
              </div>
            ) : availableModels.length > 0 ? (
              <>
                <div>
                  <Label>Aktives Modell</Label>
                  <Select
                    value={config.selectedModel}
                    onValueChange={(value) => handleConfigChange('selectedModel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Modell auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model.name} value={model.name}>
                          <div className="flex items-center justify-between w-full">
                            <span>{model.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {model.size}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {availableModels.map((model) => (
                    <Card 
                      key={model.name}
                      className={`cursor-pointer transition-smooth ${
                        model.name === config.selectedModel 
                          ? 'ring-2 ring-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleConfigChange('selectedModel', model.name)}
                    >
                      <CardContent className="p-4">
                        <div className="font-medium">{model.name}</div>
                        <div className="text-muted-foreground">{model.size}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Geändert: {model.modified}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Keine Modelle gefunden</AlertTitle>
                <AlertDescription>
                  Stellen Sie sicher, dass mindestens ein Ollama-Modell installiert ist.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Advanced Settings */}
      {connectionStatus === 'connected' && (
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="w-5 h-5" />
              Erweiterte Einstellungen
            </CardTitle>
            <CardDescription>
              Feinabstimmung der KI-Parameter für optimale Ergebnisse
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full"
            >
              {showAdvanced ? 'Erweiterte Optionen ausblenden' : 'Erweiterte Optionen anzeigen'}
            </Button>

            {showAdvanced && (
              <>
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Temperature: {config.temperature}</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Kontrolliert die Kreativität der Antworten (0.0 = deterministisch, 1.0 = kreativ)
                      </p>
                      <Slider
                        value={[config.temperature]}
                        onValueChange={([value]) => handleConfigChange('temperature', value)}
                        min={0}
                        max={1}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <Label>Top-p: {config.topP}</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Nucleus-Sampling (0.1 = konservativ, 1.0 = alle Optionen)
                      </p>
                      <Slider
                        value={[config.topP]}
                        onValueChange={([value]) => handleConfigChange('topP', value)}
                        min={0.1}
                        max={1}
                        step={0.1}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Max Tokens: {config.maxTokens}</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Maximale Länge der generierten Antwort
                      </p>
                      <Slider
                        value={[config.maxTokens]}
                        onValueChange={([value]) => handleConfigChange('maxTokens', value)}
                        min={256}
                        max={4096}
                        step={256}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <Label>Repeat Penalty: {config.repeatPenalty}</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Bestrafung für wiederholte Inhalte (1.0 = keine, 1.5 = stark)
                      </p>
                      <Slider
                        value={[config.repeatPenalty]}
                        onValueChange={([value]) => handleConfigChange('repeatPenalty', value)}
                        min={1.0}
                        max={1.5}
                        step={0.05}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={resetToDefaults}>
                    Standardwerte wiederherstellen
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OllamaSettings;