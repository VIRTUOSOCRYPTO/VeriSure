import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronDown, ChevronUp, BookOpen, Video, MessageCircle,
  Shield, Image, FileText, Mic, Film, Users, TrendingUp
} from 'lucide-react';

const HelpCenterPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);

  const faqSections = [
    {
      title: 'Getting Started',
      icon: <BookOpen className="w-5 h-5" />,
      questions: [
        {
          q: 'What is VeriSure?',
          a: 'VeriSure is an AI-powered platform that helps detect scams, AI-generated content, and manipulated media. We combine forensic analysis with advanced AI to protect you from online fraud.'
        },
        {
          q: 'How do I create an account?',
          a: 'Click on "Sign Up" in the top right corner, enter your email, create a password, and verify your email. You can start analyzing content immediately with our free tier (100 analyses/day).'
        },
        {
          q: 'Is VeriSure free to use?',
          a: 'Yes! We offer a generous free tier with 100 analyses per day. For power users, we have Premium (₹99/month) and Enterprise (₹9,999/month) plans with unlimited analyses and additional features.'
        },
        {
          q: 'Which languages does VeriSure support?',
          a: 'VeriSure supports 10 Indian languages: English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, and Punjabi. Switch languages anytime from the language selector.'
        }
      ]
    },
    {
      title: 'Analysis Features',
      icon: <Shield className="w-5 h-5" />,
      questions: [
        {
          q: 'What types of content can I analyze?',
          a: 'VeriSure supports text messages, URLs, images (JPG, PNG, WebP), videos (MP4, MOV), and audio files (MP3, WAV). We can detect scams, AI-generated content, deepfakes, and voice clones.'
        },
        {
          q: 'How accurate is the scam detection?',
          a: 'Our India-specific scam detection has ~95% accuracy, trained on 250+ scam patterns. AI content detection is ~85-90% accurate. We combine forensic evidence (EXIF, metadata) with AI analysis for maximum accuracy.'
        },
        {
          q: 'What are the risk levels?',
          a: 'We classify content into three risk levels: HIGH (immediate threat, do not respond), MEDIUM (exercise caution, verify independently), and LOW (appears safe, but stay vigilant).'
        },
        {
          q: 'Can I analyze multiple files at once?',
          a: 'Yes! Use our Batch Analysis feature to analyze up to 10 files simultaneously. Go to the Batch Analysis page and drag & drop your files.'
        },
        {
          q: 'How long does analysis take?',
          a: 'Text and images: 2-5 seconds. Videos and audio: 5-10 minutes (processed asynchronously). You\'ll receive a notification when video/audio analysis completes.'
        }
      ]
    },
    {
      title: 'India-Specific Scams',
      icon: <TrendingUp className="w-5 h-5" />,
      questions: [
        {
          q: 'What India-specific scams does VeriSure detect?',
          a: 'We detect: Police/CBI threats, family emergency scams, Aadhaar/PAN fraud, UPI/banking scams, fake delivery/customs messages, tax refund frauds, job scams, and investment frauds.'
        },
        {
          q: 'What should I do if VeriSure detects a high-risk scam?',
          a: 'DO NOT respond or share any information. Block the sender immediately. Preserve the evidence (screenshot/save). Report to cybercrime.gov.in if financial loss occurred. Warn family members.'
        },
        {
          q: 'How do I recognize OTP phishing?',
          a: 'Legitimate companies NEVER ask for OTPs via SMS, WhatsApp, or calls. If someone asks you to "share" or "forward" an OTP, it\'s 100% a scam. VeriSure detects OTP phishing attempts.'
        },
        {
          q: 'What are behavioral flags?',
          a: 'Behavioral flags indicate manipulation tactics: urgency pressure, secrecy demands, authority impersonation, emotional exploitation, and credential harvesting. Multiple flags = higher risk.'
        }
      ]
    },
    {
      title: 'Technical Details',
      icon: <Film className="w-5 h-5" />,
      questions: [
        {
          q: 'How does image forensics work?',
          a: 'We analyze EXIF metadata (camera info, timestamps), compression artifacts, error level analysis, and visual consistency. AI-generated images often lack authentic metadata and show unusual compression patterns.'
        },
        {
          q: 'How do you detect deepfakes?',
          a: 'We analyze facial movements, lip-sync alignment, lighting consistency, blinking patterns, and edge artifacts around the face. Videos are processed frame-by-frame for anomalies.'
        },
        {
          q: 'What is voice clone detection?',
          a: 'We analyze audio for robotic intonation, unnatural pitch variations, lack of breathing sounds, and perfect clarity (real recordings have ambient noise). Voice clones often miss subtle human speech patterns.'
        },
        {
          q: 'Why is forensic analysis prioritized over AI opinion?',
          a: 'Technical forensics (metadata, compression, artifacts) are objective facts. AI opinion is subjective and can be fooled. We use AI as a secondary signal to supplement hard evidence.'
        }
      ]
    },
    {
      title: 'History & Reports',
      icon: <FileText className="w-5 h-5" />,
      questions: [
        {
          q: 'Can I access my analysis history?',
          a: 'Yes! Go to the History page to view all your past analyses. You can filter by risk level, search by content, and view detailed reports anytime.'
        },
        {
          q: 'How do I export a report as PDF?',
          a: 'Open any analysis result and click "Export PDF". You\'ll get a professional report with all findings, evidence, and recommendations that you can share or save.'
        },
        {
          q: 'What is report comparison?',
          a: 'Compare 2-10 reports to find common patterns, risk trends, and similarities. Useful for detecting coordinated scam campaigns. Go to Comparison page and select reports.'
        },
        {
          q: 'How long are reports stored?',
          a: 'Free tier: 30 days. Premium: 1 year. Enterprise: Unlimited. You can export important reports as PDFs for permanent storage.'
        }
      ]
    },
    {
      title: 'Account & Billing',
      icon: <Users className="w-5 h-5" />,
      questions: [
        {
          q: 'How do I upgrade to Premium?',
          a: 'Go to Profile → Subscription and choose Premium (₹99/month) or Enterprise (₹9,999/month). We accept all major payment methods via Stripe.'
        },
        {
          q: 'What are the differences between plans?',
          a: 'Free: 100 analyses/day. Premium: 1,000/day + priority processing + no ads. Enterprise: Unlimited + API access + dedicated support + white-label option.'
        },
        {
          q: 'Can I cancel anytime?',
          a: 'Yes! Cancel anytime from your Profile settings. You\'ll keep access until the end of your billing period, then automatically downgrade to Free tier.'
        },
        {
          q: 'Is my data secure?',
          a: 'Absolutely! We use enterprise-grade encryption, secure JWT authentication, and GDPR-compliant data practices. Your analyses are private and never shared with third parties.'
        }
      ]
    }
  ];

  const toggleSection = (index) => {
    setExpandedSection(expandedSection === index ? null : index);
  };

  const filteredSections = searchQuery
    ? faqSections.map(section => ({
        ...section,
        questions: section.questions.filter(
          item =>
            item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.questions.length > 0)
    : faqSections;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(-1)}
            className="text-purple-600 hover:text-purple-700 mb-4 flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
          <p className="text-gray-600 mt-2">Find answers to common questions</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:outline-none text-lg"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickLink icon={<Video />} text="Video Tutorials" href="#videos" />
          <QuickLink icon={<MessageCircle />} text="Contact Support" href="mailto:support@verisure.com" />
          <QuickLink icon={<BookOpen />} text="Documentation" href="#docs" />
          <QuickLink icon={<Shield />} text="Security Policy" href="#security" />
        </div>

        {/* FAQ Sections */}
        <div className="space-y-4">
          {filteredSections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <button
                onClick={() => toggleSection(sectionIdx)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-purple-600">{section.icon}</div>
                  <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                    {section.questions.length}
                  </span>
                </div>
                {expandedSection === sectionIdx ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedSection === sectionIdx && (
                <div className="px-6 pb-6 space-y-4">
                  {section.questions.map((item, qIdx) => (
                    <div key={qIdx} className="border-l-4 border-purple-500 pl-4 py-2">
                      <h3 className="font-semibold text-gray-900 mb-2">{item.q}</h3>
                      <p className="text-gray-600 leading-relaxed">{item.a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* No results */}
        {filteredSections.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No results found for "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Contact Support */}
        <div className="mt-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-8 text-white text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Still need help?</h3>
          <p className="mb-4 text-purple-100">Our support team is here to assist you 24/7</p>
          <a
            href="mailto:support@verisure.com"
            className="inline-block px-6 py-3 bg-white text-purple-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};

const QuickLink = ({ icon, text, href }) => (
  <a
    href={href}
    className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-center"
  >
    <div className="text-purple-600">{icon}</div>
    <span className="text-sm font-medium text-gray-700">{text}</span>
  </a>
);

export default HelpCenterPage;
