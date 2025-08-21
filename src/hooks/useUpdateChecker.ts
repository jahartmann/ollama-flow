import { useState, useEffect } from 'react';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  downloadUrl: string;
  releaseUrl: string;
}

export const useUpdateChecker = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);

  const CURRENT_VERSION = '1.0.0'; // This would normally come from package.json or env
  const GITHUB_REPO = 'jahartmann/ollama-flow'; // Configure this for your repo

  const checkForUpdates = async (silent = false) => {
    if (!silent) setIsChecking(true);
    setError(null);

    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      
      if (!response.ok) {
        throw new Error('Fehler beim Abrufen der Update-Informationen');
      }

      const release: GitHubRelease = await response.json();
      
      const latestVersion = release.tag_name.replace('v', '');
      const isUpdateAvailable = compareVersions(CURRENT_VERSION, latestVersion) < 0;

      const updateInfo: UpdateInfo = {
        available: isUpdateAvailable,
        currentVersion: CURRENT_VERSION,
        latestVersion,
        releaseNotes: release.body || 'Keine Release-Notes verfügbar',
        downloadUrl: release.assets[0]?.browser_download_url || release.html_url,
        releaseUrl: release.html_url
      };

      setUpdateInfo(updateInfo);
      
      // Store last check time
      localStorage.setItem('lastUpdateCheck', Date.now().toString());
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMessage);
    } finally {
      if (!silent) setIsChecking(false);
    }
  };

  const compareVersions = (current: string, latest: string): number => {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;
      
      if (currentPart < latestPart) return -1;
      if (currentPart > latestPart) return 1;
    }
    
    return 0;
  };

  const dismissUpdate = () => {
    setUpdateInfo(null);
  };

  const toggleAutoCheck = (enabled: boolean) => {
    setAutoCheckEnabled(enabled);
    localStorage.setItem('autoUpdateCheck', enabled.toString());
  };

  // Load settings from localStorage
  useEffect(() => {
    const savedAutoCheck = localStorage.getItem('autoUpdateCheck');
    if (savedAutoCheck !== null) {
      setAutoCheckEnabled(JSON.parse(savedAutoCheck));
    }
  }, []);

  // Auto-check on mount and periodically
  useEffect(() => {
    if (!autoCheckEnabled) return;

    const lastCheck = localStorage.getItem('lastUpdateCheck');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Check immediately if never checked or last check was more than 24 hours ago
    if (!lastCheck || now - parseInt(lastCheck) > oneDay) {
      checkForUpdates(true);
    }

    // Set up periodic checks every 6 hours
    const interval = setInterval(() => {
      checkForUpdates(true);
    }, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoCheckEnabled]);

  return {
    updateInfo,
    isChecking,
    error,
    autoCheckEnabled,
    checkForUpdates,
    dismissUpdate,
    toggleAutoCheck
  };
};