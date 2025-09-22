import SimpleCSVWizard from "@/components/csv/SimpleCSVWizard";
import { CSVFile, TransformationRecipe } from "@/lib/transformationEngine";
import { useState } from "react";

const Index = () => {
  const [transformedData, setTransformedData] = useState<CSVFile | null>(null);

  const handleComplete = (data: CSVFile) => {
    setTransformedData(data);
  };

  return (
    <SimpleCSVWizard 
      onComplete={handleComplete}
    />
  );
};

export default Index;
