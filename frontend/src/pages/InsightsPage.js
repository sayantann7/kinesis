import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Lightbulb, Filter, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const InsightTypeTag = ({ type }) => {
  const colors = { COMPLAINT: 'text-red-600 bg-red-50 border-red-200', PRAISE: 'text-green-600 bg-green-50 border-green-200', FEATURE_REQUEST: 'text-[#002FA7] bg-blue-50 border-blue-200', QUESTION: 'text-amber-600 bg-amber-50 border-amber-200', OTHER: 'text-[#71717A] bg-gray-50 border-gray-200' };
  return <span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${colors[type] || colors.OTHER}`}>{type?.replace('_', ' ')}</span>;
};

const SentimentIcon = ({ value }) => {
  if (value > 0.2) return <TrendingUp className="w-3 h-3 text-green-600" />;
  if (value < -0.2) return <TrendingDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-[#A1A1AA]" />;
};

export default function InsightsPage() {
  const { API } = useAuth();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [clustering, setClustering] = useState(false);
  const [clusterPrompt, setClusterPrompt] = useState('');

  const fetchInsights = useCallback(async () => {
    try { const params = new URLSearchParams(); if (filterType) params.append('type', filterType); if (filterTag) params.append('tag', filterTag); const res = await axios.get(`${API}/insights?${params}`, { withCredentials: true }); setInsights(res.data); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [API, filterType, filterTag]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const clusterInsights = async () => {
    setClustering(true);
    try { const res = await axios.post(`${API}/insights/cluster`, {}, { withCredentials: true }); toast.success(`Created ${res.data.opportunities?.length || 0} opportunities`); fetchInsights(); } catch (e) { console.error(e); }
    finally { setClustering(false); }
  };

  const allTags = [...new Set(insights.flatMap(i => i.tags || []))];
  const types = ['COMPLAINT', 'PRAISE', 'FEATURE_REQUEST', 'QUESTION', 'OTHER'];

  return (
    <div data-testid="insights-page" className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">Key Findings</h1><p className="text-xs font-mono text-[#A1A1AA] mt-1">{insights.length} insights extracted</p></div>
        <div className="flex items-center gap-2">
          <input type="text" value={clusterPrompt} onChange={(e) => setClusterPrompt(e.target.value)} placeholder="Any specific focus?" className="border border-[#E4E4E7] rounded-sm text-xs px-2 py-1.5 focus:outline-none focus:border-[#A1A1AA] w-64" disabled={clustering} />
          <button data-testid="cluster-insights-btn" onClick={clusterInsights} disabled={clustering || insights.length < 2} className="flex items-center gap-2 bg-[#002FA7] hover:bg-[#0044FF] text-white text-xs font-mono px-3 py-2 transition-colors disabled:opacity-50 rounded-sm">
            <Zap className={`w-3.5 h-3.5 ${clustering ? 'animate-pulse' : ''}`} />{clustering ? 'Clustering...' : 'Group Related Ideas'}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-3.5 h-3.5 text-[#A1A1AA]" />
        <select data-testid="filter-type-select" value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-white border border-[#E4E4E7] text-[#171717] text-xs font-mono px-2 py-1.5 focus:border-[#002FA7] focus:outline-none rounded-sm">
          <option value="">All Types</option>{types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select data-testid="filter-tag-select" value={filterTag} onChange={e => setFilterTag(e.target.value)} className="bg-white border border-[#E4E4E7] text-[#171717] text-xs font-mono px-2 py-1.5 focus:border-[#002FA7] focus:outline-none rounded-sm">
          <option value="">All Tags</option>{allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white border border-[#E4E4E7] animate-pulse" />)}</div>
      ) : insights.length === 0 ? (
        <div className="border border-[#E4E4E7] bg-white p-12 text-center shadow-sm"><Lightbulb className="w-10 h-10 text-[#E4E4E7] mx-auto mb-3" /><p className="text-sm font-mono text-[#A1A1AA]">No insights yet</p></div>
      ) : (
        <div className="border border-[#E4E4E7] bg-white shadow-sm">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#FAFAFA] border-b border-[#E4E4E7] text-[10px] font-mono tracking-[0.15em] uppercase text-[#A1A1AA]">
            <div className="col-span-2">Type</div><div className="col-span-4">Summary</div><div className="col-span-3">Quote</div><div className="col-span-1">Sent.</div><div className="col-span-2">Tags</div>
          </div>
          {insights.map((ins, idx) => (
            <div key={ins.insight_id || idx} data-testid={`insight-row-${idx}`} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#E4E4E7] hover:bg-[#FAFAFA] transition-colors animate-fade-in" style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}>
              <div className="col-span-2"><InsightTypeTag type={ins.type} /></div>
              <div className="col-span-4 text-xs font-mono text-[#171717] truncate">{ins.summary}</div>
              <div className="col-span-3 text-[10px] font-mono text-[#A1A1AA] italic truncate">{ins.quote ? `"${ins.quote}"` : '-'}</div>
              <div className="col-span-1 flex items-center gap-1"><SentimentIcon value={ins.sentiment} /><span className={`text-[10px] font-mono ${ins.sentiment > 0 ? 'text-green-600' : ins.sentiment < 0 ? 'text-red-500' : 'text-[#A1A1AA]'}`}>{ins.sentiment > 0.2 ? 'Positive' : ins.sentiment < -0.2 ? 'Negative' : 'Neutral'}</span></div>
              <div className="col-span-2 flex flex-wrap gap-1">{(ins.tags || []).slice(0, 2).map(tag => <span key={tag} className="text-[9px] font-mono px-1 py-0.5 bg-[#F4F4F5] text-[#71717A] rounded-sm">{tag}</span>)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
