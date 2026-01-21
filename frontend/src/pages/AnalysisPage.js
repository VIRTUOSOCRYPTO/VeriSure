import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Upload, Type, Link as LinkIcon, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axios from "axios";
import FontSizeControl from "@/components/FontSizeControl";
import LanguageSelector from "@/components/LanguageSelector";
import VoiceInput from "@/components/VoiceInput";
import { useLanguage } from "@/context/LanguageContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AnalysisPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("upload");
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'video/mp4', 'video/quicktime'];
      if (!validTypes.includes(file.type)) {
        toast.error(t('unsupportedFile'));
        return;
      }
      setSelectedFile(file);
      toast.success(t('fileSelected'));
    }
  };

  const handleVoiceTranscript = (transcript) => {
    setTextInput(transcript);
  };

  const handleAnalyze = async () => {
    if (activeTab === "upload" && !selectedFile) {
      toast.error(t('selectFile'));
      return;
    }
    if (activeTab === "text" && !textInput.trim()) {
      toast.error(t('enterText'));
      return;
    }
    if (activeTab === "url" && !urlInput.trim()) {
      toast.error(t('enterUrlText'));
      return;
    }

    setLoading(true);
    
    try {
      const formData = new FormData();
      
      if (activeTab === "upload") {
        formData.append("input_type", "file");
        formData.append("file", selectedFile);
      } else if (activeTab === "text") {
        formData.append("input_type", "text");
        formData.append("content", textInput);
      } else if (activeTab === "url") {
        formData.append("input_type", "url");
        formData.append("content", urlInput);
      }

      const response = await axios.post(`${API}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(t('analysisComplete'));
      navigate(`/results/${response.data.report_id}`, { state: { report: response.data } });
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error.response?.data?.detail || t('analysisFailed'));
    } finally {
      setLoading(false);
    }
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
              <LanguageSelector />
              <FontSizeControl />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-4" data-testid="analysis-label">
              {t('forensicAnalysis')}
            </div>
            <h2 className="font-mono font-bold text-4xl tracking-tight text-slate-900 mb-4" data-testid="analysis-title">
              {t('submitContent')}
            </h2>
            <p className="font-sans text-base text-slate-600 leading-relaxed" data-testid="analysis-description">
              {t('submitDescription')}
            </p>
          </div>

          {/* Analysis Input Tabs */}
          <div className="bg-white border border-slate-200 p-6 md:p-8 relative overflow-hidden">
            <div className="scanline"></div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8" data-testid="input-tabs">
                <TabsTrigger value="upload" className="font-mono text-xs uppercase" data-testid="tab-upload">
                  <Upload className="w-4 h-4 mr-2" />
                  {t('upload')}
                </TabsTrigger>
                <TabsTrigger value="text" className="font-mono text-xs uppercase" data-testid="tab-text">
                  <Type className="w-4 h-4 mr-2" />
                  {t('text')}
                </TabsTrigger>
                <TabsTrigger value="url" className="font-mono text-xs uppercase" data-testid="tab-url">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  {t('url')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-sm p-12 text-center hover:border-slate-400 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/png,image/jpeg,image/jpg,video/mp4,video/quicktime"
                    onChange={handleFileChange}
                    data-testid="file-input"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="font-mono text-sm text-slate-600 mb-2">
                      {selectedFile ? selectedFile.name : t('clickToUpload')}
                    </p>
                    <p className="font-sans text-xs text-slate-500">
                      {t('fileTypes')}
                    </p>
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <textarea
                  className="w-full h-64 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-sm font-mono text-sm p-4 resize-none"
                  placeholder={t('pasteText')}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  data-testid="text-input"
                />
                <VoiceInput onTranscript={handleVoiceTranscript} disabled={loading} />
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                <input
                  type="url"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-sm font-mono text-sm p-4"
                  placeholder={t('enterUrl')}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  data-testid="url-input"
                />
                <p className="font-sans text-xs text-slate-500">
                  {t('urlDescription')}
                </p>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
              <button
                onClick={() => navigate('/')}
                className="bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-50 rounded-sm px-8 py-4 font-mono text-base uppercase tracking-wider transition-all min-h-[56px]"
                disabled={loading}
                data-testid="cancel-btn"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-sm px-12 py-4 font-mono text-base font-bold uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 min-h-[56px]"
                data-testid="analyze-btn"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading ? t('analyzing') : t('analyze')}
              </button>
            </div>
          </div>

          {/* Analysis Progress */}
          {loading && (
            <div className="mt-8 bg-white border border-slate-200 p-6 relative overflow-hidden" data-testid="analysis-progress">
              <div className="scanline animate-scan"></div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-widest text-slate-500">Processing</span>
                  <Loader2 className="w-5 h-5 text-slate-900 animate-spin" />
                </div>
                <div className="space-y-2 font-mono text-sm text-slate-600">
                  <p>✓ Content validated</p>
                  <p>✓ Running AI analysis...</p>
                  <p>✓ Detecting scam patterns...</p>
                  <p>✓ Generating evidence report...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AnalysisPage;
