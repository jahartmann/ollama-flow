import { Routes, Route } from 'react-router-dom';
import Navigation from "@/components/Navigation";
import ETLWizard from "@/components/ETLWizard";
import DataPreview from "@/components/DataPreview";
import WorkflowHub from "@/components/WorkflowHub";
import OllamaSettings from "@/components/OllamaSettings";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Routes>
        <Route path="/" element={<ETLWizard />} />
        <Route path="/preview" element={<DataPreview />} />
        <Route path="/workflows" element={<WorkflowHub />} />
        <Route path="/settings" element={<OllamaSettings />} />
      </Routes>
    </div>
  );
};

export default Index;
