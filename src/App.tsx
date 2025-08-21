import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "@/components/Navigation";
import CSVWizard from "@/components/csv/CSVWizard";
import Settings from "@/components/Settings";
import AIChat from "@/pages/AIChat";
import UpdateNotification from "@/components/UpdateNotification";
import { useUpdateChecker } from "@/hooks/useUpdateChecker";
import NotFound from "./pages/NotFound";
import { CSVFile, TransformationRecipe } from "@/lib/transformationEngine";
import { useState } from "react";

const queryClient = new QueryClient();

const AppContent = () => {
  const { updateInfo, dismissUpdate } = useUpdateChecker();
  const [transformedData, setTransformedData] = useState<CSVFile | null>(null);
  const [recipes, setRecipes] = useState<TransformationRecipe[]>([]);

  const handleTransform = (data: CSVFile) => {
    setTransformedData(data);
  };

  const handleRecipesChange = (newRecipes: TransformationRecipe[]) => {
    setRecipes(newRecipes);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {updateInfo?.available && (
        <UpdateNotification
          updateInfo={updateInfo}
          onDismiss={dismissUpdate}
        />
      )}
      <Routes>
        <Route 
          path="/" 
          element={
            <CSVWizard 
              onComplete={handleTransform}
            />
          } 
        />
        <Route path="/ai-chat" element={<AIChat />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
