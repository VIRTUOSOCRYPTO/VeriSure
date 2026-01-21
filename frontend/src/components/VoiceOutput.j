import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';

const VoiceOutput = ({ text }) => {
  const { language, t } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check if browser supports speech synthesis
    if (!window.speechSynthesis) {
      setIsSupported(false);
    }
  }, []);

  useEffect(() => {
    // Stop speaking when component unmounts or text changes
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [text]);

  const speak = () => {
    if (!window.speechSynthesis || !text) return;

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    // Map language codes to speech synthesis language codes
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

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langMap[language] || 'en-IN';
    utterance.rate = 0.9; // Slightly slower for better comprehension
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      toast.error(t('voiceOutputError') || 'Voice output error. Please try again.');
    };

    // Get available voices and try to select an Indian voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith(langMap[language]) || 
      voice.lang.startsWith(language)
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
    toast.success(t('readingAloud') || 'Reading aloud...');
  };

  const stop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      toast.success(t('readingStopped') || 'Reading stopped');
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <button
      onClick={isSpeaking ? stop : speak}
      className={`flex items-center gap-2 px-6 py-3 rounded-sm font-mono text-sm uppercase tracking-wider transition-all min-h-[44px] ${
        isSpeaking
          ? 'bg-rose-600 text-white hover:bg-rose-700'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
      data-testid="voice-output-btn"
      aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
    >
      {isSpeaking ? (
        <>
          <VolumeX className="w-5 h-5" />
          {t('stopReading') || 'Stop'}
        </>
      ) : (
        <>
          <Volume2 className="w-5 h-5" />
          {t('readAloud')}
        </>
      )}
    </button>
  );
};

export default VoiceOutput;
