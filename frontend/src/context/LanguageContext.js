import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

const translations = {
  en: {
    // Header
    appTitle: 'VeriSure',
    analyzeNow: 'Analyze Now',
    newAnalysis: 'New Analysis',
    
    // Home Page
    heroLabel: 'Advanced AI Forensics',
    heroTitle: 'Detect AI Content & Scam Threats',
    heroDescription: 'VeriSure provides forensic-grade analysis to identify AI-generated content and assess scam risk. Protect yourself from deepfakes, manipulated media, and social engineering attacks targeting Indians.',
    getStarted: 'Get Started',
    howItWorks: 'How It Works',
    safe: 'Safe',
    warning: 'Warning',
    danger: 'Danger',
    
    // Analysis Page
    forensicAnalysis: 'Forensic Analysis',
    submitContent: 'Submit Content for Analysis',
    submitDescription: 'Upload files, paste text, or provide URLs. VeriSure will analyze for AI origin and scam indicators.',
    upload: 'Upload',
    text: 'Text',
    url: 'URL',
    clickToUpload: 'Click to upload or drag and drop',
    fileTypes: 'PNG, JPG, MP4, MOV (max 50MB)',
    pasteText: 'Paste suspicious text, messages, or content here...',
    enterUrl: 'https://example.com/suspicious-content',
    urlDescription: 'Enter a URL pointing to an image, video, or webpage for analysis',
    cancel: 'Cancel',
    analyze: 'Analyze Now',
    analyzing: 'Analyzing...',
    recordVoice: 'Record Voice',
    stopRecording: 'Stop Recording',
    listening: 'Listening...',
    
    // Results Page
    analysisReport: 'Analysis Report',
    forensicComplete: 'Forensic Analysis Complete',
    highRisk: 'HIGH RISK - LIKELY SCAM',
    highRiskWarning: 'DO NOT respond or share any information!',
    mediumRisk: 'MEDIUM RISK - Be Careful',
    lowRisk: 'LOW RISK - Appears Safe',
    originClassification: 'Origin Classification',
    confidence: 'confidence',
    indicators: 'Indicators',
    scamRisk: 'Scam Risk Level',
    patternsDetected: 'Patterns Detected',
    evidenceSummary: 'Evidence Summary',
    signalsDetected: 'Signals Detected',
    forensicNotes: 'Forensic Notes',
    reportDetails: 'Report Details',
    reportId: 'Report ID',
    timestamp: 'Timestamp',
    contentHash: 'Content Hash (SHA-256)',
    recommendedActions: 'Recommended Actions',
    analysisSummary: 'Analysis Summary',
    limitations: 'Limitations',
    readAloud: 'Read Aloud',
    shareWhatsApp: 'Share on WhatsApp',
    
    // Risk Levels
    highRiskLabel: 'HIGH RISK',
    mediumRiskLabel: 'MEDIUM RISK',
    lowRiskLabel: 'LOW RISK',
    
    // Toast Messages
    fileSelected: 'File selected',
    selectFile: 'Please select a file to upload',
    enterText: 'Please enter text to analyze',
    enterUrlText: 'Please enter a URL to analyze',
    analysisComplete: 'Analysis complete!',
    analysisFailed: 'Analysis failed. Please try again.',
    unsupportedFile: 'Unsupported file type. Please upload PNG, JPG, MP4, or MOV files.',
  },
  hi: {
    // Header
    appTitle: 'VeriSure',
    analyzeNow: 'अभी जांचें',
    newAnalysis: 'नई जांच',
    
    // Home Page
    heroLabel: 'उन्नत AI फोरेंसिक',
    heroTitle: 'AI सामग्री और धोखाधड़ी का पता लगाएं',
    heroDescription: 'VeriSure AI-निर्मित सामग्री की पहचान करने और घोटाले के जोखिम का आकलन करने के लिए फोरेंसिक-ग्रेड विश्लेषण प्रदान करता है। भारतीयों को लक्षित करने वाले डीपफेक, हेरफेर की गई मीडिया और सोशल इंजीनियरिंग हमलों से खुद को बचाएं।',
    getStarted: 'शुरू करें',
    howItWorks: 'यह कैसे काम करता है',
    safe: 'सुरक्षित',
    warning: 'चेतावनी',
    danger: 'खतरा',
    
    // Analysis Page
    forensicAnalysis: 'फोरेंसिक विश्लेषण',
    submitContent: 'विश्लेषण के लिए सामग्री जमा करें',
    submitDescription: 'फ़ाइलें अपलोड करें, टेक्स्ट पेस्ट करें, या URL प्रदान करें। VeriSure AI मूल और घोटाले के संकेतकों के लिए विश्लेषण करेगा।',
    upload: 'अपलोड',
    text: 'टेक्स्ट',
    url: 'URL',
    clickToUpload: 'अपलोड करने के लिए क्लिक करें या ड्रैग करें',
    fileTypes: 'PNG, JPG, MP4, MOV (अधिकतम 50MB)',
    pasteText: 'यहां संदिग्ध टेक्स्ट, संदेश या सामग्री पेस्ट करें...',
    enterUrl: 'https://example.com/suspicious-content',
    urlDescription: 'विश्लेषण के लिए एक छवि, वीडियो या वेबपेज की ओर इशारा करते हुए URL दर्ज करें',
    cancel: 'रद्द करें',
    analyze: 'अभी जांचें',
    analyzing: 'जांच हो रही है...',
    recordVoice: 'आवाज रिकॉर्ड करें',
    stopRecording: 'रिकॉर्डिंग बंद करें',
    listening: 'सुन रहा हूं...',
    
    // Results Page
    analysisReport: 'विश्लेषण रिपोर्ट',
    forensicComplete: 'फोरेंसिक विश्लेषण पूर्ण',
    highRisk: 'उच्च जोखिम - संभावित घोटाला',
    highRiskWarning: 'जवाब न दें या कोई जानकारी साझा न करें!',
    mediumRisk: 'मध्यम जोखिम - सावधान रहें',
    lowRisk: 'कम जोखिम - सुरक्षित दिखता है',
    originClassification: 'मूल वर्गीकरण',
    confidence: 'विश्वास',
    indicators: 'संकेतक',
    scamRisk: 'घोटाले का जोखिम स्तर',
    patternsDetected: 'पैटर्न का पता चला',
    evidenceSummary: 'साक्ष्य सारांश',
    signalsDetected: 'संकेत का पता चला',
    forensicNotes: 'फोरेंसिक नोट्स',
    reportDetails: 'रिपोर्ट विवरण',
    reportId: 'रिपोर्ट ID',
    timestamp: 'समय टिकट',
    contentHash: 'सामग्री हैश (SHA-256)',
    recommendedActions: 'अनुशंसित कार्रवाई',
    analysisSummary: 'विश्लेषण सारांश',
    limitations: 'सीमाएं',
    readAloud: 'ज़ोर से पढ़ें',
    shareWhatsApp: 'WhatsApp पर शेयर करें',
    
    // Risk Levels
    highRiskLabel: 'उच्च जोखिम',
    mediumRiskLabel: 'मध्यम जोखिम',
    lowRiskLabel: 'कम जोखिम',
    
    // Toast Messages
    fileSelected: 'फ़ाइल चुनी गई',
    selectFile: 'कृपया अपलोड करने के लिए एक फ़ाइल चुनें',
    enterText: 'कृपया विश्लेषण के लिए टेक्स्ट दर्ज करें',
    enterUrlText: 'कृपया विश्लेषण के लिए URL दर्ज करें',
    analysisComplete: 'विश्लेषण पूर्ण!',
    analysisFailed: 'विश्लेषण विफल। कृपया पुनः प्रयास करें।',
    unsupportedFile: 'असमर्थित फ़ाइल प्रकार। कृपया PNG, JPG, MP4, या MOV फ़ाइलें अपलोड करें।',
  },
  ta: {
    // Header
    appTitle: 'VeriSure',
    analyzeNow: 'இப்போது பகுப்பாய்வு செய்க',
    newAnalysis: 'புதிய பகுப்பாய்வு',
    
    // Home Page
    heroLabel: 'மேம்பட்ட AI தடயவியல்',
    heroTitle: 'AI உள்ளடக்கம் மற்றும் மோசடி அச்சுறுத்தல்களைக் கண்டறியவும்',
    heroDescription: 'VeriSure AI-உருவாக்கிய உள்ளடக்கத்தை அடையாளம் காணவும் மோசடி அபாயத்தை மதிப்பிடவும் தடயவியல்-தர பகுப்பாய்வை வழங்குகிறது.',
    getStarted: 'தொடங்குங்கள்',
    howItWorks: 'இது எவ்வாறு செயல்படுகிறது',
    safe: 'பாதுகாப்பானது',
    warning: 'எச்சரிக்கை',
    danger: 'ஆபத்து',
    
    // Analysis Page
    forensicAnalysis: 'தடயவியல் பகுப்பாய்வு',
    submitContent: 'பகுப்பாய்வுக்காக உள்ளடக்கத்தைச் சமர்ப்பிக்கவும்',
    submitDescription: 'கோப்புகளை பதிவேற்றவும், உரையை ஒட்டவும் அல்லது URL களை வழங்கவும்.',
    upload: 'பதிவேற்றம்',
    text: 'உரை',
    url: 'URL',
    clickToUpload: 'பதிவேற்ற கிளிக் செய்க',
    fileTypes: 'PNG, JPG, MP4, MOV (அதிகபட்சம் 50MB)',
    pasteText: 'சந்தேகத்திற்குரிய உரை, செய்திகள் அல்லது உள்ளடக்கத்தை இங்கே ஒட்டவும்...',
    enterUrl: 'https://example.com/suspicious-content',
    urlDescription: 'பகுப்பாய்வுக்கான படம், வீடியோ அல்லது வலைப்பக்கத்தை குறிக்கும் URL ஐ உள்ளிடவும்',
    cancel: 'ரத்துசெய்',
    analyze: 'இப்போது பகுப்பாய்வு செய்க',
    analyzing: 'பகுப்பாய்வு செய்யப்படுகிறது...',
    recordVoice: 'குரலை பதிவுசெய்க',
    stopRecording: 'பதிவை நிறுத்து',
    listening: 'கேட்கிறது...',
    
    // Results Page
    analysisReport: 'பகுப்பாய்வு அறிக்கை',
    forensicComplete: 'தடயவியல் பகுப்பாய்வு முழுமை',
    highRisk: 'உயர் ஆபத்து - மோசடி சாத்தியம்',
    highRiskWarning: 'பதிலளிக்காதீர்கள் அல்லது எந்த தகவலையும் பகிர்ந்து கொள்ளாதீர்கள்!',
    mediumRisk: 'மிதமான ஆபத்து - கவனமாக இருங்கள்',
    lowRisk: 'குறைந்த ஆபத்து - பாதுகாப்பாக தெரிகிறது',
    originClassification: 'தோற்ற வகைப்பாடு',
    confidence: 'நம்பிக்கை',
    indicators: 'குறிகாட்டிகள்',
    scamRisk: 'மோசடி ஆபத்து நிலை',
    patternsDetected: 'வடிவங்கள் கண்டறியப்பட்டன',
    evidenceSummary: 'சான்று சுருக்கம்',
    signalsDetected: 'சமிக்ஞைகள் கண்டறியப்பட்டன',
    forensicNotes: 'தடயவியல் குறிப்புகள்',
    reportDetails: 'அறிக்கை விவரங்கள்',
    reportId: 'அறிக்கை ID',
    timestamp: 'நேர முத்திரை',
    contentHash: 'உள்ளடக்க ஹாஷ் (SHA-256)',
    recommendedActions: 'பரிந்துரைக்கப்பட்ட நடவடிக்கைகள்',
    analysisSummary: 'பகுப்பாய்வு சுருக்கம்',
    limitations: 'வரம்புகள்',
    readAloud: 'உரக்கப் படிக்கவும்',
    shareWhatsApp: 'WhatsApp இல் பகிரவும்',
    
    // Risk Levels
    highRiskLabel: 'உயர் ஆபத்து',
    mediumRiskLabel: 'மிதமான ஆபத்து',
    lowRiskLabel: 'குறைந்த ஆபத்து',
    
    // Toast Messages
    fileSelected: 'கோப்பு தேர்ந்தெடுக்கப்பட்டது',
    selectFile: 'பதிவேற்ற ஒரு கோப்பைத் தேர்ந்தெடுக்கவும்',
    enterText: 'பகுப்பாய்வுக்கான உரையை உள்ளிடவும்',
    enterUrlText: 'பகுப்பாய்வுக்கான URL ஐ உள்ளிடவும்',
    analysisComplete: 'பகுப்பாய்வு முழுமை!',
    analysisFailed: 'பகுப்பாய்வு தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.',
    unsupportedFile: 'ஆதரிக்கப்படாத கோப்பு வகை. PNG, JPG, MP4 அல்லது MOV கோப்புகளை பதிவேற்றவும்.',
  },
  bn: {
    // Header
    appTitle: 'VeriSure',
    analyzeNow: 'এখনই বিশ্লেষণ করুন',
    newAnalysis: 'নতুন বিশ্লেষণ',
    
    // Home Page
    heroLabel: 'উন্নত AI ফরেনসিক',
    heroTitle: 'AI কন্টেন্ট এবং স্ক্যাম হুমকি সনাক্ত করুন',
    heroDescription: 'VeriSure AI-উৎপন্ন বিষয়বস্তু সনাক্ত করতে এবং স্ক্যাম ঝুঁকি মূল্যায়ন করতে ফরেনসিক-গ্রেড বিশ্লেষণ প্রদান করে।',
    getStarted: 'শুরু করুন',
    howItWorks: 'এটি কীভাবে কাজ করে',
    safe: 'নিরাপদ',
    warning: 'সতর্কতা',
    danger: 'বিপদ',
    
    // Analysis Page
    forensicAnalysis: 'ফরেনসিক বিশ্লেষণ',
    submitContent: 'বিশ্লেষণের জন্য বিষয়বস্তু জমা দিন',
    submitDescription: 'ফাইল আপলোড করুন, টেক্সট পেস্ট করুন বা URL প্রদান করুন।',
    upload: 'আপলোড',
    text: 'পাঠ্য',
    url: 'URL',
    clickToUpload: 'আপলোড করতে ক্লিক করুন',
    fileTypes: 'PNG, JPG, MP4, MOV (সর্বোচ্চ 50MB)',
    pasteText: 'এখানে সন্দেহজনক টেক্সট, বার্তা বা বিষয়বস্তু পেস্ট করুন...',
    enterUrl: 'https://example.com/suspicious-content',
    urlDescription: 'বিশ্লেষণের জন্য একটি ছবি, ভিডিও বা ওয়েবপেজ নির্দেশ করে এমন URL লিখুন',
    cancel: 'বাতিল করুন',
    analyze: 'এখনই বিশ্লেষণ করুন',
    analyzing: 'বিশ্লেষণ করা হচ্ছে...',
    recordVoice: 'ভয়েস রেকর্ড করুন',
    stopRecording: 'রেকর্ডিং বন্ধ করুন',
    listening: 'শুনছি...',
    
    // Results Page
    analysisReport: 'বিশ্লেষণ রিপোর্ট',
    forensicComplete: 'ফরেনসিক বিশ্লেষণ সম্পূর্ণ',
    highRisk: 'উচ্চ ঝুঁকি - সম্ভাব্য স্ক্যাম',
    highRiskWarning: 'জবাব দেবেন না বা কোনো তথ্য শেয়ার করবেন না!',
    mediumRisk: 'মাঝারি ঝুঁকি - সতর্ক থাকুন',
    lowRisk: 'কম ঝুঁকি - নিরাপদ মনে হচ্ছে',
    originClassification: 'উৎপত্তি শ্রেণীবিভাগ',
    confidence: 'আত্মবিশ্বাস',
    indicators: 'সূচক',
    scamRisk: 'স্ক্যাম ঝুঁকি স্তর',
    patternsDetected: 'প্যাটার্ন সনাক্ত করা হয়েছে',
    evidenceSummary: 'প্রমাণ সারাংশ',
    signalsDetected: 'সংকেত সনাক্ত করা হয়েছে',
    forensicNotes: 'ফরেনসিক নোট',
    reportDetails: 'রিপোর্ট বিবরণ',
    reportId: 'রিপোর্ট ID',
    timestamp: 'টাইমস্ট্যাম্প',
    contentHash: 'কন্টেন্ট হ্যাশ (SHA-256)',
    recommendedActions: 'প্রস্তাবিত পদক্ষেপ',
    analysisSummary: 'বিশ্লেষণ সারাংশ',
    limitations: 'সীমাবদ্ধতা',
    readAloud: 'জোরে পড়ুন',
    shareWhatsApp: 'WhatsApp এ শেয়ার করুন',
    
    // Risk Levels
    highRiskLabel: 'উচ্চ ঝুঁকি',
    mediumRiskLabel: 'মাঝারি ঝুঁকি',
    lowRiskLabel: 'কম ঝুঁকি',
    
    // Toast Messages
    fileSelected: 'ফাইল নির্বাচিত',
    selectFile: 'আপলোড করার জন্য একটি ফাইল নির্বাচন করুন',
    enterText: 'বিশ্লেষণের জন্য টেক্সট লিখুন',
    enterUrlText: 'বিশ্লেষণের জন্য URL লিখুন',
    analysisComplete: 'বিশ্লেষণ সম্পূর্ণ!',
    analysisFailed: 'বিশ্লেষণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
    unsupportedFile: 'অসমর্থিত ফাইল প্রকার। PNG, JPG, MP4, বা MOV ফাইল আপলোড করুন।',
  }
};

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳', nativeName: 'தமிழ்' },
  { code: 'bn', name: 'Bengali', flag: '🇮🇳', nativeName: 'বাংলা' },
];

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  };

  const value = {
    language,
    setLanguage,
    t,
    languages,
    currentLanguage: languages.find(l => l.code === language)
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
