import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Activity, RefreshCw, Upload, Shield, ArrowRight, CheckCircle, XCircle, Clock, TrendingUp, Code2 } from 'lucide-react';

const formatRelativeTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const StatCard = ({ label, value, subtext, icon: Icon, color = 'text-[#002FA7]' }) => (
  <div className="border border-[#E4E4E7] bg-white p-4 rounded-sm shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-mono tracking-[0.1em] uppercase text-[#A1A1AA]">{label}</span>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <p className="text-2xl font-heading font-bold text-[#171717]">{value}</p>
    <p className="text-[10px] font-mono text-[#A1A1AA] mt-1">{subtext}</p>
  </div>
);

const ValidationBadge = ({ status }) => {
  const styles = {
    PASS: 'text-green-600 border-green-200 bg-green-50',
    FAIL: 'text-red-600 border-red-200 bg-red-50',
    PARTIAL: 'text-amber-600 border-amber-200 bg-amber-50',
    PENDING: 'text-[#71717A] border-gray-200 bg-gray-50',
  };
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${styles[status] || styles.PENDING}`}>
      {status || 'PENDING'}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    PENDING: 'text-[#71717A] border-gray-200 bg-gray-50',
    IN_PROGRESS: 'text-[#002FA7] border-blue-200 bg-blue-50',
    DONE: 'text-green-600 border-green-200 bg-green-50',
    BLOCKED: 'text-red-600 border-red-200 bg-red-50',
  };
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${styles[status] || styles.PENDING}`}>
      {status}
    </span>
  );
};

const ActivityItem = ({ activity }) => {
  const typeConfig = {
    task_update: { icon: <RefreshCw className="w-3.5 h-3.5" />, color: 'bg-[#002FA7]', label: 'Task Updated' },
    implementation_submitted: { icon: <Upload className="w-3.5 h-3.5" />, color: 'bg-amber-500', label: 'Implementation Submitted' },
    implementation_validated: { icon: <Shield className="w-3.5 h-3.5" />, color: 'bg-green-500', label: 'Validation Complete' },
  };
  const config = typeConfig[activity.type] || typeConfig.task_update;

  return (
    <div className="flex gap-4 py-4 border-b border-[#E4E4E7] last:border-b-0">
      {/* Timeline dot */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white flex-shrink-0`}>
          {config.icon}
        </div>
        <div className="flex-1 w-px bg-[#E4E4E7] mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-mono font-medium text-[#171717]">{config.label}</span>
          <span className="text-[10px] font-mono text-[#A1A1AA]">{formatRelativeTime(activity.created_at)}</span>
        </div>

        {/* Spec/Feature link */}
        {activity.opportunity_title && (
          <Link
            to={`/specs/${activity.brief_id}`}
            className="text-[10px] font-mono text-[#002FA7] hover:underline mb-2 block truncate"
          >
            <Code2 className="w-3 h-3 inline mr-1" />
            {activity.opportunity_title}
          </Link>
        )}

        {/* Type-specific content */}
        {activity.type === 'task_update' && (
          <div className="flex items-center gap-2 flex-wrap">
            {activity.task_title && (
              <span className="text-[10px] font-mono text-[#71717A] truncate max-w-[200px]">{activity.task_title}</span>
            )}
            <ArrowRight className="w-3 h-3 text-[#A1A1AA] flex-shrink-0" />
            <StatusBadge status={activity.new_status} />
          </div>
        )}

        {activity.type === 'implementation_validated' && (
          <div className="mt-2 p-3 bg-[#FAFAFA] border border-[#E4E4E7] rounded-sm">
            <div className="flex items-center gap-2 mb-1">
              <ValidationBadge status={activity.result} />
            </div>
            {activity.validation_summary && (
              <p className="text-[10px] font-mono text-[#71717A] line-clamp-2">{activity.validation_summary}</p>
            )}
          </div>
        )}

        {activity.type === 'implementation_submitted' && (
          <div className="mt-1">
            <Link
              to={`/specs/${activity.brief_id}`}
              className="text-[10px] font-mono text-[#002FA7] hover:underline"
            >
              View spec details →
            </Link>
          </div>
        )}

        {activity.notes && (
          <p className="text-[10px] font-mono text-[#A1A1AA] mt-2 italic border-l-2 border-[#E4E4E7] pl-2">"{activity.notes}"</p>
        )}
      </div>
    </div>
  );
};

const filterTabs = [
  { key: 'all', label: 'All' },
  { key: 'task_update', label: 'Task Updates' },
  { key: 'implementation_submitted', label: 'Submissions' },
  { key: 'implementation_validated', label: 'Validations' },
];

export default function CursorActivityPage() {
  const { API } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(searchParams.get('type') || 'all');
  const [specFilter, setSpecFilter] = useState(searchParams.get('brief_id') || '');
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (specFilter) params.append('brief_id', specFilter);
      if (filter !== 'all') params.append('activity_type', filter);
      params.append('limit', '50');

      const [actRes, statsRes, specsRes] = await Promise.all([
        axios.get(`${API}/activity?${params.toString()}`, { withCredentials: true }),
        axios.get(`${API}/activity/stats`, { withCredentials: true }),
        axios.get(`${API}/specs`, { withCredentials: true }),
      ]);

      setActivities(actRes.data.activities || []);
      setTotal(actRes.data.total || 0);
      setStats(statsRes.data);
      setSpecs(specsRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API, filter, specFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    const params = new URLSearchParams(searchParams);
    if (newFilter === 'all') {
      params.delete('type');
    } else {
      params.set('type', newFilter);
    }
    setSearchParams(params);
  };

  const handleSpecFilterChange = (newSpec) => {
    setSpecFilter(newSpec);
    const params = new URLSearchParams(searchParams);
    if (!newSpec) {
      params.delete('brief_id');
    } else {
      params.set('brief_id', newSpec);
    }
    setSearchParams(params);
  };

  return (
    <div data-testid="cursor-activity-page" className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">Cursor Activity</h1>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
          <p className="text-xs font-mono text-[#A1A1AA] hidden sm:block">Monitor Cursor agent progress</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 border border-[#E4E4E7] hover:border-[#D4D4D8] text-xs font-mono px-3 py-2 transition-colors rounded-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#71717A] ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Task Updates"
            value={stats.task_updates}
            subtext={`last ${stats.days} days`}
            icon={RefreshCw}
            color="text-[#002FA7]"
          />
          <StatCard
            label="Submissions"
            value={stats.implementations_submitted}
            subtext={`last ${stats.days} days`}
            icon={Upload}
            color="text-amber-500"
          />
          <StatCard
            label="Validations"
            value={stats.implementations_validated}
            subtext={`last ${stats.days} days`}
            icon={Shield}
            color="text-green-500"
          />
          <StatCard
            label="Pass Rate"
            value={`${stats.validation_pass_rate}%`}
            subtext={`of ${stats.total_validated} validated`}
            icon={TrendingUp}
            color={stats.validation_pass_rate >= 80 ? 'text-green-500' : stats.validation_pass_rate >= 50 ? 'text-amber-500' : 'text-red-500'}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Spec Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#A1A1AA]">Spec:</span>
          <select
            value={specFilter}
            onChange={(e) => handleSpecFilterChange(e.target.value)}
            className="text-xs font-mono border border-[#E4E4E7] rounded-sm px-2 py-1.5 bg-white text-[#171717] focus:outline-none focus:border-[#002FA7]"
          >
            <option value="">All Specs</option>
            {specs.map(spec => (
              <option key={spec.brief_id} value={spec.brief_id}>
                {spec.opportunity_title}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter Tabs */}
        <div className="flex border border-[#E4E4E7] rounded-sm overflow-hidden">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`text-[10px] font-mono px-3 py-1.5 transition-colors ${
                filter === tab.key
                  ? 'bg-[#002FA7] text-white'
                  : 'text-[#71717A] hover:bg-[#FAFAFA]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[#E4E4E7] animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-[#E4E4E7] animate-pulse rounded" />
                <div className="h-3 w-48 bg-[#E4E4E7] animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="border border-[#E4E4E7] bg-white p-12 text-center shadow-sm rounded-sm">
          <Activity className="w-10 h-10 text-[#E4E4E7] mx-auto mb-3" />
          <p className="text-sm font-mono text-[#A1A1AA]">No activity yet</p>
          <p className="text-xs font-mono text-[#A1A1AA] mt-1">
            Connect Cursor to Kinesis via MCP to see activity here
          </p>
          <Link to="/settings" className="inline-block mt-4 text-xs font-mono text-[#002FA7] hover:underline">
            Configure MCP Integration →
          </Link>
        </div>
      ) : (
        <div className="border border-[#E4E4E7] bg-white shadow-sm rounded-sm">
          <div className="px-4 py-2 border-b border-[#E4E4E7] bg-[#FAFAFA] flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-[0.1em] uppercase text-[#A1A1AA]">Activity Timeline</span>
            <span className="text-[10px] font-mono text-[#A1A1AA]">{total} total</span>
          </div>
          <div className="p-4">
            {activities.map((activity, i) => (
              <ActivityItem key={activity.activity_id || i} activity={activity} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
