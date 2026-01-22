import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Shield, AlertTriangle, CheckCircle, Info, ArrowRight, X, FileText, TrendingUp, TrendingDown, Minus } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import FontSizeControl from "@/components/FontSizeControl";
import LanguageSelector from "@/components/LanguageSelector";
import { useLanguage } from "@/context/LanguageContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ComparisonPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  
  const [reports, setReports] = useState(location.state?.reports || []);
  const [loading, setLoading] = useState(!location.state?.reports);
  const [comparisonData, setComparisonData] = useState(null);

  useEffect(() => {
    if (!location.state?.reports) {
      // Fetch reports from URL params
      const reportIds = searchParams.get('ids')?.split(',') || [];
      if (reportIds.length < 2) {
        toast.error("Please select at least 2 reports to compare");
        navigate('/history');
        return;
      }
      fetchReports(reportIds);
    } else {
      generateComparison(location.state.reports);
    }
  }, []);

  const fetchReports = async (reportIds) => {
    try {
      setLoading(true);
      const fetchPromises = reportIds.map(id => 
        axios.get(`${API}/report/${id}`)
      );
      const responses = await Promise.all(fetchPromises);
      const fetchedReports = responses.map(res => res.data);
      setReports(fetchedReports);
      generateComparison(fetchedReports);
    } catch (error) {
      toast.error("Failed to load reports for comparison");
      console.error(error);
      navigate('/history');
    } finally {
      setLoading(false);
    }
  };

  const generateComparison = (reportsData) => {
    if (reportsData.length < 2) return;

    // Extract all unique patterns
    const allScamPatterns = new Set();
    const allBehavioralFlags = new Set();
    const allIndicators = new Set();

    reportsData.forEach(report => {
      report.scam_assessment.scam_patterns.forEach(p => allScamPatterns.add(p));
      report.scam_assessment.behavioral_flags.forEach(f => allBehavioralFlags.add(f));
      report.origin_verdict.indicators.forEach(i => allIndicators.add(i));
    });

    // Find common and unique patterns
    const commonPatterns = Array.from(allScamPatterns).filter(pattern =>
      reportsData.every(report => report.scam_assessment.scam_patterns.includes(pattern))
    );

    const uniquePatterns = reportsData.map(report => ({
      reportId: report.report_id,
      patterns: report.scam_assessment.scam_patterns.filter(p => !commonPatterns.includes(p))
    }));

    setComparisonData({
      allScamPatterns: Array.from(allScamPatterns),
      allBehavioralFlags: Array.from(allBehavioralFlags),
      allIndicators: Array.from(allIndicators),
      commonPatterns,
      uniquePatterns
    });
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'medium': return <Info className="w-5 h-5 text-amber-600" />;
      case 'low': return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      default: return <Info className="w-5 h-5 text-slate-600" />;
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'bg-rose-50 border-rose-400 text-rose-700';
      case 'medium': return 'bg-amber-50 border-amber-400 text-amber-700';
      case 'low': return 'bg-emerald-50 border-emerald-400 text-emerald-700';
      default: return 'bg-slate-50 border-slate-400 text-slate-700';
    }
  };

  const getRiskScore = (level) => {
    switch (level) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  const compareRisks = (risk1, risk2) => {
    const score1 = getRiskScore(risk1);
    const score2 = getRiskScore(risk2);
    
    if (score1 > score2) return <TrendingUp className="w-5 h-5 text-rose-600" />;
    if (score1 < score2) return <TrendingDown className="w-5 h-5 text-emerald-600" />;
    return <Minus className="w-5 h-5 text-slate-400" />;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-sm text-slate-600">Loading comparison...</div>
        </div>
      </div>
    );
  }

  if (reports.length < 2) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-sm text-slate-600">Invalid comparison request</div>
          <button
            onClick={() => navigate('/history')}
            className="mt-4 bg-slate-900 text-white px-6 py-2 rounded-sm font-mono"
          >
            Back to History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => navigate('/')}
              data-testid="home-link"
            >
              <Shield className="w-8 h-8 text-slate-900" />
              <h1 className="font-mono font-bold text-2xl text-slate-900">{t('appTitle')}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/history')}
                className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-sm px-4 py-2 font-mono text-sm transition-all"
                data-testid="back-to-history-btn"
              >
                <X className="w-4 h-4 inline mr-2" />
                Close Comparison
              </button>
              <LanguageSelector />
              <FontSizeControl />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="font-mono text-3xl font-bold text-slate-900 mb-2">
            <FileText className="inline w-8 h-8 mr-3" />
            Report Comparison
          </h2>
          <p className="text-slate-600 font-mono">
            Comparing {reports.length} analysis reports side-by-side
          </p>
        </div>

        {/* Risk Level Comparison Summary */}
        <div className="mb-8 bg-white border-2 border-slate-200 rounded-sm p-6" data-testid="risk-comparison-summary">
          <h3 className="font-mono text-lg font-bold text-slate-900 mb-4">Risk Level Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reports.map((report, idx) => (
              <div key={report.report_id} className="space-y-2">
                <div className="font-mono text-xs text-slate-500 uppercase">Report {idx + 1}</div>
                <div className={`flex items-center gap-2 p-3 rounded-sm border-2 ${getRiskColor(report.scam_assessment.risk_level)}`}>
                  {getRiskIcon(report.scam_assessment.risk_level)}
                  <span className="font-mono font-bold uppercase text-sm">
                    {report.scam_assessment.risk_level} Risk
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {formatTimestamp(report.timestamp)}
                </div>
                {idx < reports.length - 1 && (
                  <div className="flex items-center justify-center pt-2">
                    {compareRisks(report.scam_assessment.risk_level, reports[idx + 1].scam_assessment.risk_level)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Common Patterns */}
        {comparisonData && comparisonData.commonPatterns.length > 0 && (
          <div className="mb-8 bg-blue-50 border-2 border-blue-200 rounded-sm p-6" data-testid="common-patterns">
            <h3 className="font-mono text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              Common Scam Patterns ({comparisonData.commonPatterns.length})
            </h3>
            <div className="space-y-2">
              {comparisonData.commonPatterns.map((pattern, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-white p-3 rounded border border-blue-200">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-mono text-xs flex-shrink-0">
                    ✓
                  </div>
                  <span className="font-sans text-sm text-slate-800">{pattern}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Side-by-Side Comparison */}
        <div className="space-y-8">
          <h3 className="font-mono text-2xl font-bold text-slate-900">Detailed Comparison</h3>
          
          {/* Scam Assessment Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="detailed-comparison">
            {reports.map((report, idx) => (
              <div key={report.report_id} className="bg-white border-2 border-slate-200 rounded-sm p-6 space-y-4">
                {/* Header */}
                <div className="border-b pb-4">
                  <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-2">
                    Report {idx + 1}
                  </div>
                  <div className={`flex items-center gap-2 p-3 rounded-sm border-2 ${getRiskColor(report.scam_assessment.risk_level)}`}>
                    {getRiskIcon(report.scam_assessment.risk_level)}
                    <span className="font-mono font-bold uppercase">
                      {report.scam_assessment.risk_level}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500 font-mono">
                    {formatTimestamp(report.timestamp)}
                  </div>
                </div>

                {/* Scam Patterns */}
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-slate-600 mb-2">
                    Scam Patterns ({report.scam_assessment.scam_patterns.length})
                  </div>
                  <div className="space-y-1.5">
                    {report.scam_assessment.scam_patterns.map((pattern, pidx) => (
                      <div 
                        key={pidx} 
                        className={`flex items-start gap-2 p-2 rounded text-xs ${
                          comparisonData?.commonPatterns.includes(pattern)
                            ? 'bg-blue-50 border border-blue-200'
                            : 'bg-slate-50 border border-slate-200'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                          comparisonData?.commonPatterns.includes(pattern)
                            ? 'bg-blue-500'
                            : 'bg-rose-500'
                        }`}></div>
                        <span className="font-sans text-slate-700">{pattern}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Behavioral Flags */}
                {report.scam_assessment.behavioral_flags.length > 0 && 
                 report.scam_assessment.behavioral_flags[0] !== "No behavioral manipulation detected" && (
                  <div>
                    <div className="font-mono text-xs uppercase tracking-widest text-slate-600 mb-2">
                      Behavioral Flags ({report.scam_assessment.behavioral_flags.length})
                    </div>
                    <div className="space-y-1.5">
                      {report.scam_assessment.behavioral_flags.slice(0, 3).map((flag, fidx) => (
                        <div key={fidx} className="flex items-start gap-2 p-2 rounded text-xs bg-amber-50 border border-amber-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></div>
                          <span className="font-sans text-slate-700">{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Origin Verdict */}
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-slate-600 mb-2">
                    Origin Analysis
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded">
                    <div className="font-mono text-sm font-semibold text-slate-900 mb-1">
                      {report.origin_verdict.classification}
                    </div>
                    <div className="text-xs text-slate-600 font-mono">
                      {report.origin_verdict.confidence} confidence
                    </div>
                  </div>
                </div>

                {/* Key Indicators */}
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-slate-600 mb-2">
                    Key Indicators ({report.origin_verdict.indicators.length})
                  </div>
                  <div className="space-y-1">
                    {report.origin_verdict.indicators.slice(0, 3).map((indicator, iidx) => (
                      <div key={iidx} className="flex items-start gap-2 text-xs">
                        <div className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></div>
                        <span className="font-sans text-slate-600">{indicator}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* View Full Report Button */}
                <button
                  onClick={() => navigate(`/results/${report.report_id}`, { state: { report } })}
                  className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-sm px-4 py-2 font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  data-testid={`view-report-${idx}`}
                >
                  View Full Report
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis Summary Comparison */}
        <div className="mt-8 space-y-4" data-testid="summary-comparison">
          <h3 className="font-mono text-2xl font-bold text-slate-900">Analysis Summaries</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map((report, idx) => (
              <div key={report.report_id} className="bg-slate-50 border border-slate-200 rounded-sm p-6">
                <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-3">
                  Report {idx + 1} - Summary
                </div>
                <p className="font-sans text-sm text-slate-700 leading-relaxed">
                  {report.analysis_summary}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-300">
                  <div className="font-mono text-xs text-slate-500">Report ID</div>
                  <div className="font-mono text-xs text-slate-700 break-all">{report.report_id}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComparisonPage;
