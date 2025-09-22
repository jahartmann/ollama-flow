// Wizard State Cache Management
// Handles caching of wizard state for navigation between steps

interface WizardCache {
  files: any[];
  selectedOperation: string | null;
  processedData: any | null;
  selectedTemplate: any | null;
  columnMappings: any[];
  appliedFilters: any[];
  currentStep: number;
  timestamp: number;
}

const CACHE_KEY = 'csv-wizard-cache';
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

export class WizardCacheManager {
  static saveState(state: Partial<WizardCache>): void {
    try {
      const cacheData: WizardCache = {
        files: [],
        selectedOperation: null,
        processedData: null,
        selectedTemplate: null,
        columnMappings: [],
        appliedFilters: [],
        currentStep: 0,
        ...state,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to save wizard cache:', error);
    }
  }

  static loadState(): Partial<WizardCache> | null {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const cacheData: WizardCache = JSON.parse(cached);
      
      // Check if cache is still valid
      if (Date.now() - cacheData.timestamp > CACHE_DURATION) {
        this.clearCache();
        return null;
      }

      return cacheData;
    } catch (error) {
      console.error('Failed to load wizard cache:', error);
      return null;
    }
  }

  static clearCache(): void {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear wizard cache:', error);
    }
  }

  static updateCurrentStep(step: number): void {
    const current = this.loadState();
    if (current) {
      this.saveState({ ...current, currentStep: step });
    }
  }
}