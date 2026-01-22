import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AsyncJobStatus = ({ jobId, jobType = "video" }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("PENDING");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let pollInterval;
    
    const pollJobStatus = async () => {
      try {
        const response = await axios.get(`${API}/job/${jobId}`);
        const data = response.data;
        
        setStatus(data.status);
        setProgress(data.progress || 0);
        
        if (data.status === "SUCCESS" && data.result) {
          setResult(data.result);
          setProgress(100);
          clearInterval(pollInterval);
          
          // Auto-redirect to results page after 1 second
          setTimeout(() => {
            navigate(`/results/${data.result.report_id}`, { state: { report: data.result } });
            toast.success("Analysis complete!");
          }, 1000);
        } else if (data.status === "FAILURE") {
          setError(data.error || "Job failed");
          clearInterval(pollInterval);
          toast.error("Analysis failed: " + (data.error || "Unknown error"));
        }
      } catch (err) {
        console.error("Polling error:", err);
        setError("Failed to fetch job status");
        clearInterval(pollInterval);
      }
    };
    
    // Poll immediately, then every 2 seconds
    pollJobStatus();
    pollInterval = setInterval(pollJobStatus, 2000);
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [jobId, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case "PENDING":
        return <Clock className="w-8 h-8 text-amber-600 animate-pulse" />;
      case "STARTED":
        return <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />;
      case "SUCCESS":
        return <CheckCircle className="w-8 h-8 text-emerald-600" />;
      case "FAILURE":
        return <AlertTriangle className="w-8 h-8 text-rose-600" />;
      default:
        return <Loader2 className="w-8 h-8 text-slate-600 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "PENDING":
        return "Waiting in queue...";
      case "STARTED":
        return `Processing ${jobType} analysis...`;
      case "SUCCESS":
        return "Analysis complete!";
      case "FAILURE":
        return "Analysis failed";
      default:
        return "Processing...";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "PENDING":
        return "border-amber-200 bg-amber-50";
      case "STARTED":
        return "border-blue-200 bg-blue-50";
      case "SUCCESS":
        return "border-emerald-200 bg-emerald-50";
      case "FAILURE":
        return "border-rose-200 bg-rose-50";
      default:
        return "border-slate-200 bg-slate-50";
    }
  };

  return (
    <div className={`border-2 p-8 rounded-sm relative overflow-hidden ${getStatusColor()}`} data-testid="async-job-status">
      <div className="scanline"></div>
      
      <div className="flex items-center gap-6 mb-6">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-2">
            {jobType.toUpperCase()} ANALYSIS
          </div>
          <h3 className="font-mono font-bold text-2xl text-slate-900 mb-2" data-testid="job-status-text">
            {getStatusText()}
          </h3>
          <p className="font-sans text-sm text-slate-600">
            Job ID: <span className="font-mono text-xs">{jobId.slice(0, 16)}...</span>
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {status !== "FAILURE" && (
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="font-mono text-xs text-slate-600">Progress</span>
            <span className="font-mono text-xs font-bold text-slate-900">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" data-testid="job-progress-bar" />
        </div>
      )}

      {/* Status Messages */}
      <div className="space-y-2 font-mono text-sm text-slate-600">
        {status === "PENDING" && (
          <>
            <p>⏳ Job queued for processing</p>
            <p className="text-slate-500">• Waiting for available worker...</p>
          </>
        )}
        {status === "STARTED" && (
          <>
            <p>✓ Job started</p>
            <p className="text-slate-500">• Extracting frames and analyzing content...</p>
            <p className="text-slate-500">• Running forensic analysis...</p>
            <p className="text-slate-500">• Detecting scam patterns...</p>
          </>
        )}
        {status === "SUCCESS" && (
          <>
            <p className="text-emerald-600">✓ Analysis completed successfully</p>
            <p className="text-slate-500">• Redirecting to results...</p>
          </>
        )}
        {status === "FAILURE" && (
          <>
            <p className="text-rose-600">✗ Analysis failed</p>
            <p className="text-slate-600">Error: {error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-sm font-mono text-xs uppercase"
            >
              Try Again
            </button>
          </>
        )}
      </div>

      {/* Loading Animation */}
      {(status === "PENDING" || status === "STARTED") && (
        <div className="mt-6 flex items-center gap-2 text-slate-400">
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>
      )}
    </div>
  );
};

export default AsyncJobStatus;
