"""
Unit tests for configuration
Phase 1 Critical Fix: Ensure pricing is profitable
"""
import pytest
from config import (
    TIER_PRICING,
    TIER_LIMITS,
    COST_PER_ANALYSIS,
    PricingTier,
    MAX_FILE_SIZE,
    MAX_TEXT_LENGTH,
    API_PREFIX,
    API_VERSION
)


@pytest.mark.unit
class TestPricingEconomics:
    """Test pricing economics are profitable"""
    
    def test_premium_pricing_fixed(self):
        """Test Premium tier pricing is fixed to ₹299"""
        assert TIER_PRICING[PricingTier.PREMIUM] == 299
    
    def test_enterprise_pricing_fixed(self):
        """Test Enterprise tier pricing is fixed to ₹14,999"""
        assert TIER_PRICING[PricingTier.ENTERPRISE] == 14999
    
    def test_free_tier_reduced(self):
        """Test Free tier limit reduced to 50/day"""
        assert TIER_LIMITS[PricingTier.FREE] == 50
    
    def test_premium_tier_is_profitable(self):
        """Test Premium tier is profitable"""
        premium_price = TIER_PRICING[PricingTier.PREMIUM]
        max_analyses = TIER_LIMITS[PricingTier.PREMIUM]
        cost_per_analysis = COST_PER_ANALYSIS['image']  # Worst case
        
        max_cost = max_analyses * cost_per_analysis
        profit = premium_price - max_cost
        
        # Should be profitable (positive margin)
        assert profit > 0, f"Premium tier is loss-making! Price: ₹{premium_price}, Max cost: ₹{max_cost}"
    
    def test_break_even_point_reasonable(self):
        """Test break-even point is reasonable"""
        premium_price = TIER_PRICING[PricingTier.PREMIUM]
        cost_per_analysis = COST_PER_ANALYSIS['image']
        
        break_even = premium_price / cost_per_analysis
        
        # Break-even should be less than 50% of monthly limit
        assert break_even < 500, f"Break-even too high: {break_even} analyses"


@pytest.mark.unit
class TestSecurityLimits:
    """Test security limits are configured"""
    
    def test_max_file_size_configured(self):
        """Test max file size is configured"""
        assert MAX_FILE_SIZE == 500 * 1024 * 1024  # 500MB
    
    def test_max_text_length_configured(self):
        """Test max text length is configured"""
        assert MAX_TEXT_LENGTH == 100 * 1024  # 100KB


@pytest.mark.unit
class TestAPIConfiguration:
    """Test API configuration"""
    
    def test_api_version_updated(self):
        """Test API version is updated to 3.0.0"""
        assert API_VERSION == "3.0.0"
    
    def test_api_prefix_versioned(self):
        """Test API prefix includes version"""
        assert API_PREFIX == "/api/v1"
