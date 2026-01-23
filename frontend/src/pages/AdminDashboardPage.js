import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { 
  TrendingUp, Users, AlertTriangle, Activity, 
  Database, Clock, Shield, Download, RefreshCw
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
  primary: '#8b5cf6',
  secondary: '#3b82f6'
};

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [scamPatterns, setScamPatterns] = useState([]);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [performance, setPerformance] = useState(null);
  
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  useEffect(() => {
    loadAllAnalytics();
  }, [selectedPeriod]);

  const loadAllAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        navigate('/');
        return;
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Load all analytics in parallel
      const [overviewRes, trendsRes, patternsRes, usersRes, perfRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/analytics/overview`, config),
        axios.get(`${BACKEND_URL}/api/admin/analytics/trends?days=${selectedPeriod}`, config),
        axios.get(`${BACKEND_URL}/api/admin/analytics/scam-patterns?limit=10`, config),
        axios.get(`${BACKEND_URL}/api/admin/analytics/users`, config),
        axios.get(`${BACKEND_URL}/api/admin/analytics/performance`, config)
      ]);

      setOverview(overviewRes.data);
      setTrends(trendsRes.data.trends || []);
      setScamPatterns(patternsRes.data);
      setUserAnalytics(usersRes.data);
      setPerformance(perfRes.data);
      
    } catch (error) {
      console.error('Failed to load analytics:', error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllAnalytics();
    setRefreshing(false);
  };

  const exportData = () => {
    const data = {
      overview,
      trends,
      scamPatterns,
      userAnalytics,
      performance,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verisure-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const riskDistributionData = overview?.risk_distribution ? [
    { name: 'High Risk', value: overview.risk_distribution.high, color: COLORS.high },
    { name: 'Medium Risk', value: overview.risk_distribution.medium, color: COLORS.medium },
    { name: 'Low Risk', value: overview.risk_distribution.low, color: COLORS.low }
  ] : [];

  const userRoleData = userAnalytics?.role_distribution ? [
    { name: 'Free', value: userAnalytics.role_distribution.free, color: COLORS.secondary },
    { name: 'Premium', value: userAnalytics.role_distribution.premium, color: COLORS.primary },
    { name: 'Enterprise', value: userAnalytics.role_distribution.enterprise, color: '#10b981' }
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">VeriSure Analytics & Insights</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Analyses"
            value={overview?.overview?.total_analyses || 0}
            change={`+${overview?.overview?.today_growth_percent || 0}%`}
            icon={<Activity className="w-6 h-6" />}
            color="purple"
          />
          <StatCard
            title="Total Users"
            value={overview?.overview?.total_users || 0}
            subtitle={`${userAnalytics?.engagement?.active_rate || 0}% active`}
            icon={<Users className="w-6 h-6" />}
            color="blue"
          />
          <StatCard
            title="High Risk Detections"
            value={overview?.overview?.high_risk_detections || 0}
            subtitle={`${overview?.overview?.today_analyses || 0} today`}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="red"
          />
          <StatCard
            title="Cache Hit Rate"
            value={`${performance?.cache?.hit_rate || 0}%`}
            subtitle={`${performance?.cache?.total_requests || 0} requests`}
            icon={<Database className="w-6 h-6" />}
            color="green"
          />
        </div>

        {/* Period Selector */}
        <div className="mb-6 flex gap-2">
          {[7, 14, 30, 90].map(days => (
            <button
              key={days}
              onClick={() => setSelectedPeriod(days)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPeriod === days
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Analyses Trend */}
          <ChartCard title="Analysis Trends" subtitle={`Last ${selectedPeriod} days`}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="total" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} name="Total Analyses" />
                <Area type="monotone" dataKey="high_risk" stroke={COLORS.high} fill={COLORS.high} fillOpacity={0.6} name="High Risk" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Risk Distribution */}
          <ChartCard title="Risk Distribution" subtitle="Overall breakdown">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Scam Patterns */}
          <ChartCard title="Top Scam Patterns" subtitle="Most detected threats">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scamPatterns?.top_patterns?.slice(0, 8) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="pattern" width={150} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* User Role Distribution */}
          <ChartCard title="User Roles" subtitle="Subscription breakdown">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userRoleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userRoleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Activity Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Analyses</h3>
            <div className="space-y-3">
              {overview?.recent_activity?.slice(0, 8).map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-mono text-gray-600">{activity.report_id?.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      activity.scam_assessment?.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                      activity.scam_assessment?.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {activity.scam_assessment?.risk_level || 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Active Users */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top Active Users</h3>
            <div className="space-y-3">
              {userAnalytics?.top_users?.map((user, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'enterprise' ? 'bg-green-100 text-green-700' :
                      user.role === 'premium' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                    <span className="text-sm font-bold text-gray-700">{user.api_calls_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">System Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricBox title="API Requests (1h)" value={performance?.api_activity?.last_hour || 0} />
            <MetricBox title="API Requests (24h)" value={performance?.api_activity?.last_24h || 0} />
            <MetricBox title="Cache Hits" value={performance?.cache?.hits || 0} />
            <MetricBox title="Cache Misses" value={performance?.cache?.misses || 0} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, change, subtitle, icon, color }) => {
  const colorClasses = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    green: 'bg-green-500'
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`${colorClasses[color]} text-white p-3 rounded-lg`}>
          {icon}
        </div>
        {change && (
          <span className="text-green-600 text-sm font-medium">{change}</span>
        )}
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
};

const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="mb-4">
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const MetricBox = ({ title, value }) => (
  <div className="p-4 bg-gray-50 rounded-lg">
    <p className="text-xs text-gray-600 mb-1">{title}</p>
    <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
  </div>
);

export default AdminDashboardPage;
