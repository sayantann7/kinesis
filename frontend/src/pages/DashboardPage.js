import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Database, Lightbulb, Target, FileText, ListChecks, TrendingUp, ChevronRight } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color, testId }) => (
  <div data-testid={testId} className="border border-[#E4E4E7] bg-white p-4 hover:border-[#D4D4D8] transition-colors duration-100 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-[#A1A1AA]">{label}</span>
      <Icon className={`w-4 h-4 ${color || 'text-[#A1A1AA]'}`} />
    </div>
    <p className="text-3xl font-heading font-bold text-[#171717] tracking-tight">{value}</p>
  </div>
);

const InsightTypeTag = ({ type }) => {
  const colors = { COMPLAINT: 'text-red-600 bg-red-50 border-red-200', PRAISE: 'text-green-600 bg-green-50 border-green-200', FEATURE_REQUEST: 'text-[#002FA7] bg-blue-50 border-blue-200', QUESTION: 'text-amber-600 bg-amber-50 border-amber-200', OTHER: 'text-[#71717A] bg-gray-50 border-gray-200' };
  return <span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${colors[type] || colors.OTHER}`}>{type}</span>;
};

export default function DashboardPage() {
  const { API } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const res = await axios.get(`${API}/dashboard/stats`, { withCredentials: true }); setStats(res.data); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [API]);

  if (loading) return <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white border border-[#E4E4E7] animate-pulse" />)}</div>;

  const s = stats || {};

  return (
    <div data-testid="dashboard-page" className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">Command Center</h1>
        <p className="text-xs font-mono text-[#A1A1AA] mt-1 tracking-wide">Product discovery overview</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Knowledge Base" value={s.sources || 0} icon={Database} color="text-[#002FA7]" testId="stat-sources" />
          <StatCard label="Items" value={s.source_items || 0} icon={Database} color="text-[#71717A]" testId="stat-items" />
          <StatCard label="Key Findings" value={s.insights || 0} icon={Lightbulb} color="text-amber-500" testId="stat-insights" />
          <StatCard label="Project Ideas" value={s.opportunities || 0} icon={Target} color="text-green-600" testId="stat-opportunities" />
          <StatCard label="Product Briefs" value={s.briefs || 0} icon={FileText} color="text-[#002FA7]" testId="stat-briefs" />
          <StatCard label="Developer Tasks" value={s.tasks || 0} icon={ListChecks} color="text-[#71717A]" testId="stat-tasks" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-[#E4E4E7] bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E4E7]">
            <h3 className="text-sm font-heading font-bold text-[#171717]">Recent Findings</h3>
            <button data-testid="view-all-findings-btn" onClick={() => navigate('/insights')} className="text-xs font-mono text-[#002FA7] hover:text-[#0044FF] flex items-center gap-1 transition-colors">View all <ChevronRight className="w-3 h-3" /></button>
          </div>
          <div className="divide-y divide-[#E4E4E7]">
            {(s.recent_insights || []).length === 0 ? (
              <div className="p-8 text-center"><Lightbulb className="w-8 h-8 text-[#E4E4E7] mx-auto mb-2" /><p className="text-xs font-mono text-[#A1A1AA]">No findings yet. Add feedback data and process them.</p></div>
            ) : (s.recent_insights || []).map((ins, idx) => (
              <div key={ins.insight_id || idx} className="px-4 py-3 hover:bg-[#FAFAFA] transition-colors animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex items-start gap-2">
                  <InsightTypeTag type={ins.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-[#171717] truncate">{ins.summary}</p>
                    {ins.quote && <p className="text-[10px] font-mono text-[#A1A1AA] mt-0.5 truncate italic">"{ins.quote}"</p>}
                  </div>
                  <span className={`text-[10px] font-mono ${ins.sentiment > 0 ? 'text-green-600' : ins.sentiment < 0 ? 'text-red-500' : 'text-[#A1A1AA]'}`}>{ins.sentiment > 0 ? '+' : ''}{ins.sentiment?.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-[#E4E4E7] bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E4E4E7]">
            <h3 className="text-sm font-heading font-bold text-[#171717]">Top Project Ideas</h3>
            <button data-testid="view-all-ideas-btn" onClick={() => navigate('/opportunities')} className="text-xs font-mono text-[#002FA7] hover:text-[#0044FF] flex items-center gap-1 transition-colors">View all <ChevronRight className="w-3 h-3" /></button>
          </div>
          <div className="divide-y divide-[#E4E4E7]">
            {(s.top_opportunities || []).length === 0 ? (
              <div className="p-8 text-center"><Target className="w-8 h-8 text-[#E4E4E7] mx-auto mb-2" /><p className="text-xs font-mono text-[#A1A1AA]">No project ideas yet.</p></div>
            ) : (s.top_opportunities || []).map((opp, idx) => (
              <button key={opp.opportunity_id || idx} data-testid={`opp-item-${idx}`} onClick={() => navigate(`/opportunities/${opp.opportunity_id}`)} className="w-full text-left px-4 py-3 hover:bg-[#FAFAFA] transition-colors animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-[#171717] truncate">{opp.title}</p>
                    <p className="text-[10px] font-mono text-[#A1A1AA] mt-0.5 truncate">{opp.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${opp.status === 'OPEN' ? 'text-green-600 border-green-200 bg-green-50' : opp.status === 'IN_PROGRESS' ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-[#71717A] border-gray-200 bg-gray-50'}`}>{opp.status}</span>
                    <div className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-[#002FA7]" /><span className="text-xs font-mono text-[#002FA7] font-bold">{opp.impact_score?.toFixed(1)}</span></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      {s.insight_types && Object.keys(s.insight_types).length > 0 && (
        <div className="border border-[#E4E4E7] bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-[#E4E4E7]"><h3 className="text-sm font-heading font-bold text-[#171717]">Insight Breakdown</h3></div>
          <div className="p-4 flex flex-wrap gap-4">
            {Object.entries(s.insight_types).map(([type, count]) => <div key={type} className="flex items-center gap-2"><InsightTypeTag type={type} /><span className="text-sm font-mono text-[#171717] font-bold">{count}</span></div>)}
          </div>
        </div>
      )}
    </div>
  );
}
