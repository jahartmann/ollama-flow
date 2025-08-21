import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, MessageSquare, Lightbulb, Database } from 'lucide-react';
import AIAgent from '@/components/AIAgent';

const AIChat = () => {
  const handleAIResult = (result: string) => {
    console.log('AI Result:', result);
  };

  const useCases = [
    {
      title: "Datenanalyse",
      description: "Lassen Sie die KI Ihre CSV-Daten analysieren und Insights generieren",
      icon: <Database className="w-5 h-5" />,
      prompt: "Analysiere meine CSV-Daten und gib mir wichtige Erkenntnisse und Trends."
    },
    {
      title: "Transformationsideen",
      description: "Erhalten Sie Vorschläge für Datenbereinigung und -transformation",
      icon: <Lightbulb className="w-5 h-5" />,
      prompt: "Schlage mir nützliche Transformationen für meine Daten vor, um sie zu bereinigen und zu verbessern."
    },
    {
      title: "Automatisierung",
      description: "Automatisieren Sie wiederkehrende Datenverarbeitungsaufgaben",
      icon: <Brain className="w-5 h-5" />,
      prompt: "Wie kann ich meine Datenverarbeitung automatisieren und effizienter gestalten?"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          KI-Assistant
        </h1>
        <p className="text-muted-foreground">
          Ihr intelligenter Helfer für Datenverarbeitung und -analyse
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Use Cases */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Anwendungsfälle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {useCases.map((useCase, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        {useCase.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-sm mb-1">{useCase.title}</h3>
                        <p className="text-xs text-muted-foreground">{useCase.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">💡 Tipps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Seien Sie so spezifisch wie möglich in Ihren Anfragen</p>
              <p>• Beschreiben Sie Ihre Daten und gewünschten Ergebnisse</p>
              <p>• Die KI kann CSV-Strukturen analysieren und Transformationen vorschlagen</p>
              <p>• Nutzen Sie Folgefragen für tiefere Einblicke</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Chat Interface */}
        <div className="lg:col-span-2">
          <AIAgent
            title="KI-Datenassistent"
            description="Stellen Sie Fragen zu Ihren Daten oder bitten Sie um Hilfe bei der Transformation"
            placeholder="Fragen Sie mich alles über Ihre Daten... z.B. 'Wie kann ich doppelte Einträge entfernen?' oder 'Welche Spalten sollte ich für eine Analyse verwenden?'"
            onResult={handleAIResult}
            showContext={false}
            className="h-fit"
          />
        </div>
      </div>

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🎯 Was kann ich für Sie tun?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• <strong>Datenanalyse:</strong> Analysiere CSV-Inhalte und identifiziere Muster</p>
            <p>• <strong>Transformationsvorschläge:</strong> Empfehle Bereinigungen und Umstrukturierungen</p>
            <p>• <strong>Formelgenerierung:</strong> Erstelle Formeln für neue Spalten</p>
            <p>• <strong>Qualitätsprüfung:</strong> Identifiziere Datenfehler und Inkonsistenzen</p>
            <p>• <strong>Automatisierung:</strong> Schlage Workflows für wiederkehrende Aufgaben vor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">⚙️ Technische Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• <strong>Lokale KI:</strong> Ollama läuft lokal auf Ihrem Computer</p>
            <p>• <strong>Datenschutz:</strong> Ihre Daten verlassen niemals Ihr System</p>
            <p>• <strong>Modelle:</strong> Unterstützt verschiedene LLM-Modelle</p>
            <p>• <strong>Kontextbewusst:</strong> Versteht CSV-Strukturen und -Inhalte</p>
            <p>• <strong>Interaktiv:</strong> Kontinuierliche Unterhaltung möglich</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIChat;