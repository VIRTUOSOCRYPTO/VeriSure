import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AlertTriangle,
  TrendingUp,
  Shield,
  Search,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  MapPin,
  Users,
  Database,
  Activity,
  ArrowLeft
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useLanguage } from '@/context/LanguageContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PublicScamTrendsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [stats, setStats] = useState(null);
  const [recentScams, setRecentScams] = useState([]);
  const [trending, setTrending] = useState([]);
  const [threats, setThreats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      const statsRes = await axios.get(`${BACKEND_URL}/api/scams/stats`);
      setStats(statsRes.data);
      
      // Load recent scams
      const scamsRes = await axios.get(`${BACKEND_URL}/api/scams/recent?verified_only=true&limit=10`);
      setRecentScams(scamsRes.data.scams || []);
      
      // Load trending patterns
      const trendingRes = await axios.get(`${BACKEND_URL}/api/intelligence/trending?days=7&limit=10`);
      setTrending(trendingRes.data.trending_patterns || []);
      
      // Load threat feeds
      const threatsRes = await axios.get(`${BACKEND_URL}/api/intelligence/threats`);
      setThreats(threatsRes.data.threats || []);
      
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load scam intelligence data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    try {
      setSearching(true);
      const res = await axios.get(`${BACKEND_URL}/api/scams/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      setSearchResults(res.data.scams || []);
      toast.success(`Found ${res.data.total} results`);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-slate-900 animate-spin mx-auto mb-4" />
          <p className="text-lg text-slate-700">Loading intelligence data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                data-testid="back-button"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-8 h-8 text-slate-900" />
                  Scam Intelligence Hub
                </h1>
                <p className="text-slate-600 mt-1">
                  Real-time scam trends and threat intelligence for India
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Statistics Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card data-testid="total-reports-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Reports</p>
                    <p className="text-3xl font-bold text-slate-900">{stats.total_reports}</p>
                  </div>
                  <Database className="w-10 h-10 text-slate-900" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="verified-reports-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Verified Scams</p>
                    <p className="text-3xl font-bold text-emerald-600">{stats.verified_reports}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="pending-reports-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Pending Review</p>
                    <p className="text-3xl font-bold text-amber-600">{stats.pending_reports}</p>
                  </div>
                  <Clock className="w-10 h-10 text-amber-600" />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="recent-reports-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Last 7 Days</p>
                    <p className="text-3xl font-bold text-slate-700">{stats.recent_reports_7days}</p>
                  </div>
                  <Activity className="w-10 h-10 text-slate-700" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
        <Card className="mb-8" data-testid="search-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Scam Database
            </CardTitle>
            <CardDescription>
              Search for specific scam patterns, keywords, or types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Search scams (e.g., 'police threat', 'lottery', 'OTP')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                data-testid="search-input"
              />
              <Button
                onClick={handleSearch}
                disabled={searching}
                data-testid="search-button"
              >
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-6 space-y-3">
                <h3 className="font-semibold text-gray-900">Search Results ({searchResults.length})</h3>
                {searchResults.map((scam, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-slate-200 rounded-lg hover:border-slate-400 transition-colors"
                    data-testid={`search-result-${idx}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(scam.severity)}>
                          {scam.severity}
                        </Badge>
                        <Badge variant="outline">{scam.scam_type}</Badge>
                        {getStatusIcon(scam.status)}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(scam.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{scam.content}</p>
                    {scam.report_count > 1 && (
                      <p className="text-xs text-slate-500 mt-2">
                        <Users className="w-3 h-3 inline mr-1" />
                        Reported {scam.report_count} times
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Trending Patterns */}
          <Card data-testid="trending-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-700" />
                Trending This Week
              </CardTitle>
              <CardDescription>
                Most common scam patterns in the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trending.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No trending patterns yet</p>
              ) : (
                <div className="space-y-3">
                  {trending.map((pattern, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg"
                      data-testid={`trending-pattern-${idx}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900">{pattern.pattern}</span>
                        <Badge className="bg-slate-100 text-slate-800">
                          {pattern.count} reports
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        Type: {pattern.scam_type || 'Various'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Verified Scams */}
          <Card data-testid="recent-scams-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-700" />
                Recent Verified Scams
              </CardTitle>
              <CardDescription>
                Community-reported and verified scam alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentScams.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No verified scams yet</p>
              ) : (
                <div className="space-y-3">
                  {recentScams.map((scam, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-slate-200 rounded-lg hover:border-slate-400 transition-colors"
                      data-testid={`recent-scam-${idx}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getSeverityColor(scam.severity)}>
                          {scam.severity}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {new Date(scam.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 line-clamp-2">{scam.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {scam.report_count} reports
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {scam.scam_type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Threat Intelligence Feed */}
        <Card className="mt-8" data-testid="threats-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Active Threat Intelligence
            </CardTitle>
            <CardDescription>
              High-severity threats from community reports and external sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            {threats.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No active threats</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {threats.map((threat, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-red-50 border border-red-200 rounded-lg"
                    data-testid={`threat-${idx}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge className="bg-red-100 text-red-800 mb-2">
                          {threat.severity || 'high'}
                        </Badge>
                        <p className="font-semibold text-slate-900">{threat.scam_type}</p>
                      </div>
                      <span className="text-xs text-slate-500">{threat.source}</span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-3">{threat.content}</p>
                    {threat.report_count && (
                      <p className="text-xs text-slate-600 mt-2">
                        <Users className="w-3 h-3 inline mr-1" />
                        {threat.report_count} reports
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scam Type Breakdown */}
        {stats && stats.scam_type_breakdown && stats.scam_type_breakdown.length > 0 && (
          <Card className="mt-8" data-testid="breakdown-card">
            <CardHeader>
              <CardTitle>Scam Type Distribution</CardTitle>
              <CardDescription>Most common types of scams reported</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.scam_type_breakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between" data-testid={`type-${idx}`}>
                    <span className="text-sm font-medium text-slate-700">{item.type}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-900"
                          style={{
                            width: `${(item.count / stats.total_reports) * 100}%`
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-900 w-12 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Scam CTA */}
        <Card className="mt-8 bg-slate-900 text-white" data-testid="report-cta">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Encountered a Scam?</h3>
              <p className="mb-4">
                Help protect others by reporting scams to our community database
              </p>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/analyze')}
                data-testid="report-scam-button"
              >
                Report a Scam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicScamTrendsPage;
