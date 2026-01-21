import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Upload, Type, Link as LinkIcon, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AnalysisPage = () => {
  const navigate = useNavigate();
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
        toast.error("Unsupported file type. Please upload PNG, JPG, MP4, or MOV files.");
        return;
      }
      setSelectedFile(file);
      toast.success(`File "${file.name}" selected`);
    }
  };

  const handleAnalyze = async () => {
    if (activeTab === "upload" && !selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }
    if (activeTab === "text" && !textInput.trim()) {
      toast.error("Please enter text to analyze");
      return;
    }
    if (activeTab === "url" && !urlInput.trim()) {
      toast.error("Please enter a URL to analyze");
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

      toast.success("Analysis complete!");
      navigate(`/results/${response.data.report_id}`, { state: { report: response.data } });
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error.response?.data?.detail || "Analysis failed. Please try again.");
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
              <h1 className="font-mono font-bold text-2xl text-slate-900">VeriSure</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-4" data-testid="analysis-label">
              Forensic Analysis
            </div>
            <h2 className="font-mono font-bold text-4xl tracking-tight text-slate-900 mb-4" data-testid="analysis-title">
              Submit Content for Analysis
            </h2>
            <p className="font-sans text-base text-slate-600 leading-relaxed" data-testid="analysis-description">
              Upload files, paste text, or provide URLs. VeriSure will analyze for AI origin and scam indicators.
            </p>
          </div>

          {/* Analysis Input Tabs */}
          <div className="bg-white border border-slate-200 p-6 md:p-8 relative overflow-hidden">
            <div className="scanline"></div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8" data-testid="input-tabs">
                <TabsTrigger value="upload" className="font-mono text-xs uppercase" data-testid="tab-upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="text" className="font-mono text-xs uppercase" data-testid="tab-text">
                  <Type className="w-4 h-4 mr-2" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="url" className="font-mono text-xs uppercase" data-testid="tab-url">
                  <LinkIcon className="w-4 h-4 mr-2" />
                  URL
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
                      {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="font-sans text-xs text-slate-500">
                      PNG, JPG, MP4, MOV (max 50MB)
                    </p>
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <textarea
                  className="w-full h-64 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-sm font-mono text-sm p-4 resize-none"
                  placeholder="Paste suspicious text, messages, or content here...\n\nExample: You have won 50 lakhs! Contact immediately to claim. Last chance before midnight."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  data-testid="text-input"
                />
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                <input
                  type="url"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-sm font-mono text-sm p-4"
                  placeholder="https://example.com/suspicious-content"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  data-testid="url-input"
                />
                <p className="font-sans text-xs text-slate-500">
                  Enter a URL pointing to an image, video, or webpage for analysis
                </p>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => navigate('/')}
                className="bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 rounded-sm px-8 py-3 font-mono text-sm uppercase tracking-wider transition-all"
                disabled={loading}
                data-testid="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-sm px-8 py-3 font-mono text-sm uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                data-testid="analyze-btn"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Analyzing..." : "Analyze"}
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