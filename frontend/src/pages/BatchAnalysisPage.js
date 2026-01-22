import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Upload, X, FileText, Image as ImageIcon, Video, Music, Loader2, CheckCircle, AlertTriangle, Clock, Download } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import FontSizeControl from "@/components/FontSizeControl";
import LanguageSelector from "@/components/LanguageSelector";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/context/LanguageContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BatchAnalysisPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [batchResults, setBatchResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFiles(selectedFiles);
  };

  const addFiles = (newFiles) => {
    // Validate file count (max 10)
    if (files.length + newFiles.length > 10) {
      toast.error("Maximum 10 files allowed per batch");
      return;
    }

    // Validate file types
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'video/mp4', 'video/quicktime', 'audio/mp3', 'audio/wav', 'text/plain'];
    const validFiles = newFiles.filter(file => {
      const isValid = validTypes.includes(file.type) || 
                     file.name.match(/\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mp3|wav|txt)$/i);
      if (!isValid) {
        toast.error(`Unsupported file type: ${file.name}`);
      }
      return isValid;
    });

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) added`);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    toast.info("File removed");
  };

  const clearAll = () => {
    setFiles([]);
    setBatchResults(null);
    toast.info("All files cleared");
  };

  const getFileIcon = (file) => {
    const type = file.type;
    if (type.startsWith('image/')) return <ImageIcon className="w-6 h-6 text-blue-500" />;
    if (type.startsWith('video/')) return <Video className="w-6 h-6 text-purple-500" />;
    if (type.startsWith('audio/')) return <Music className="w-6 h-6 text-green-500" />;
    return <FileText className="w-6 h-6 text-slate-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleBatchAnalyze = async () => {
    if (files.length === 0) {
      toast.error("Please add files to analyze");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await axios.post(`${API}/analyze/batch`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      setBatchResults(response.data);
      toast.success(`Batch analysis complete! ${response.data.summary.completed} files processed`);
    } catch (error) {
      console.error("Batch analysis error:", error);
      toast.error(error.response?.data?.detail || "Batch analysis failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-rose-600" />;
      case 'medium': return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'low': return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      default: return <CheckCircle className="w-5 h-5 text-slate-600" />;
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'border-rose-200 bg-rose-50';
      case 'medium': return 'border-amber-200 bg-amber-50';
      case 'low': return 'border-emerald-200 bg-emerald-50';
      default: return 'border-slate-200 bg-slate-50';
    }
  };

  const exportAllAsPDF = async () => {
    if (!batchResults || !batchResults.results) return;

    try {
      // Export each completed report as PDF
      const completedReports = batchResults.results.filter(r => r.status === 'completed' && r.report);
      
      for (const result of completedReports) {
        const response = await axios.get(`${API}/export/pdf/${result.report.report_id}`, {
          responseType: 'blob'
        });
        
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `verisure_${result.filename.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      toast.success(`${completedReports.length} PDF(s) downloaded`);
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDFs");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
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
                className="bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 rounded-sm px-4 py-2 font-mono text-sm uppercase tracking-wider transition-all min-h-[44px]"
                data-testid="history-btn"
              >
                History
              </button>
              <LanguageSelector />
              <FontSizeControl />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-4" data-testid="batch-label">
              📦 BATCH PROCESSING
            </div>
            <h2 className="font-mono font-bold text-4xl tracking-tight text-slate-900 mb-4" data-testid="batch-title">
              Analyze Multiple Files
            </h2>
            <p className="font-sans text-base text-slate-600 leading-relaxed max-w-2xl mx-auto" data-testid="batch-description">
              Upload up to 10 files at once for rapid analysis. Images and text are processed instantly, while videos and audio files are queued for async processing.
            </p>
          </div>

          {/* Drag & Drop Zone */}
          <div 
            className={`border-2 border-dashed rounded-sm p-12 text-center transition-all mb-8 ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-300 bg-white hover:border-slate-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            data-testid="drag-drop-zone"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,video/*,audio/*,text/plain"
              onChange={handleFileInput}
              data-testid="batch-file-input"
            />
            
            <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="font-mono text-lg text-slate-900 mb-2">
              {dragActive ? "Drop files here" : "Drag & drop files here"}
            </h3>
            <p className="font-sans text-sm text-slate-600 mb-4">
              or click the button below to browse
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-900 text-white hover:bg-slate-800 rounded-sm px-6 py-3 font-mono text-sm uppercase tracking-wider transition-all inline-flex items-center gap-2"
              data-testid="browse-files-btn"
            >
              <Upload className="w-4 h-4" />
              Browse Files
            </button>
            <p className="font-mono text-xs text-slate-500 mt-4">
              Max 10 files • Images, Videos, Audio, Text • Up to 50MB per file
            </p>
            <p className="font-mono text-xs text-slate-400 mt-1">
              {files.length}/10 files selected
            </p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="bg-white border border-slate-200 p-6 rounded-sm mb-8" data-testid="file-list">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono font-semibold text-lg text-slate-900">
                  Selected Files ({files.length})
                </h3>
                <button
                  onClick={clearAll}
                  className="text-rose-600 hover:text-rose-700 font-mono text-sm flex items-center gap-2"
                  data-testid="clear-all-btn"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              </div>
              
              <div className="space-y-3">
                {files.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-sm hover:border-slate-300 transition-colors"
                    data-testid={`file-item-${index}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {getFileIcon(file)}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm text-slate-900 truncate">
                          {file.name}
                        </p>
                        <p className="font-mono text-xs text-slate-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                      data-testid={`remove-file-${index}`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {files.length > 0 && !batchResults && (
            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => navigate('/analyze')}
                className="bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-50 rounded-sm px-8 py-4 font-mono text-base uppercase tracking-wider transition-all min-h-[56px]"
                disabled={uploading}
                data-testid="cancel-batch-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchAnalyze}
                disabled={uploading}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-sm px-12 py-4 font-mono text-base font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 min-h-[56px]"
                data-testid="analyze-batch-btn"
              >
                {uploading && <Loader2 className="w-5 h-5 animate-spin" />}
                {uploading ? `Analyzing... ${uploadProgress}%` : `Analyze ${files.length} Files`}
              </button>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="bg-white border border-slate-200 p-6 rounded-sm mb-8" data-testid="upload-progress">
              <div className="flex justify-between mb-2">
                <span className="font-mono text-sm text-slate-600">Uploading files...</span>
                <span className="font-mono text-sm font-bold text-slate-900">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2 mb-4" />
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-mono text-xs">Processing batch analysis...</span>
              </div>
            </div>
          )}

          {/* Batch Results */}
          {batchResults && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-white border-2 border-slate-900 p-6 rounded-sm" data-testid="batch-summary">
                <h3 className="font-mono font-bold text-xl text-slate-900 mb-4">
                  Batch Analysis Complete
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-sm">
                    <div className="font-mono text-3xl font-bold text-slate-900">{batchResults.total_files}</div>
                    <div className="font-mono text-xs text-slate-600 uppercase mt-1">Total</div>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-sm border border-emerald-200">
                    <div className="font-mono text-3xl font-bold text-emerald-700">{batchResults.summary.completed}</div>
                    <div className="font-mono text-xs text-emerald-600 uppercase mt-1">Completed</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-sm border border-blue-200">
                    <div className="font-mono text-3xl font-bold text-blue-700">{batchResults.summary.processing}</div>
                    <div className="font-mono text-xs text-blue-600 uppercase mt-1">Processing</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-sm border border-amber-200">
                    <div className="font-mono text-3xl font-bold text-amber-700">{batchResults.summary.cached}</div>
                    <div className="font-mono text-xs text-amber-600 uppercase mt-1">Cached</div>
                  </div>
                </div>
                
                {batchResults.summary.completed > 0 && (
                  <button
                    onClick={exportAllAsPDF}
                    className="mt-6 w-full bg-blue-600 text-white hover:bg-blue-700 rounded-sm px-6 py-3 font-mono text-sm flex items-center justify-center gap-2 transition-all"
                    data-testid="export-all-pdf-btn"
                  >
                    <Download className="w-4 h-4" />
                    Export All as PDF
                  </button>
                )}
              </div>

              {/* Individual Results */}
              <div className="space-y-4">
                <h3 className="font-mono font-semibold text-lg text-slate-900">
                  Individual Results
                </h3>
                
                {batchResults.results.map((result, index) => (
                  <div 
                    key={index}
                    className={`border-2 p-6 rounded-sm ${
                      result.status === 'completed' && result.report 
                        ? getRiskColor(result.report.scam_assessment?.risk_level)
                        : result.status === 'processing'
                        ? 'border-blue-200 bg-blue-50'
                        : result.status === 'failed'
                        ? 'border-rose-200 bg-rose-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                    data-testid={`batch-result-${index}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-mono font-semibold text-slate-900">
                            {result.filename}
                          </h4>
                          {result.cached && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono uppercase bg-amber-100 text-amber-700 border border-amber-300 mt-1">
                              <Clock className="w-3 h-3" />
                              Cached
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {result.status === 'completed' && result.report && (
                        <div className="flex items-center gap-2">
                          {getRiskIcon(result.report.scam_assessment?.risk_level)}
                          <span className="font-mono text-sm font-bold uppercase">
                            {result.report.scam_assessment?.risk_level} Risk
                          </span>
                        </div>
                      )}
                      
                      {result.status === 'processing' && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="font-mono text-sm">Processing...</span>
                        </div>
                      )}
                      
                      {result.status === 'failed' && (
                        <div className="flex items-center gap-2 text-rose-600">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="font-mono text-sm">Failed</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Completed Report Preview */}
                    {result.status === 'completed' && result.report && (
                      <div className="space-y-3">
                        <div className="bg-white/60 p-4 rounded border border-slate-200">
                          <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-2">
                            Origin Classification
                          </div>
                          <p className="font-sans text-sm text-slate-700">
                            {result.report.origin_verdict?.classification} 
                            ({result.report.origin_verdict?.confidence} confidence)
                          </p>
                        </div>
                        
                        {result.report.scam_assessment?.scam_patterns && 
                         result.report.scam_assessment.scam_patterns[0] !== "No known scam patterns detected" && (
                          <div className="bg-white/60 p-4 rounded border border-slate-200">
                            <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-2">
                              Scam Patterns
                            </div>
                            <p className="font-sans text-sm text-slate-700">
                              {result.report.scam_assessment.scam_patterns.slice(0, 2).join(', ')}
                              {result.report.scam_assessment.scam_patterns.length > 2 && '...'}
                            </p>
                          </div>
                        )}
                        
                        <button
                          onClick={() => navigate(`/results/${result.report.report_id}`, { state: { report: result.report } })}
                          className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-sm px-4 py-3 font-mono text-sm uppercase tracking-wider transition-all"
                          data-testid={`view-details-${index}`}
                        >
                          View Full Report
                        </button>
                      </div>
                    )}
                    
                    {/* Processing Status */}
                    {result.status === 'processing' && result.job_id && (
                      <div className="bg-white/60 p-4 rounded border border-blue-200">
                        <p className="font-mono text-xs text-slate-600 mb-2">
                          Job ID: {result.job_id.slice(0, 16)}...
                        </p>
                        <p className="font-sans text-sm text-slate-700">
                          {result.analysis_type === 'video' && 'Video analysis in progress...'}
                          {result.analysis_type === 'audio' && 'Audio analysis in progress...'}
                        </p>
                        <button
                          onClick={() => window.open(`/job-status/${result.job_id}`, '_blank')}
                          className="mt-3 text-blue-600 hover:text-blue-700 font-mono text-sm"
                        >
                          Track Progress →
                        </button>
                      </div>
                    )}
                    
                    {/* Error Display */}
                    {result.status === 'failed' && result.error && (
                      <div className="bg-white/60 p-4 rounded border border-rose-200">
                        <p className="font-mono text-xs text-rose-600">{result.error}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 pt-6">
                <button
                  onClick={() => {
                    setFiles([]);
                    setBatchResults(null);
                  }}
                  className="bg-slate-900 text-white hover:bg-slate-800 rounded-sm px-8 py-4 font-mono text-base uppercase tracking-wider transition-all"
                  data-testid="analyze-more-btn"
                >
                  Analyze More Files
                </button>
                <button
                  onClick={() => navigate('/history')}
                  className="bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-50 rounded-sm px-8 py-4 font-mono text-base uppercase tracking-wider transition-all"
                  data-testid="view-history-btn"
                >
                  View History
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BatchAnalysisPage;
