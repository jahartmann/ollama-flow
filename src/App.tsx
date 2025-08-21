import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "@/components/Navigation";
import CSVTransformer from "@/components/CSVTransformer";
import OllamaSettings from "@/components/OllamaSettings";
import UpdateNotification from "@/components/UpdateNotification";
import { useUpdateChecker } from "@/hooks/useUpdateChecker";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { updateInfo, dismissUpdate } = useUpdateChecker();

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
        <Route path="/" element={<CSVTransformer />} />
        <Route path="/settings" element={<OllamaSettings />} />
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
