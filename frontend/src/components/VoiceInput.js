import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';

const VoiceInput = ({ onTranscript, disabled }) => {
  const { language, t } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      
      // Set language based on selected language
      const langMap = {
        'en': 'en-IN',
        'hi': 'hi-IN',
        'ta': 'ta-IN',
        'bn': 'bn-IN'
      };
      recognitionInstance.lang = langMap[language] || 'en-IN';

      recognitionInstance.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        if (onTranscript) {
          onTranscript(transcript);
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast.error(`Voice recognition error: ${event.error}`);
        }
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    } else {
      console.warn('Speech recognition not supported in this browser');
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [language]);

  const toggleListening = () => {
    if (!recognition) {
      toast.error('Voice recognition not supported in your browser');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      toast.success(t('listening'));
    }
  };

  if (!recognition) {
    return null; // Don't show button if not supported
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-3 rounded-sm font-mono text-sm uppercase tracking-wider transition-all min-h-[44px] ${
        isListening
          ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      data-testid="voice-input-btn"
      aria-label={isListening ? t('stopRecording') : t('recordVoice')}
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
  );
};

export default VoiceInput;
