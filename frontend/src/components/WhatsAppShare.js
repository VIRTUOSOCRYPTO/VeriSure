import React from 'react';
import { Share2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const WhatsAppShare = ({ report }) => {
  const { t } = useLanguage();

  const handleShare = () => {
    if (!report) return;

    // Create shareable message
    const riskEmoji = {
      'high': '⚠️🚨',
      'medium': '⚠️',
      'low': '✅'
    };

    const riskText = {
      'high': t('highRiskLabel'),
      'medium': t('mediumRiskLabel'),
      'low': t('lowRiskLabel')
    };

    const message = `*VeriSure Security Alert* ${riskEmoji[report.scam_assessment.risk_level]}

*Risk Level:* ${riskText[report.scam_assessment.risk_level]}

*Summary:*
${report.analysis_summary}

*Top Recommendations:*
${report.recommendations.actions.slice(0, 3).map((action, idx) => `${idx + 1}. ${action}`).join('\n')}

*Report ID:* ${report.report_id}

_Analyzed by VeriSure - AI Content & Scam Detection_`;

    // WhatsApp share URL
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 bg-[#25D366] text-white hover:bg-[#20BD5A] rounded-sm px-6 py-3 font-mono text-sm uppercase tracking-wider transition-all min-h-[44px]"
      data-testid="whatsapp-share-btn"
      aria-label={t('shareWhatsApp')}
    >
      <Share2 className="w-5 h-5" />
      {t('shareWhatsApp')}
    </button>
  );
};

export default WhatsAppShare;
