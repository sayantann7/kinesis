import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Code2, ChevronRight, RefreshCw } from 'lucide-react';

const filterTabs = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'has_issues', label: 'Has Issues' },
];

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

const TaskProgressBar = ({ stats }) => {
  const percent = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-[#E4E4E7] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#002FA7] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-[#71717A] whitespace-nowrap">
        {stats.done}/{stats.total}
      </span>
    </div>
  );
};

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

export default function SpecsListPage() {
  const { API } = useAuth();
  const navigate = useNavigate();
  const [specs, setSpecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchSpecs = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/specs`, { withCredentials: true });
      setSpecs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [API]);

  useEffect(() => { fetchSpecs(); }, [fetchSpecs]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSpecs();
  };

  const filteredSpecs = specs.filter(spec => {
    if (filter === 'all') return true;
    if (filter === 'in_progress') {
      return spec.task_stats.in_progress > 0 || (spec.task_stats.done < spec.task_stats.total && spec.task_stats.done > 0);
    }
    if (filter === 'completed') {
      return spec.task_stats.total > 0 && spec.task_stats.done === spec.task_stats.total;
    }
    if (filter === 'has_issues') {
      return spec.validation_status === 'FAIL' || spec.validation_status === 'PARTIAL' || spec.task_stats.blocked > 0;
    }
    return true;
  });

  return (
    <div data-testid="specs-page" className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">Specs</h1>
          <p className="text-xs font-mono text-[#A1A1AA] mt-1">{specs.length} executable specifications</p>
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

      {/* Filter Tabs */}
      <div className="flex border-b border-[#E4E4E7]">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`text-xs font-mono px-4 py-2 border-b-2 transition-colors ${
              filter === tab.key
                ? 'border-[#002FA7] text-[#002FA7] font-medium'
                : 'border-transparent text-[#71717A] hover:text-[#171717]'
            }`}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-1.5 text-[10px] text-[#A1A1AA]">
                ({specs.filter(s => {
                  if (tab.key === 'in_progress') return s.task_stats.in_progress > 0 || (s.task_stats.done < s.task_stats.total && s.task_stats.done > 0);
                  if (tab.key === 'completed') return s.task_stats.total > 0 && s.task_stats.done === s.task_stats.total;
                  if (tab.key === 'has_issues') return s.validation_status === 'FAIL' || s.validation_status === 'PARTIAL' || s.task_stats.blocked > 0;
                  return true;
                }).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-white border border-[#E4E4E7] animate-pulse rounded-sm" />
          ))}
        </div>
      ) : specs.length === 0 ? (
        <div className="border border-[#E4E4E7] bg-white p-12 text-center shadow-sm rounded-sm">
          <Code2 className="w-10 h-10 text-[#E4E4E7] mx-auto mb-3" />
          <p className="text-sm font-mono text-[#A1A1AA]">No designer/developer docs yet</p>
          <p className="text-xs font-mono text-[#A1A1AA] mt-1">Generate specs from your briefs to see them here</p>
        </div>
      ) : filteredSpecs.length === 0 ? (
        <div className="border border-[#E4E4E7] bg-white p-8 text-center shadow-sm rounded-sm">
          <p className="text-sm font-mono text-[#A1A1AA]">No specs match this filter</p>
        </div>
      ) : (
        <div className="border border-[#E4E4E7] bg-white shadow-sm rounded-sm">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-[#E4E4E7] bg-[#FAFAFA]">
            <div className="col-span-5 text-[10px] font-mono tracking-[0.1em] uppercase text-[#A1A1AA]">Feature</div>
            <div className="col-span-1 text-[10px] font-mono tracking-[0.1em] uppercase text-[#A1A1AA]">Version</div>
            <div className="col-span-2 text-[10px] font-mono tracking-[0.1em] uppercase text-[#A1A1AA]">Progress</div>
            <div className="col-span-2 text-[10px] font-mono tracking-[0.1em] uppercase text-[#A1A1AA]">Validation</div>
            <div className="col-span-2 text-[10px] font-mono tracking-[0.1em] uppercase text-[#A1A1AA]">Activity</div>
          </div>

          {/* Table Rows */}
          {filteredSpecs.map(spec => (
            <div
              key={spec.brief_id}
              onClick={() => navigate(`/specs/${spec.brief_id}`)}
              className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-[#E4E4E7] last:border-b-0 hover:bg-[#FAFAFA] cursor-pointer transition-colors items-center"
            >
              <div className="col-span-5 flex items-center gap-2 min-w-0">
                <Code2 className="w-4 h-4 text-[#002FA7] flex-shrink-0" />
                <span className="text-xs font-mono text-[#171717] truncate">{spec.opportunity_title}</span>
              </div>
              <div className="col-span-1">
                <span className="text-[10px] font-mono text-[#71717A]">v{spec.version}</span>
              </div>
              <div className="col-span-2">
                <TaskProgressBar stats={spec.task_stats} />
              </div>
              <div className="col-span-2">
                <ValidationBadge status={spec.validation_status} />
              </div>
              <div className="col-span-2 flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#A1A1AA]">
                  {formatRelativeTime(spec.last_activity_at)}
                </span>
                <ChevronRight className="w-4 h-4 text-[#D4D4D8]" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
