import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Clock, AlertTriangle, Info, CheckCircle, ChevronRight, FileText } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import FontSizeControl from "@/components/FontSizeControl";
import LanguageSelector from "@/components/LanguageSelector";
import { useLanguage } from "@/context/LanguageContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HistoryPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ total: 0, skip: 0, limit: 20 });
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedReports, setSelectedReports] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = {
        limit: pagination.limit,
        skip: pagination.skip
      };
      
      if (filter !== 'all') {
        params.risk_level = filter;
      }

      const response = await axios.get(`${API}/history`, { params });
      setReports(response.data.reports);
      setPagination(prev => ({ ...prev, total: response.data.total }));
    } catch (error) {
      toast.error("Failed to load history");
      console.error(error);
    } finally {
      setLoading(false);
    }
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
      case 'high': return 'bg-rose-50 border-rose-200 text-rose-700';
      case 'medium': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'low': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const toggleReportSelection = (report) => {
    setSelectedReports(prev => {
      const isSelected = prev.some(r => r.report_id === report.report_id);
      if (isSelected) {
        return prev.filter(r => r.report_id !== report.report_id);
      } else {
        if (prev.length >= 4) {
          toast.error("Maximum 4 reports can be compared at once");
          return prev;
        }
        return [...prev, report];
      }
    });
  };

  const handleCompareClick = () => {
    if (selectedReports.length < 2) {
      toast.error("Please select at least 2 reports to compare");
      return;
    }
    navigate('/compare', { state: { reports: selectedReports } });
  };

  const handleReportClick = (report) => {
    if (selectionMode) {
      toggleReportSelection(report);
    } else {
      navigate(`/results/${report.report_id}`, { state: { report } });
    }
  };

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
              <LanguageSelector />
              <FontSizeControl />
              {!selectionMode ? (
                <>
                  <button
                    onClick={() => setSelectionMode(true)}
                    className="bg-blue-600 text-white hover:bg-blue-700 rounded-sm px-6 py-3 font-mono text-sm uppercase tracking-wider transition-all min-h-[44px]"
                    data-testid="compare-mode-btn"
                  >
                    Compare Reports
                  </button>
                  <button
                    onClick={() => navigate('/analyze')}
                    className="bg-slate-900 text-white hover:bg-slate-800 rounded-sm px-6 py-3 font-mono text-sm uppercase tracking-wider transition-all min-h-[44px]"
                    data-testid="new-analysis-btn"
                  >
                    {t('newAnalysis')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setSelectionMode(false);
                      setSelectedReports([]);
                    }}
                    className="bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-sm px-4 py-3 font-mono text-sm uppercase tracking-wider transition-all min-h-[44px]"
                    data-testid="cancel-selection-btn"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCompareClick}
                    disabled={selectedReports.length < 2}
                    className={`rounded-sm px-6 py-3 font-mono text-sm uppercase tracking-wider transition-all min-h-[44px] ${
                      selectedReports.length >= 2
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                    data-testid="confirm-compare-btn"
                  >
                    Compare ({selectedReports.length})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="font-mono text-3xl font-bold text-slate-900 mb-2">
            <Clock className="inline w-8 h-8 mr-3" />
            Analysis History
          </h2>
          <p className="text-slate-600 font-mono">
            View all your past analyses and reports
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-3 flex-wrap" data-testid="history-filters">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-sm font-mono text-sm transition-all ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
            data-testid="filter-all"
          >
            All ({pagination.total})
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-4 py-2 rounded-sm font-mono text-sm transition-all ${
              filter === 'high'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
            data-testid="filter-high"
          >
            High Risk
          </button>
          <button
            onClick={() => setFilter('medium')}
            className={`px-4 py-2 rounded-sm font-mono text-sm transition-all ${
              filter === 'medium'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
            data-testid="filter-medium"
          >
            Medium Risk
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-4 py-2 rounded-sm font-mono text-sm transition-all ${
              filter === 'low'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
            data-testid="filter-low"
          >
            Low Risk
          </button>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="font-mono text-slate-600">Loading history...</div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-sm">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <div className="font-mono text-slate-600 mb-4">No analyses found</div>
            <button
              onClick={() => navigate('/analyze')}
              className="bg-slate-900 text-white hover:bg-slate-800 rounded-sm px-6 py-3 font-mono text-sm uppercase tracking-wider transition-all"
            >
              Create First Analysis
            </button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="history-list">
            {reports.map((report) => {
              const isSelected = selectedReports.some(r => r.report_id === report.report_id);
              return (
                <div
                  key={report.report_id}
                  className={`bg-white border-2 rounded-sm p-6 transition-all cursor-pointer ${
                    selectionMode && isSelected
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => handleReportClick(report)}
                  data-testid={`history-item-${report.report_id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {selectionMode && (
                      <div className="flex items-center mr-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleReportSelection(report);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                          data-testid={`checkbox-${report.report_id}`}
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      {/* Risk Level */}
                      <div className="flex items-center gap-3 mb-3">
                        {getRiskIcon(report.scam_assessment.risk_level)}
                        <span className={`px-3 py-1 rounded-sm border font-mono text-sm font-bold uppercase ${getRiskColor(report.scam_assessment.risk_level)}`}>
                          {report.scam_assessment.risk_level} Risk
                        </span>
                      </div>

                      {/* Origin Classification */}
                      <div className="mb-3">
                        <span className="font-mono text-sm text-slate-600 mr-2">Origin:</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {report.origin_verdict.classification}
                        </span>
                        <span className="ml-2 text-xs font-mono text-slate-500 uppercase">
                          ({report.origin_verdict.confidence} confidence)
                        </span>
                      </div>

                      {/* Summary Preview */}
                      <p className="text-sm text-slate-600 font-sans line-clamp-2 mb-3">
                        {report.analysis_summary}
                      </p>

                      {/* Timestamp */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <Clock className="w-4 h-4" />
                        {formatTimestamp(report.timestamp)}
                      </div>
                    </div>

                    {/* View Button */}
                    {!selectionMode && (
                      <div className="flex items-center">
                        <ChevronRight className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination (Future Enhancement) */}
        {!loading && reports.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-600 font-mono">
              Showing {reports.length} of {pagination.total} analyses
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
