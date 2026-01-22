import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Shield, AlertTriangle, CheckCircle, Info, Hash, Clock, FileText, ChevronRight, Volume2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useAccessibility } from "@/context/AccessibilityContext";
import { useLanguage } from "@/context/LanguageContext";
import FontSizeControl from "@/components/FontSizeControl";
import LanguageSelector from "@/components/LanguageSelector";
import VoiceOutput from "@/components/VoiceOutput";
import WhatsAppShare from "@/components/WhatsAppShare";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ResultsPage = () => {
  const { reportId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [report, setReport] = useState(location.state?.report || null);
  const [loading, setLoading] = useState(!location.state?.report);
  const { playAlert } = useAccessibility();
  const { t } = useLanguage();

  useEffect(() => {
    if (!location.state?.report) {
      // Fetch report from API
      const fetchReport = async () => {
        try {
          const response = await axios.get(`${API}/report/${reportId}`);
          setReport(response.data);
        } catch (error) {
          toast.error("Failed to load report");
          navigate('/');
        } finally {
          setLoading(false);
        }
      };
      fetchReport();
    }
  }, [reportId, location.state, navigate]);

  // Play alert sound when report is loaded
  useEffect(() => {
    if (report && report.scam_assessment) {
      playAlert(report.scam_assessment.risk_level);
    }
  }, [report, playAlert]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-sm text-slate-600">Loading report...</div>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'medium': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'low': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const getOriginColor = (classification) => {
    if (classification === 'Likely AI-Generated') return 'text-purple-700 bg-purple-50 border-purple-200';
    if (classification === 'Likely Original') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (classification === 'Hybrid / Manipulated') return 'text-orange-700 bg-orange-50 border-orange-200';
    if (classification === 'Inconclusive') return 'text-slate-700 bg-slate-50 border-slate-200';
    if (classification === 'Unclear / Mixed Signals') return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-slate-700 bg-slate-50 border-slate-200';
  };

  const formatClassification = (classification) => {
    // Return as-is since we're now using human-readable labels
    return classification;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md">
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
              <WhatsAppShare report={report} />
              <LanguageSelector />
              <FontSizeControl />
              <button
                onClick={() => navigate('/analyze')}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-sm px-6 py-3 font-mono text-sm uppercase tracking-wider transition-all min-h-[44px]"
                data-testid="new-analysis-btn"
              >
                {t('newAnalysis')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Risk Alert Banner */}
      {report && report.scam_assessment.risk_level === 'high' && (
        <div className="bg-rose-600 border-b-4 border-rose-700" data-testid="high-risk-banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-center gap-4">
              <AlertTriangle className="w-12 h-12 text-white animate-pulse" />
              <div className="text-center">
                <div className="font-mono font-bold text-2xl text-white mb-1">
                  ⚠️ {t('highRisk')} ⚠️
                </div>
                <div className="font-sans text-lg text-white">
                  {t('highRiskWarning')}
                </div>
              </div>
              <Volume2 className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      )}

      {report && report.scam_assessment.risk_level === 'medium' && (
        <div className="bg-amber-500 border-b-4 border-amber-600" data-testid="medium-risk-banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center gap-3">
              <Info className="w-8 h-8 text-white" />
              <div className="font-mono font-bold text-xl text-white">
                ⚠️ {t('mediumRisk')}
              </div>
            </div>
          </div>
        </div>
      )}

      {report && report.scam_assessment.risk_level === 'low' && (
        <div className="bg-emerald-500 border-b-4 border-emerald-600" data-testid="low-risk-banner">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center gap-3">
              <CheckCircle className="w-8 h-8 text-white" />
              <div className="font-mono font-bold text-xl text-white">
                ✓ {t('lowRisk')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex items-center justify-between">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-4" data-testid="results-label">
                {t('analysisReport')}
              </div>
              <h2 className="font-mono font-bold text-4xl tracking-tight text-slate-900" data-testid="results-title">
                {t('threatAnalysisComplete')}
              </h2>
              <p className="font-sans text-slate-600 mt-2">{t('threatAnalysisSubtitle')}</p>
            </div>
            <VoiceOutput 
              text={`${t('scamRisk')}: ${t(report?.scam_assessment.risk_level === 'high' ? 'highRiskLabel' : report?.scam_assessment.risk_level === 'medium' ? 'mediumRiskLabel' : 'lowRiskLabel')}. ${report?.analysis_summary}`} 
            />
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Scam Risk Assessment - MAIN FOCUS - Span 2 columns */}
            <div className={`md:col-span-2 border-4 p-8 relative overflow-hidden ${
              report.scam_assessment.risk_level === 'high' ? 'bg-rose-50 border-rose-500' :
              report.scam_assessment.risk_level === 'medium' ? 'bg-amber-50 border-amber-400' :
              'bg-emerald-50 border-emerald-400'
            }`} data-testid="scam-risk-card">
              <div className="scanline"></div>
              <div className="flex items-center justify-between mb-6">
                <div className="font-mono text-sm uppercase tracking-widest text-slate-700 mb-3">
                  🚨 {t('threatAssessment')}
                </div>
                <div className="flex flex-col items-center gap-3">
                  {report.scam_assessment.risk_level === 'high' && (
                    <>
                      <AlertTriangle className="w-16 h-16 text-rose-600 animate-pulse" />
                      <span className="px-5 py-2 rounded-full text-lg font-mono font-bold uppercase border-2 bg-rose-100 text-rose-800 border-rose-600">
                        {t('highRiskLabel')}
                      </span>
                    </>
                  )}
                  {report.scam_assessment.risk_level === 'medium' && (
                    <>
                      <Info className="w-16 h-16 text-amber-600" />
                      <span className="px-5 py-2 rounded-full text-lg font-mono font-bold uppercase border-2 bg-amber-100 text-amber-800 border-amber-600">
                        {t('mediumRiskLabel')}
                      </span>
                    </>
                  )}
                  {report.scam_assessment.risk_level === 'low' && (
                    <>
                      <CheckCircle className="w-16 h-16 text-emerald-600" />
                      <span className="px-5 py-2 rounded-full text-lg font-mono font-bold uppercase border-2 bg-emerald-100 text-emerald-800 border-emerald-600">
                        {t('lowRiskLabel')}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-4 mt-6">
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-slate-600 mb-3">🎯 {t('scamPatternsDetected')}</div>
                  <div className="space-y-2">
                    {report.scam_assessment.scam_patterns.map((pattern, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-white/60 p-3 rounded border border-slate-200">
                        <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                        <span className="font-sans text-sm font-medium text-slate-800">{pattern}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {report.scam_assessment.behavioral_flags.length > 0 && 
                 report.scam_assessment.behavioral_flags[0] !== "No behavioral manipulation detected" && (
                  <div className="mt-4">
                    <div className="font-mono text-xs uppercase tracking-widest text-slate-600 mb-3">⚠️ {t('manipulationTactics')}</div>
                    <div className="space-y-2">
                      {report.scam_assessment.behavioral_flags.map((flag, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-white/60 p-3 rounded border border-slate-200">
                          <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">!</div>
                          <span className="font-sans text-sm text-slate-800">{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Origin Verdict - Secondary (1 column) */}
            <div className="bg-white border border-slate-200 p-6 relative overflow-hidden" data-testid="origin-verdict-card">
              <div className="scanline"></div>
              <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-4">{t('aiOriginAnalysis')}</div>
              <div className="mb-4">
                <h3 className="font-mono font-semibold text-lg text-slate-900 mb-2">
                  {formatClassification(report.origin_verdict.classification)}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-mono uppercase border ${getOriginColor(report.origin_verdict.classification)}`}>
                  {report.origin_verdict.confidence} {t('confidence')}
                </span>
              </div>
              
              <div className="space-y-2 mt-4">
                <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-2">{t('keyIndicators')}</div>
                {report.origin_verdict.indicators.map((indicator, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
                    <span className="font-sans text-xs text-slate-600">{indicator}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence Summary */}
            <div className="md:col-span-2 bg-white border border-slate-200 p-6 relative overflow-hidden" data-testid="evidence-card">
              <div className="scanline"></div>
              <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-4">{t('evidenceSummary')}</div>
              
              <div className="space-y-4">
                <div>
                  <div className="font-mono text-xs text-slate-500 mb-2">{t('signalsDetectedLabel')}</div>
                  <div className="space-y-2">
                    {report.evidence.signals_detected.slice(0, 4).map((signal, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                        <span className="font-sans text-sm text-slate-700">{signal}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <div className="font-mono text-xs text-slate-500 mb-2">{t('forensicNotesLabel')}</div>
                  <div className="space-y-2">
                    {report.evidence.forensic_notes.slice(0, 3).map((note, idx) => (
                      <p key={idx} className="font-sans text-sm text-slate-600">• {note}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Report Metadata */}
            <div className="bg-white border border-slate-200 p-6 relative overflow-hidden" data-testid="metadata-card">
              <div className="scanline"></div>
              <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-4">{t('reportDetailsLabel')}</div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div>
                    <div className="font-mono text-xs text-slate-500">{t('reportIdLabel')}</div>
                    <div className="font-mono text-xs text-slate-700 break-all">{report.report_id}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div>
                    <div className="font-mono text-xs text-slate-500">{t('timestampLabel')}</div>
                    <div className="font-mono text-xs text-slate-700">{formatTimestamp(report.timestamp)}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Hash className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div>
                    <div className="font-mono text-xs text-slate-500">{t('contentHashLabel')}</div>
                    <div className="font-mono text-xs text-slate-700 break-all">{report.content_hash.slice(0, 16)}...</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations - Full Width */}
            <div className="md:col-span-3 bg-white border border-slate-200 p-6 relative overflow-hidden" data-testid="recommendations-card">
              <div className="scanline"></div>
              <div className="flex items-center gap-3 mb-4">
                {report.recommendations.severity === 'critical' && <AlertTriangle className="w-6 h-6 text-rose-600" />}
                {report.recommendations.severity === 'warning' && <Info className="w-6 h-6 text-amber-600" />}
                {report.recommendations.severity === 'info' && <CheckCircle className="w-6 h-6 text-slate-600" />}
                <div className="font-mono text-xs uppercase tracking-widest text-slate-500">{t('recommendedActionsLabel')}</div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.recommendations.actions.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-slate-50 p-4 rounded-sm border border-slate-200">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-xs flex-shrink-0">
                      {idx + 1}
                    </div>
                    <span className="font-sans text-sm text-slate-700">{action}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis Summary */}
            <div className="md:col-span-3 bg-slate-100 border border-slate-200 p-6" data-testid="summary-card">
              <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-3">{t('analysisSummaryLabel')}</div>
              <p className="font-sans text-base text-slate-700 leading-relaxed">{report.analysis_summary}</p>
              
              <div className="mt-6 pt-6 border-t border-slate-300">
                <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-2">{t('limitationsLabel')}</div>
                <div className="space-y-1">
                  {report.evidence.limitations.map((limitation, idx) => (
                    <p key={idx} className="font-sans text-xs text-slate-600">• {limitation}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ResultsPage;
