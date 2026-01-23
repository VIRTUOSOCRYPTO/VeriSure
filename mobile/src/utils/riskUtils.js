// Risk level utility functions
import { RISK_LEVELS, COLORS } from '../config/constants';

export const getRiskColor = (riskLevel, themeColors) => {
  switch (riskLevel?.toLowerCase()) {
    case RISK_LEVELS.HIGH:
      return COLORS.riskHigh;
    case RISK_LEVELS.MEDIUM:
      return COLORS.riskMedium;
    case RISK_LEVELS.LOW:
      return COLORS.riskLow;
    default:
      return themeColors?.textSecondary || '#6B7280';
  }
};

export const getRiskIcon = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case RISK_LEVELS.HIGH:
      return 'alert-octagon';
    case RISK_LEVELS.MEDIUM:
      return 'alert';
    case RISK_LEVELS.LOW:
      return 'shield-check';
    default:
      return 'information';
  }
};

export const getRiskLabel = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case RISK_LEVELS.HIGH:
      return 'High Risk';
    case RISK_LEVELS.MEDIUM:
      return 'Medium Risk';
    case RISK_LEVELS.LOW:
      return 'Low Risk';
    default:
      return 'Unknown';
  }
};

export const getRiskDescription = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case RISK_LEVELS.HIGH:
      return 'Strong indicators of scam or fraudulent content detected. Avoid interaction.';
    case RISK_LEVELS.MEDIUM:
      return 'Some suspicious patterns found. Exercise caution and verify independently.';
    case RISK_LEVELS.LOW:
      return 'Content appears legitimate with minimal suspicious indicators.';
    default:
      return 'Unable to determine risk level.';
  }
};
