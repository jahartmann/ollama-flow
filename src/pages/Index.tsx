import CSVTransformer from "@/components/CSVTransformer";
import { CSVFile, TransformationRecipe } from "@/lib/transformationEngine";
import { useState } from "react";

const Index = () => {
  const [transformedData, setTransformedData] = useState<CSVFile | null>(null);
  const [recipes, setRecipes] = useState<TransformationRecipe[]>([]);

  const handleTransform = (data: CSVFile) => {
    setTransformedData(data);
  };

  const handleRecipesChange = (newRecipes: TransformationRecipe[]) => {
    setRecipes(newRecipes);
  };

  return (
    <CSVTransformer 
      onTransform={handleTransform}
      onRecipesChange={handleRecipesChange}
    />
  );
};

export default Index;
