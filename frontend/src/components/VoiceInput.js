import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';

const VoiceInput = ({ onTranscript, disabled = false }) => {
  const { language, t } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;

    // Map language codes to speech recognition language codes
    const langMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'ta': 'ta-IN',
      'bn': 'bn-IN',
      'mr': 'mr-IN',
      'te': 'te-IN',
      'gu': 'gu-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'pa': 'pa-IN'
    };

    recognitionInstance.lang = langMap[language] || 'en-IN';

    let finalTranscript = '';

    recognitionInstance.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript.trim());
      }
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        toast.error(t('noSpeechDetected') || 'No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        toast.error(t('micPermissionDenied') || 'Microphone permission denied.');
      } else {
        toast.error(t('voiceInputError') || 'Voice input error. Please try again.');
      }
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [language, onTranscript, t]);

  const toggleListening = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      toast.success(t('recordingStopped') || 'Recording stopped');
    } else {
      try {
        recognition.start();
        setIsListening(true);
        toast.success(t('recordingStarted') || 'Recording started. Speak now...');
      } catch (error) {
        console.error('Error starting recognition:', error);
        toast.error(t('voiceInputError') || 'Failed to start voice input');
      }
    }
  };

  if (!isSupported) {
    return (
      <div className="text-sm text-slate-500 italic" data-testid="voice-not-supported">
        {t('voiceNotSupported') || 'Voice input not supported in this browser. Try Chrome or Edge.'}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3" data-testid="voice-input">
      <button
        onClick={toggleListening}
        disabled={disabled}
        className={`flex items-center gap-2 px-6 py-3 rounded-sm font-mono text-sm uppercase tracking-wider transition-all min-h-[44px] ${
          isListening
            ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        data-testid="voice-toggle-btn"
      >
        {isListening ? (
          <>
            <MicOff className="w-5 h-5" />
            {t('stopRecording')}
          </>
        ) : (
          <>
            <Mic className="w-5 h-5" />
            {t('recordVoice')}
          </>
        )}
      </button>
      {isListening && (
        <span className="text-sm text-slate-600 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('listening')}
        </span>
      )}
    </div>
  );
};

export default VoiceInput;
