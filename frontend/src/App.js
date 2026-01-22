import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import AnalysisPage from "@/pages/AnalysisPage";
import ResultsPage from "@/pages/ResultsPage";
import HistoryPage from "@/pages/HistoryPage";
import { Toaster } from "@/components/ui/sonner";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { LanguageProvider } from "@/context/LanguageContext";

function App() {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <div className="App">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analyze" element={<AnalysisPage />} />
              <Route path="/results/:reportId" element={<ResultsPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </div>
      </AccessibilityProvider>
    </LanguageProvider>
  );
}

export default App;
