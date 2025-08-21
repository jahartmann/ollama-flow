import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings as SettingsIcon,
  Server,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  ExternalLink,
  Brain,
  Sliders,
  Info,
  Download
} from 'lucide-react';
import { ollamaAPI, type OllamaConfig, type OllamaModel } from '@/lib/ollamaApi';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const [config, setConfig] = useState<OllamaConfig>(ollamaAPI.getConfig());
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [lastConnectionTest, setLastConnectionTest] = useState<Date | null>(null);
  const [connectionError, setConnectionError] = useState<string>('');
  const [detailedError, setDetailedError] = useState<string>('');
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    const savedConfig = ollamaAPI.getConfig();
    setConfig(savedConfig);
    
    // Auto-test connection if we have a URL configured
    if (savedConfig.serverUrl && savedConfig.port) {
      testConnection();
    }
  }, []);

  // Enhanced connection test with better error handling
  const testConnection = useCallback(async () => {
    setConnectionStatus('testing');
    setConnectionError('');
    setDetailedError('');
    
    try {
      // Save current config first
      ollamaAPI.saveConfig(config);
      
      const isConnected = await ollamaAPI.testConnection();
      
      if (isConnected) {
        setConnectionStatus('connected');
        setLastConnectionTest(new Date());
        toast({
          title: "Verbindung erfolgreich",
          description: "Ollama ist erreichbar und bereit"
        });
        
        // Auto-load models after successful connection
        await loadModels();
      } else {
        setConnectionStatus('failed');
        
        // Get detailed connection help
        const help = ollamaAPI.getConnectionHelp();
        setConnectionError('Verbindung zu Ollama fehlgeschlagen');
        setDetailedError(`Häufige Probleme:\n• ${help.commonIssues.join('\n• ')}\n\nLösungsvorschläge:\n• ${help.solutions.join('\n• ')}`);
        
        toast({
          title: "Verbindung fehlgeschlagen",
          description: "Überprüfen Sie die Einstellungen und starten Sie Ollama",
          variant: "destructive"
        });
      }
    } catch (error) {
      setConnectionStatus('failed');
      const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setConnectionError(errorMsg);
      
      // Check for specific error types
      if (errorMsg.includes('CORS') || errorMsg.includes('fetch')) {
        setDetailedError(`CORS-Fehler erkannt:
        
• Ihr Browser blockiert die Anfrage an Ollama
• Starten Sie Ollama mit CORS-Unterstützung:
  OLLAMA_ORIGINS=* ollama serve
• Oder verwenden Sie eine Browser-Erweiterung für CORS
• Bei Docker: Stellen Sie sicher, dass Port 11434 exponiert ist`);
      }
      
      toast({
        title: "Verbindungsfehler",
        description: errorMsg,
        variant: "destructive"
      });
    }
  }, [config, toast]);

  // Load available models
  const loadModels = useCallback(async () => {
    if (connectionStatus !== 'connected') {
      toast({
        title: "Keine Verbindung",
        description: "Stellen Sie zuerst eine Verbindung zu Ollama her",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingModels(true);
    try {
      const availableModels = await ollamaAPI.getModels();
      setModels(availableModels);
      
      toast({
        title: "Modelle geladen",
        description: `${availableModels.length} verfügbare Modelle gefunden`
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Fehler beim Laden der Modelle';
      toast({
        title: "Fehler beim Laden der Modelle",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsLoadingModels(false);
    }
  }, [connectionStatus, toast]);

  // Save configuration
  const saveConfig = useCallback(() => {
    ollamaAPI.saveConfig(config);
    toast({
      title: "Einstellungen gespeichert",
      description: "Ihre Ollama-Konfiguration wurde gespeichert"
    });
  }, [config, toast]);

  // Update config fields
  const updateConfig = useCallback((field: keyof OllamaConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  // Get connection status badge
  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'testing':
        return (
          <Badge variant="outline" className="animate-pulse">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Verbinde...
          </Badge>
        );
      case 'connected':
        return (
          <Badge variant="outline" className="text-success border-success">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verbunden
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Fehler
          </Badge>
        );
      default:
        return null;
    }
  };

  // Common Ollama URLs for quick selection
  const commonUrls = [
    { label: 'Lokal (Standard)', url: 'http://localhost', port: '11434' },
    { label: 'Lokal (Alternative)', url: 'http://127.0.0.1', port: '11434' },
    { label: 'Docker', url: 'http://ollama', port: '11434' },
    { label: 'Custom', url: '', port: '' }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-data bg-clip-text text-transparent">
          Einstellungen
        </h1>
        <p className="text-lg text-muted-foreground">
          Konfigurieren Sie Ollama und andere System-Einstellungen
        </p>
      </div>

      <Tabs defaultValue="ollama" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ollama">
            <Brain className="w-4 h-4 mr-2" />
            Ollama KI
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Sliders className="w-4 h-4 mr-2" />
            Erweitert
          </TabsTrigger>
          <TabsTrigger value="about">
            <Info className="w-4 h-4 mr-2" />
            Info
          </TabsTrigger>
        </TabsList>

        {/* Ollama Settings */}
        <TabsContent value="ollama">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connection Settings */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Ollama Verbindung
                  </div>
                  {getConnectionBadge()}
                </CardTitle>
                <CardDescription>
                  Konfigurieren Sie die Verbindung zu Ihrem Ollama Server
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick URL Selection */}
                <div>
                  <Label>Schnellauswahl</Label>
                  <Select 
                    value={`${config.serverUrl}:${config.port}`}
                    onValueChange={(value) => {
                      const preset = commonUrls.find(u => `${u.url}:${u.port}` === value);
                      if (preset && preset.url) {
                        updateConfig('serverUrl', preset.url);
                        updateConfig('port', preset.port);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wählen Sie eine Konfiguration" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border shadow-lg z-50">
                      {commonUrls.map((preset, index) => (
                        <SelectItem key={index} value={`${preset.url}:${preset.port}`}>
                          {preset.label}
                          {preset.url && (
                            <span className="text-muted-foreground ml-2">
                              {preset.url}:{preset.port}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Manual Configuration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Server URL</Label>
                    <Input
                      value={config.serverUrl}
                      onChange={(e) => updateConfig('serverUrl', e.target.value)}
                      placeholder="http://localhost"
                    />
                  </div>
                  <div>
                    <Label>Port</Label>
                    <Input
                      value={config.port}
                      onChange={(e) => updateConfig('port', e.target.value)}
                      placeholder="11434"
                    />
                  </div>
                </div>

                {/* Enhanced Connection Status */}
                {lastConnectionTest && connectionStatus === 'connected' && (
                  <Alert>
                    <CheckCircle2 className="w-4 h-4" />
                    <AlertDescription>
                      Erfolgreich verbunden seit {lastConnectionTest.toLocaleTimeString('de-DE')}
                    </AlertDescription>
                  </Alert>
                )}

                {connectionError && connectionStatus === 'failed' && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">{connectionError}</p>
                        {detailedError && (
                          <details className="text-sm">
                            <summary className="cursor-pointer hover:underline">Detaillierte Hilfe anzeigen</summary>
                            <pre className="mt-2 whitespace-pre-wrap text-xs bg-muted p-2 rounded">
                              {detailedError}
                            </pre>
                          </details>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    onClick={testConnection}
                    disabled={connectionStatus === 'testing'}
                    className="flex-1"
                  >
                    {connectionStatus === 'testing' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Teste Verbindung...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Verbindung testen
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={saveConfig}>
                    Speichern
                  </Button>
                </div>

                {/* Enhanced Help Section */}
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium">💡 Ollama Setup:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Installieren Sie Ollama von <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ollama.ai</a></li>
                    <li>Starten Sie Ollama: <code className="bg-muted px-1 rounded">ollama serve</code></li>
                    <li>Für CORS: <code className="bg-muted px-1 rounded">OLLAMA_ORIGINS=* ollama serve</code></li>
                    <li>Laden Sie ein Modell: <code className="bg-muted px-1 rounded">ollama pull llama2</code></li>
                  </ol>
                  
                  <div className="mt-3 p-2 bg-muted/50 rounded text-xs">
                    <p className="font-medium mb-1">🔧 Troubleshooting:</p>
                    <p>Bei Verbindungsproblemen testen Sie: <a 
                      href={`${config.serverUrl}:${config.port}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline"
                    >
                      {config.serverUrl}:{config.port}
                    </a></p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Model Management */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    KI-Modelle ({models.length})
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={loadModels}
                    disabled={isLoadingModels || connectionStatus !== 'connected'}
                  >
                    {isLoadingModels ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                </CardTitle>
                <CardDescription>
                  Wählen Sie das zu verwendende KI-Modell aus
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectionStatus !== 'connected' ? (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      Stellen Sie zuerst eine Verbindung zu Ollama her, um Modelle zu laden.
                    </AlertDescription>
                  </Alert>
                ) : models.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Keine Modelle gefunden</p>
                    <p className="text-sm mt-1">Laden Sie Modelle mit <code className="bg-muted px-1 rounded">ollama pull [model]</code></p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {models.map((model) => (
                      <div 
                        key={model.name} 
                        className={`p-3 border rounded cursor-pointer transition-colors ${
                          config.selectedModel === model.name 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => updateConfig('selectedModel', model.name)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{model.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {model.size} • Geändert: {model.modified}
                            </div>
                          </div>
                          {config.selectedModel === model.name && (
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Popular Models Info */}
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-medium">📋 Beliebte Modelle:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <code className="bg-muted px-1 rounded">llama2</code>
                    <code className="bg-muted px-1 rounded">codellama</code>
                    <code className="bg-muted px-1 rounded">mistral</code>
                    <code className="bg-muted px-1 rounded">llama2:13b</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                Erweiterte KI-Parameter
              </CardTitle>
              <CardDescription>
                Feinabstimmung der KI-Generierung (nur für erfahrene Benutzer)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Temperatur</Label>
                  <Badge variant="outline">{config.temperature}</Badge>
                </div>
                <Slider
                  value={[config.temperature]}
                  onValueChange={(value) => updateConfig('temperature', value[0])}
                  max={2}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Niedrigere Werte = konsistenter, höhere Werte = kreativer
                </p>
              </div>

              {/* Top P */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Top P</Label>
                  <Badge variant="outline">{config.topP}</Badge>
                </div>
                <Slider
                  value={[config.topP]}
                  onValueChange={(value) => updateConfig('topP', value[0])}
                  max={1}
                  min={0.1}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Nucleus Sampling - begrenzt die Auswahl der nächsten Tokens
                </p>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Max Tokens</Label>
                  <Badge variant="outline">{config.maxTokens}</Badge>
                </div>
                <Slider
                  value={[config.maxTokens]}
                  onValueChange={(value) => updateConfig('maxTokens', value[0])}
                  max={4096}
                  min={256}
                  step={256}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Maximale Anzahl generierter Tokens pro Antwort
                </p>
              </div>

              {/* Repeat Penalty */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Wiederholungsstrafe</Label>
                  <Badge variant="outline">{config.repeatPenalty}</Badge>
                </div>
                <Slider
                  value={[config.repeatPenalty]}
                  onValueChange={(value) => updateConfig('repeatPenalty', value[0])}
                  max={2}
                  min={0.5}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Reduziert Wiederholungen in der generierten Ausgabe
                </p>
              </div>

              <Button onClick={saveConfig} className="w-full">
                Erweiterte Einstellungen speichern
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Über CSV Transformer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto">
                  <SettingsIcon className="w-8 h-8 text-white" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold">CSV Transformer</h3>
                  <p className="text-muted-foreground">Version 1.0.0</p>
                </div>

                <div className="max-w-md mx-auto text-sm text-muted-foreground space-y-2">
                  <p>
                    Ein leistungsstarkes Tool für die Transformation von CSV-Daten 
                    mit wiederverwendbaren Rezepten und KI-Unterstützung.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    <Badge variant="outline">React</Badge>
                    <Badge variant="outline">TypeScript</Badge>
                    <Badge variant="outline">Tailwind CSS</Badge>
                    <Badge variant="outline">Ollama</Badge>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ollama Website
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://github.com/ollama/ollama" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ollama GitHub
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
