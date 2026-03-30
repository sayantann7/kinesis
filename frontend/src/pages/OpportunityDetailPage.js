import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, FileText, Lightbulb, TrendingUp, Plus, ChevronRight } from 'lucide-react';

export default function OpportunityDetailPage() {
  const { id } = useParams();
  const { API } = useAuth();
  const navigate = useNavigate();
  const [opp, setOpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { (async () => { try { const res = await axios.get(`${API}/opportunities/${id}`, { withCredentials: true }); setOpp(res.data); } catch (e) { console.error(e); } finally { setLoading(false); } })(); }, [API, id]);

  const generateBrief = async () => { setGenerating(true); try { const res = await axios.post(`${API}/opportunities/${id}/briefs`, {}, { withCredentials: true }); navigate(`/briefs/${res.data.brief_id}`); } catch (e) { console.error(e); } finally { setGenerating(false); } };

  if (loading) return <div className="p-6"><div className="h-48 bg-white border border-[#E4E4E7] animate-pulse" /></div>;
  if (!opp) return <div className="p-6 text-center text-[#A1A1AA] font-mono text-sm">Opportunity not found</div>;

  return (
    <div data-testid="opportunity-detail-page" className="p-4 md:p-6 space-y-6">
      <button data-testid="back-to-opps-btn" onClick={() => navigate('/opportunities')} className="flex items-center gap-1.5 text-xs font-mono text-[#A1A1AA] hover:text-[#171717] transition-colors"><ArrowLeft className="w-3.5 h-3.5" /> Back to Opportunities</button>
      <div className="border border-[#E4E4E7] bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-[#171717]">{opp.title}</h1>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${opp.status === 'OPEN' ? 'text-green-600 border-green-200 bg-green-50' : opp.status === 'IN_PROGRESS' ? 'text-amber-600 border-amber-200 bg-amber-50' : opp.status === 'COMPLETED' ? 'text-[#002FA7] border-blue-200 bg-blue-50' : 'text-[#71717A] border-gray-200 bg-gray-50'}`}>{opp.status}</span>
            </div>
            <p className="text-sm font-mono text-[#71717A]">{opp.description}</p>
          </div>
          <div className="flex items-center gap-2 ml-4"><TrendingUp className="w-5 h-5 text-[#002FA7]" /><span className="text-2xl font-heading font-bold text-[#002FA7]">{opp.impact_score?.toFixed(1)}</span></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-[#E4E4E7] bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-[#E4E4E7] flex items-center justify-between">
            <h3 className="text-sm font-heading font-bold text-[#171717] flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Linked Insights</h3>
            <span className="text-[10px] font-mono text-[#A1A1AA]">{(opp.insights || []).length}</span>
          </div>
          <div className="divide-y divide-[#E4E4E7] max-h-96 overflow-auto">
            {(opp.insights || []).length === 0 ? <div className="p-6 text-center text-xs font-mono text-[#A1A1AA]">No linked insights</div> : (opp.insights || []).map((ins, idx) => (
              <div key={ins.insight_id || idx} className="px-4 py-3 hover:bg-[#FAFAFA] transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${ins.type === 'COMPLAINT' ? 'text-red-600 border-red-200 bg-red-50' : ins.type === 'PRAISE' ? 'text-green-600 border-green-200 bg-green-50' : ins.type === 'FEATURE_REQUEST' ? 'text-[#002FA7] border-blue-200 bg-blue-50' : 'text-[#71717A] border-gray-200 bg-gray-50'}`}>{ins.type}</span>
                  <span className={`text-[10px] font-mono ${ins.sentiment > 0 ? 'text-green-600' : ins.sentiment < 0 ? 'text-red-500' : 'text-[#A1A1AA]'}`}>{ins.sentiment?.toFixed(1)}</span>
                </div>
                <p className="text-xs font-mono text-[#171717]">{ins.summary}</p>
                {ins.quote && <p className="text-[10px] font-mono text-[#A1A1AA] mt-0.5 italic">"{ins.quote}"</p>}
              </div>
            ))}
          </div>
        </div>
        <div className="border border-[#E4E4E7] bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-[#E4E4E7] flex items-center justify-between">
            <h3 className="text-sm font-heading font-bold text-[#171717] flex items-center gap-2"><FileText className="w-4 h-4 text-[#002FA7]" /> Feature Briefs</h3>
            <button data-testid="generate-brief-btn" onClick={generateBrief} disabled={generating} className="flex items-center gap-1.5 bg-[#002FA7] hover:bg-[#0044FF] text-white text-[10px] font-mono px-2 py-1 transition-colors disabled:opacity-50 rounded-sm">
              <Plus className="w-3 h-3" />{generating ? 'Generating...' : 'Generate Brief'}
            </button>
          </div>
          <div className="divide-y divide-[#E4E4E7]">
            {(opp.briefs || []).length === 0 ? <div className="p-6 text-center"><p className="text-xs font-mono text-[#A1A1AA]">No briefs yet. Generate one with AI.</p></div> : (opp.briefs || []).map((brief, idx) => (
              <button key={brief.brief_id || idx} data-testid={`brief-item-${idx}`} onClick={() => navigate(`/briefs/${brief.brief_id}`)} className="w-full text-left px-4 py-3 hover:bg-[#FAFAFA] transition-colors flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2"><span className="text-xs font-mono text-[#171717]">v{brief.version}</span><span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${brief.status === 'DRAFT' ? 'text-amber-600 border-amber-200 bg-amber-50' : brief.status === 'FINAL' ? 'text-green-600 border-green-200 bg-green-50' : 'text-[#002FA7] border-blue-200 bg-blue-50'}`}>{brief.status}</span></div>
                  <p className="text-[10px] font-mono text-[#A1A1AA] mt-0.5">Created {new Date(brief.created_at).toLocaleDateString()}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#A1A1AA]" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
