import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Sparkles, MessageSquare, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { ollamaAPI } from '@/lib/ollamaApi';
import { useToast } from '@/hooks/use-toast';

interface AIAgentProps {
  context?: string;
  placeholder?: string;
  title?: string;
  description?: string;
  onResult?: (result: string) => void;
  showContext?: boolean;
  className?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
}

const AIAgent: React.FC<AIAgentProps> = ({
  context,
  placeholder = "Stellen Sie mir eine Frage oder bitten Sie mich um Hilfe...",
  title = "KI-Assistent",
  description = "Ihr intelligenter Helfer für Ihre Aufgaben",
  onResult,
  showContext = false,
  className = ""
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const { toast } = useToast();

  // Check AI connection status
  const checkConnection = useCallback(async () => {
    try {
      const isConnected = await ollamaAPI.testConnection();
      setConnectionStatus(isConnected ? 'connected' : 'error');
      return isConnected;
    } catch (error) {
      setConnectionStatus('error');
      return false;
    }
  }, []);

  // Handle AI conversation
  const handleSubmit = useCallback(async () => {
    if (!currentPrompt.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentPrompt,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentPrompt('');
    setIsProcessing(true);

    try {
      // Check connection first
      const isConnected = await checkConnection();
      if (!isConnected) {
        throw new Error('Keine Verbindung zur KI. Bitte überprüfen Sie Ihre Ollama-Einstellungen.');
      }

      // Generate AI response
      const aiResponse = await ollamaAPI.generateCompletion(currentPrompt, context);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      if (onResult) {
        onResult(aiResponse);
      }

      toast({
        title: "KI-Antwort erhalten",
        description: "Die KI hat erfolgreich auf Ihre Anfrage geantwortet"
      });

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: 'system',
        content: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: "KI-Fehler",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [currentPrompt, context, onResult, toast, checkConnection]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
    toast({
      title: "Unterhaltung gelöscht",
      description: "Die Konversation wurde zurückgesetzt"
    });
  }, [toast]);

  // Handle Enter key
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Get connection status badge
  const getConnectionBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge variant="default" className="bg-success text-success-foreground">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verbunden
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Loader className="w-3 h-3 mr-1 animate-spin" />
            Prüfung...
          </Badge>
        );
    }
  };

  // Initialize connection check
  React.useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return (
    <Card className={`shadow-elegant ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            {title}
          </div>
          {getConnectionBadge()}
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Context Display */}
        {showContext && context && (
          <Alert>
            <MessageSquare className="w-4 h-4" />
            <AlertDescription>
              <strong>Kontext:</strong> {context.substring(0, 200)}
              {context.length > 200 && '...'}
            </AlertDescription>
          </Alert>
        )}

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto p-4 bg-muted/30 rounded-lg">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.type === 'ai'
                      ? 'bg-card text-card-foreground border'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.type === 'ai' && (
                      <Brain className="w-4 h-4 mt-0.5 text-primary" />
                    )}
                    {message.type === 'system' && (
                      <AlertCircle className="w-4 h-4 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString('de-DE')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="space-y-3">
          <Textarea
            value={currentPrompt}
            onChange={(e) => setCurrentPrompt(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="min-h-[100px] resize-none"
            disabled={isProcessing || connectionStatus === 'error'}
          />

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {messages.length > 0 && (
                <Button
                  onClick={clearConversation}
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                >
                  Löschen
                </Button>
              )}
              <Button
                onClick={checkConnection}
                variant="ghost"
                size="sm"
                disabled={isProcessing}
              >
                Status prüfen
              </Button>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!currentPrompt.trim() || isProcessing || connectionStatus === 'error'}
              className="px-6"
            >
              {isProcessing ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  KI arbeitet...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Senden
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Connection Status Alert */}
        {connectionStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Keine Verbindung zur KI. Bitte überprüfen Sie Ihre Ollama-Einstellungen in den Systemeinstellungen.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default AIAgent;