import React from 'react';
import { Share2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const WhatsAppShare = ({ report }) => {
  const { t } = useLanguage();

  const shareOnWhatsApp = () => {
    if (!report) return;

    // Format report for WhatsApp sharing
    const message = `
🛡️ *VeriSure Analysis Report*
━━━━━━━━━━━━━━━━━━━━━━

📊 *${t('scamRisk')}*: ${getRiskEmoji(report.scam_assessment.risk_level)} ${formatRiskLevel(report.scam_assessment.risk_level)}

🔍 *${t('originClassification')}*: ${report.origin_verdict.classification}
📈 *${t('confidence')}*: ${report.origin_verdict.confidence}

⚠️ *${t('patternsDetected')}*:
${report.scam_assessment.scam_patterns.slice(0, 3).map(p => `• ${p}`).join('\n')}

💡 *${t('recommendedActions')}*:
${report.recommendations.actions.slice(0, 3).map((a, i) => `${i + 1}. ${a}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━
📝 Report ID: ${report.report_id.slice(0, 8)}...
⏰ ${new Date(report.timestamp).toLocaleDateString()}

🔗 Powered by VeriSure
Advanced AI Origin & Scam Forensics
    `.trim();

    // Encode message for WhatsApp URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    // Open WhatsApp share dialog
    window.open(whatsappUrl, '_blank');
  };

  const getRiskEmoji = (level) => {
    switch (level) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return '✅';
      default: return '❓';
    }
  };

  const formatRiskLevel = (level) => {
    switch (level) {
      case 'high': return t('highRiskLabel') || 'HIGH RISK';
      case 'medium': return t('mediumRiskLabel') || 'MEDIUM RISK';
      case 'low': return t('lowRiskLabel') || 'LOW RISK';
      default: return level;
    }
  };

  return (
    <button
      onClick={shareOnWhatsApp}
      className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 rounded-sm px-6 py-3 font-mono text-sm uppercase tracking-wider transition-all min-h-[44px]"
      data-testid="whatsapp-share-btn"
      aria-label="Share on WhatsApp"
    >
      <Share2 className="w-5 h-5" />
      {t('shareWhatsApp')}
    </button>
  );
};

export default WhatsAppShare;
