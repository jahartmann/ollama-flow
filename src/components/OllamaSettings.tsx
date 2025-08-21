import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Settings,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Brain,
  Server,
  Sliders,
  ChevronDown,
  Download
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ollamaAPI, type OllamaModel, type OllamaConfig } from '@/lib/ollamaApi';
import { useUpdateChecker } from '@/hooks/useUpdateChecker';


const OllamaSettings = () => {
  const [config, setConfig] = useState<OllamaConfig>(ollamaAPI.getConfig());
  const { updateInfo, isChecking, error: updateError, checkForUpdates, autoCheckEnabled, toggleAutoCheck } = useUpdateChecker();

  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');


  const testConnection = async () => {
    setConnectionStatus('connecting');
    setErrorMessage('');
    
    try {
      // Save config first
      ollamaAPI.saveConfig(config);
      
      console.log('Testing connection with config:', config);
      const isConnected = await ollamaAPI.testConnection();
      
      if (isConnected) {
        setConnectionStatus('connected');
        console.log('Connection successful, loading models...');
        await loadModels();
      } else {
        setConnectionStatus('error');
        setErrorMessage(`Verbindung zu ${config.serverUrl}:${config.port} fehlgeschlagen. Prüfen Sie:
        - Ollama läuft (ollama serve)
        - URL und Port sind korrekt
        - Keine Firewall blockiert den Zugriff`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionStatus('error');
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setErrorMessage('VerbindungTimeout. Ollama Server antwortet nicht.');
        } else if (error.message.includes('Failed to fetch')) {
          setErrorMessage('CORS-Fehler oder Server nicht erreichbar. Stellen Sie sicher, dass Ollama läuft und konfiguriert ist, CORS-Anfragen zu akzeptieren.');
        } else {
          setErrorMessage(`Verbindungsfehler: ${error.message}`);
        }
      } else {
        setErrorMessage('Unbekannter Verbindungsfehler');
      }
    }
  };

  const loadModels = async () => {
    setIsLoadingModels(true);
    
    try {
      const models = await ollamaAPI.getModels();
      setAvailableModels(models);
      
      if (models.length > 0 && !config.selectedModel) {
        const updatedConfig = { ...config, selectedModel: models[0].name };
        setConfig(updatedConfig);
        ollamaAPI.saveConfig(updatedConfig);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Modelle:', error);
      setErrorMessage(`Fehler beim Laden der Modelle: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleConfigChange = (field: keyof OllamaConfig, value: any) => {
    const updatedConfig = { ...config, [field]: value };
    setConfig(updatedConfig);
    ollamaAPI.saveConfig(updatedConfig);
  };

  const resetToDefaults = () => {
    const defaultConfig = {
      ...config,
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 2048,
      repeatPenalty: 1.1
    };
    setConfig(defaultConfig);
    ollamaAPI.saveConfig(defaultConfig);
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
    <div className="max-w-4xl mx-auto p-6 space-y-6 bg-background min-h-screen">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            LLM-Präferenz
          </h1>
          <p className="text-sm text-muted-foreground">
            Dies sind die Anmeldeinformationen und Einstellungen für Ihren bevorzugten LLM-Chat- und Einbettungsanbieter. Es ist wichtig, dass diese Schlüssel aktuell sind.
          </p>
        </div>

        {/* LLM Provider */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-foreground">LLM-Anbieter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-foreground rounded-full flex items-center justify-center">
                  <Brain className="w-4 h-4 text-background" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Ollama</div>
                  <div className="text-sm text-muted-foreground">Run LLMs locally on your own machine.</div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-foreground">Ollama Model</Label>
                  <Select
                    value={config.selectedModel}
                    onValueChange={(value) => handleConfigChange('selectedModel', value)}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Modell auswählen" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border shadow-lg z-50">
                      {availableModels.map((model) => (
                        <SelectItem key={model.name} value={model.name}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose the Ollama model you want to use for your conversations.
                  </p>
                </div>

                <div>
                  <Label className="text-sm text-foreground">Max Tokens</Label>
                  <Input
                    value={config.maxTokens}
                    onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value) || 2048)}
                    className="bg-background border-border"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum number of tokens for context and response.
                  </p>
                </div>
              </div>

              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                    <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    Hide advanced settings
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-foreground">Server URL</Label>
                      <Input
                        value={config.serverUrl}
                        onChange={(e) => handleConfigChange('serverUrl', e.target.value)}
                        placeholder="http://localhost"
                        className="bg-background border-border"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter the base URL where Ollama is running.
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm text-foreground">Port</Label>
                      <Input
                        value={config.port}
                        onChange={(e) => handleConfigChange('port', e.target.value)}
                        placeholder="11434"
                        className="bg-background border-border"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter the port number (usually 11434).
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-foreground">Performance Mode</Label>
                      <Select defaultValue="Maximum">
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border shadow-lg z-50">
                          <SelectItem value="Maximum">Maximum</SelectItem>
                          <SelectItem value="Balanced">Balanced</SelectItem>
                          <SelectItem value="Efficient">Efficient</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose the performance mode for the Ollama model.
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm text-foreground">Ollama Keep Alive</Label>
                      <Select defaultValue="Forever">
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border shadow-lg z-50">
                          <SelectItem value="Forever">Forever</SelectItem>
                          <SelectItem value="5m">5 Minutes</SelectItem>
                          <SelectItem value="10m">10 Minutes</SelectItem>
                          <SelectItem value="30m">30 Minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose how long Ollama should keep your model in memory before unloading.
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-foreground">Auth Token</Label>
                    <Input
                      type="password"
                      placeholder="Enter a Bearer Auth Token for interacting with your Ollama server."
                      className="bg-background border-border"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Used only if running Ollama behind an authentication server.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm text-foreground">Temperature: {config.temperature}</Label>
                      <Slider
                        value={[config.temperature]}
                        onValueChange={([value]) => handleConfigChange('temperature', value)}
                        min={0}
                        max={1}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-sm text-foreground">Top-p: {config.topP}</Label>
                      <Slider
                        value={[config.topP]}
                        onValueChange={([value]) => handleConfigChange('topP', value)}
                        min={0.1}
                        max={1}
                        step={0.1}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-sm text-foreground">Repeat Penalty: {config.repeatPenalty}</Label>
                      <Slider
                        value={[config.repeatPenalty]}
                        onValueChange={([value]) => handleConfigChange('repeatPenalty', value)}
                        min={1.0}
                        max={1.5}
                        step={0.05}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="flex items-center justify-between pt-4 border-t border-border">
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

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertTitle>Verbindungsfehler</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Update Settings */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-foreground">System Updates</CardTitle>
            <CardDescription>
              Verwalten Sie automatische Updates und Systemaktualisierungen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Automatische Update-Prüfung</div>
                <div className="text-sm text-muted-foreground">
                  Überprüfung auf neue Versionen beim Anwendungsstart
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAutoCheck(!autoCheckEnabled)}
              >
                {autoCheckEnabled ? 'Deaktivieren' : 'Aktivieren'}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Nach Updates suchen</div>
                <div className="text-sm text-muted-foreground">
                  Manuell nach verfügbaren Updates suchen und installieren
                </div>
              </div>
              <Button
                onClick={() => {
                  console.log('Update check button clicked');
                  checkForUpdates();
                }}
                disabled={isChecking}
                className="flex items-center gap-2"
              >
                {isChecking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Suche...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Jetzt prüfen
                  </>
                )}
              </Button>
            </div>

            {updateInfo?.available && (
              <Alert>
                <Download className="w-4 h-4" />
                <AlertTitle>Update verfügbar</AlertTitle>
                <AlertDescription>
                  Version {updateInfo.latestVersion} ist verfügbar. Aktuelle Version: {updateInfo.currentVersion}
                  <br />
                  <a 
                    href={updateInfo.releaseUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline mt-2 inline-block"
                  >
                    Release Notes anzeigen →
                  </a>
                </AlertDescription>
              </Alert>
            )}

            {updateError && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Update-Fehler</AlertTitle>
                <AlertDescription>{updateError}</AlertDescription>
              </Alert>
            )}

            {!updateInfo?.available && !updateError && !isChecking && (
              <Alert>
                <CheckCircle2 className="w-4 h-4" />
                <AlertTitle>Auf dem neuesten Stand</AlertTitle>
                <AlertDescription>
                  Ihre Anwendung ist bereits auf der neuesten Version.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Load models on connection */}
        {connectionStatus === 'connected' && availableModels.length === 0 && (
          <div className="text-center py-4">
            <Button onClick={loadModels} disabled={isLoadingModels}>
              {isLoadingModels ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Lade Modelle...
                </>
              ) : (
                'Modelle laden'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OllamaSettings;