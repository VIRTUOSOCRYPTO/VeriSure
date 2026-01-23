import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';

const OnboardingTutorial = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('verisure_onboarding_completed');
    if (!hasCompletedOnboarding) {
      setIsVisible(true);
    }
  }, []);

  const steps = [
    {
      title: "Welcome to VeriSure! 🎉",
      description: "Your trusted AI-powered scam detection platform for India. Let's take a quick tour to get you started.",
      image: "🛡️",
      highlight: null
    },
    {
      title: "Multi-Modal Analysis",
      description: "Analyze text messages, images, videos, and audio files for AI-generated content and scam patterns. We support all major content types!",
      image: "🔍",
      features: [
        "Text & URL analysis",
        "Image forensics",
        "Video deepfake detection",
        "Audio voice clone detection"
      ]
    },
    {
      title: "India-Specific Scam Detection",
      description: "Our system recognizes 250+ India-specific scam patterns including police threats, family emergencies, UPI frauds, and more.",
      image: "🇮🇳",
      features: [
        "Police/CBI threat detection",
        "Banking & UPI fraud",
        "Family emergency scams",
        "Delivery & customs fraud"
      ]
    },
    {
      title: "Instant Results & History",
      description: "Get detailed analysis reports with risk levels, scam patterns, and recommendations. Access your analysis history anytime.",
      image: "📊",
      features: [
        "Risk level assessment",
        "Detailed forensic evidence",
        "Actionable recommendations",
        "Searchable history"
      ]
    },
    {
      title: "Multi-Language Support",
      description: "VeriSure supports 10 Indian languages! Switch languages anytime from the language selector.",
      image: "🌐",
      features: [
        "Hindi, Tamil, Telugu",
        "Bengali, Marathi, Gujarati",
        "Kannada, Malayalam, Punjabi",
        "English"
      ]
    },
    {
      title: "You're All Set! 🚀",
      description: "Start analyzing content now to protect yourself from scams. Remember: If something feels suspicious, analyze it with VeriSure!",
      image: "✅",
      cta: true
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('verisure_onboarding_completed', 'true');
    setIsVisible(false);
    if (onComplete) {
      onComplete();
    }
  };

  if (!isVisible) {
    return null;
  }

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[#F8FAFC] rounded-sm shadow-2xl max-w-2xl w-full mx-4 overflow-hidden border-2 border-slate-200">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 rounded-sm hover:bg-slate-100 transition-colors z-10"
          aria-label="Close tutorial"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        {/* Content */}
        <div className="p-8 md:p-12">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-mono font-medium text-slate-600 uppercase tracking-wider">
                Step {currentStep + 1} of {steps.length}
              </span>
              <button
                onClick={handleSkip}
                className="text-sm text-slate-600 hover:text-slate-900 font-mono uppercase tracking-wider font-medium"
              >
                Skip tutorial
              </button>
            </div>
            <div className="h-2 bg-slate-200 rounded-sm overflow-hidden">
              <div
                className="h-full bg-slate-900 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Icon/Image */}
          <div className="text-center mb-6">
            <div className="text-7xl mb-4">{step.image}</div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-mono font-bold text-slate-900 text-center mb-4">
            {step.title}
          </h2>

          {/* Description */}
          <p className="text-lg font-sans text-slate-600 text-center mb-6">
            {step.description}
          </p>

          {/* Features list */}
          {step.features && (
            <div className="mb-6">
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {step.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 font-sans text-slate-700">
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-4 mt-8">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-sm font-mono font-medium uppercase tracking-wider transition-colors ${
                currentStep === 0
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex gap-2">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentStep
                      ? 'bg-slate-900 w-8'
                      : idx < currentStep
                      ? 'bg-slate-400'
                      : 'bg-slate-300'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-sm font-mono font-medium uppercase tracking-wider hover:bg-slate-800 transition-colors"
            >
              {isLastStep ? (
                <>
                  Get Started
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Decorative elements - Subtle slate tones */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-300/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-300/10 rounded-full blur-3xl -z-10 transform -translate-x-1/2 translate-y-1/2" />
      </div>
    </div>
  );
};

export default OnboardingTutorial;
