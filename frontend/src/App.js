import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import AnalysisPage from "@/pages/AnalysisPage";
import BatchAnalysisPage from "@/pages/BatchAnalysisPage";
import ResultsPage from "@/pages/ResultsPage";
import HistoryPage from "@/pages/HistoryPage";
import ComparisonPage from "@/pages/ComparisonPage";
import WhatsAppPage from "@/pages/WhatsAppPage";
import AdminDashboardPage from "@/pages/AdminDashboardPage";
import HelpCenterPage from "@/pages/HelpCenterPage";
import PublicScamTrendsPage from "@/pages/PublicScamTrendsPage";
import { Toaster } from "@/components/ui/sonner";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { LanguageProvider } from "@/context/LanguageContext";
import OnboardingTutorial from "@/components/OnboardingTutorial";

function App() {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <div className="App">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analyze" element={<AnalysisPage />} />
              <Route path="/batch" element={<BatchAnalysisPage />} />
              <Route path="/results/:reportId" element={<ResultsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/compare" element={<ComparisonPage />} />
              <Route path="/whatsapp-bot" element={<WhatsAppPage />} />
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/help" element={<HelpCenterPage />} />
              <Route path="/public/scam-trends" element={<PublicScamTrendsPage />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
          <OnboardingTutorial />
        </div>
      </AccessibilityProvider>
    </LanguageProvider>
  );
}

export default App;
