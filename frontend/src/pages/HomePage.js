import { useNavigate } from "react-router-dom";
import { Shield, Zap, Eye, Lock, AlertTriangle, CheckCircle, Upload } from "lucide-react";
import FontSizeControl from "@/components/FontSizeControl";
import LanguageSelector from "@/components/LanguageSelector";
import { useLanguage } from "@/context/LanguageContext";

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-slate-900" />
              <h1 className="font-mono font-bold text-2xl text-slate-900" data-testid="app-title">{t('appTitle')}</h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <FontSizeControl />
              <button
                onClick={() => navigate('/analyze')}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-sm px-6 py-3 font-mono text-sm uppercase tracking-wider transition-all active:scale-95 min-h-[44px]"
                data-testid="analyze-now-btn"
              >
                {t('analyzeNow')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 grid-bg opacity-50"></div>
        <div className="crosshair top-8 left-8"></div>
        <div className="crosshair top-8 right-8" style={{ borderLeft: 'none', borderRight: '2px solid #cbd5e1' }}></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-4" data-testid="hero-label">
                {t('heroLabel')}
              </div>
              <h2 className="font-mono font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-slate-900 mb-6" data-testid="hero-title">
                {t('heroTitle')}
              </h2>
              <p className="font-sans text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl" data-testid="hero-description">
                {t('heroDescription')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/analyze')}
                  className="bg-slate-900 text-white hover:bg-slate-800 rounded-sm px-8 py-4 font-mono text-base uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 min-h-[56px]"
                  data-testid="get-started-btn"
                >
                  <Upload className="w-5 h-5" />
                  {t('getStarted')}
                </button>
                <button
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-50 rounded-sm px-8 py-4 font-mono text-base uppercase tracking-wider transition-all min-h-[56px]"
                  data-testid="how-it-works-btn"
                >
                  {t('howItWorks')}
                </button>
              </div>

              {/* Quick Info Cards */}
              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-sm p-3 text-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                  <div className="font-mono text-xs text-emerald-700">{t('safe')}</div>
                </div>
                <div className="bg-amber-50 border-2 border-amber-200 rounded-sm p-3 text-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                  <div className="font-mono text-xs text-amber-700">{t('warning')}</div>
                </div>
                <div className="bg-rose-50 border-2 border-rose-200 rounded-sm p-3 text-center">
                  <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto mb-1" />
                  <div className="font-mono text-xs text-rose-700">{t('danger')}</div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="relative">
                <img 
                  src="https://images.pexels.com/photos/5473955/pexels-photo-5473955.jpeg" 
                  alt="Digital security visualization"
                  className="rounded-sm shadow-lg opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-4">{t('coreCapabilities')}</div>
            <h3 className="font-mono font-semibold text-3xl tracking-tight text-slate-900" data-testid="features-title">{t('forensicGradeProtection')}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border-2 border-slate-200 p-8 relative overflow-hidden hover:border-blue-500/50 transition-colors" data-testid="feature-origin">
              <div className="scanline"></div>
              <Eye className="w-12 h-12 text-slate-900 mb-4" />
              <h4 className="font-mono font-medium text-xl text-slate-800 mb-3">{t('originDetection')}</h4>
              <p className="font-sans text-base text-slate-600 leading-relaxed">
                {t('originDetectionDesc')}
              </p>
            </div>
            
            <div className="bg-white border-2 border-slate-200 p-8 relative overflow-hidden hover:border-blue-500/50 transition-colors" data-testid="feature-scam">
              <div className="scanline"></div>
              <Shield className="w-12 h-12 text-slate-900 mb-4" />
              <h4 className="font-mono font-medium text-xl text-slate-800 mb-3">{t('scamAssessment')}</h4>
              <p className="font-sans text-base text-slate-600 leading-relaxed">
                {t('scamAssessmentDesc')}
              </p>
            </div>
            
            <div className="bg-white border-2 border-slate-200 p-8 relative overflow-hidden hover:border-blue-500/50 transition-colors" data-testid="feature-evidence">
              <div className="scanline"></div>
              <Lock className="w-12 h-12 text-slate-900 mb-4" />
              <h4 className="font-mono font-medium text-xl text-slate-800 mb-3">{t('evidenceIntegrity')}</h4>
              <p className="font-sans text-base text-slate-600 leading-relaxed">
                {t('evidenceIntegrityDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="font-mono text-xs uppercase tracking-widest text-slate-500 mb-4">{t('process')}</div>
            <h3 className="font-mono font-semibold text-3xl tracking-tight text-slate-900">{t('howVeriSureWorks')}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-sm">1</div>
                <div>
                  <h5 className="font-mono font-medium text-lg text-slate-800 mb-2">{t('step1Title')}</h5>
                  <p className="font-sans text-sm text-slate-600">{t('step1Desc')}</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-sm">2</div>
                <div>
                  <h5 className="font-mono font-medium text-lg text-slate-800 mb-2">{t('step2Title')}</h5>
                  <p className="font-sans text-sm text-slate-600">{t('step2Desc')}</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-mono text-sm">3</div>
                <div>
                  <h5 className="font-mono font-medium text-lg text-slate-800 mb-2">{t('step3Title')}</h5>
                  <p className="font-sans text-sm text-slate-600">{t('step3Desc')}</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src="https://images.pexels.com/photos/12375509/pexels-photo-12375509.jpeg" 
                alt="Digital fingerprint scan"
                className="rounded-sm shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Notice */}
      <section className="py-16 bg-slate-100 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <Lock className="w-12 h-12 text-slate-900 mx-auto mb-6" />
            <h4 className="font-mono font-semibold text-2xl text-slate-900 mb-4">{t('privacyFirst')}</h4>
            <p className="font-sans text-base text-slate-600 leading-relaxed mb-6">
              {t('privacyDesc')}
            </p>
            <ul className="font-mono text-sm text-slate-600 space-y-2">
              <li>{t('privacyPoint1')}</li>
              <li>{t('privacyPoint2')}</li>
              <li>{t('privacyPoint3')}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Shield className="w-6 h-6" />
              <span className="font-mono font-bold text-xl">{t('appTitle')}</span>
            </div>
            <p className="font-mono text-xs text-slate-400 uppercase tracking-widest">{t('footer')}</p>
            <p className="font-sans text-sm text-slate-500 mt-4">{t('footerDisclaimer')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
