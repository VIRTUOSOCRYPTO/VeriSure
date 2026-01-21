import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';

const VoiceOutput = ({ text, autoPlay = false }) => {
  const { language } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [synthesis, setSynthesis] = useState(null);

  useEffect(() => {
    if (window.speechSynthesis) {
      setSynthesis(window.speechSynthesis);
    }
  }, []);

  useEffect(() => {
    if (autoPlay && text && synthesis) {
      speak();
    }
  }, [text, autoPlay]);

  const speak = () => {
    if (!synthesis) {
      toast.error('Text-to-speech not supported in your browser');
      return;
    }

    if (isSpeaking) {
      synthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set language
    const langMap = {
      'en': 'en-IN',
      'hi': 'hi-IN',
      'ta': 'ta-IN',
      'bn': 'bn-IN'
    };
    utterance.lang = langMap[language] || 'en-IN';
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsSpeaking(false);
      toast.error('Failed to read text aloud');
    };

    synthesis.speak(utterance);
  };

  if (!synthesis) {
    return null; // Don't show button if not supported
  }

  return (
    <button
      onClick={speak}
      className={`flex items-center gap-2 px-4 py-3 rounded-sm font-mono text-sm uppercase tracking-wider transition-all min-h-[44px] ${
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
          Stop
        </>
      ) : (
        <>
          <Volume2 className="w-5 h-5" />
          Read Aloud
        </>
      )}
    </button>
  );
};

export default VoiceOutput;
