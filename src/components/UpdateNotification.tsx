import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download,
  ExternalLink,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface UpdateNotificationProps {
  updateInfo: {
    available: boolean;
    currentVersion: string;
    latestVersion: string;
    releaseNotes: string;
    downloadUrl: string;
    releaseUrl: string;
  };
  onDismiss: () => void;
  onInstall?: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  updateInfo,
  onDismiss,
  onInstall
}) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installComplete, setInstallComplete] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      // In a real application, this would trigger the actual update process
      // For now, we'll simulate the installation process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setInstallComplete(true);
      if (onInstall) {
        onInstall();
      }
      
      // In a real app, this would restart the application
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Update installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const parseReleaseNotes = (notes: string) => {
    // Simple markdown parsing for release notes
    return notes
      .split('\n')
      .filter(line => line.trim())
      .slice(0, 5) // Show first 5 lines
      .map(line => line.replace(/^[#*-]\s*/, ''));
  };

  if (!updateInfo.available) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-96">
      <Card className="shadow-elegant border-primary/20 bg-gradient-to-br from-background to-background/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Update verfügbar</CardTitle>
                <CardDescription>
                  Version {updateInfo.latestVersion} ist bereit
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Aktuelle Version: <Badge variant="outline">{updateInfo.currentVersion}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              Neue Version: <Badge className="bg-success text-success-foreground">{updateInfo.latestVersion}</Badge>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-2">Neuerungen:</h4>
            <div className="text-xs text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
              {parseReleaseNotes(updateInfo.releaseNotes).map((note, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>

          {installComplete ? (
            <Alert className="border-success bg-success/10">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <AlertTitle className="text-success">Installation erfolgreich</AlertTitle>
              <AlertDescription className="text-success/80">
                Die Anwendung wird in Kürze neu gestartet...
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1 bg-gradient-primary"
                size="sm"
              >
                {isInstalling ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                    Installiere...
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3 mr-2" />
                    Jetzt installieren
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(updateInfo.releaseUrl, '_blank')}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Das Update wird im Hintergrund heruntergeladen und installiert.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdateNotification;