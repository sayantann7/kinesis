import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Target, Plus, TrendingUp, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';

const statusColumns = [
  { key: 'OPEN', label: 'Open', color: 'border-green-500' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'border-amber-500' },
  { key: 'COMPLETED', label: 'Completed', color: 'border-[#002FA7]' },
  { key: 'DISCARDED', label: 'Discarded', color: 'border-gray-400' },
];

export default function OpportunitiesPage() {
  const { API } = useAuth();
  const navigate = useNavigate();
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newImpact, setNewImpact] = useState(5);
  const [view, setView] = useState('kanban');

  const fetchOpps = useCallback(async () => {
    try { const res = await axios.get(`${API}/opportunities`, { withCredentials: true }); setOpps(res.data); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [API]);

  useEffect(() => { fetchOpps(); }, [fetchOpps]);

  const createOpp = async () => {
    if (!newTitle.trim()) return;
    try { await axios.post(`${API}/opportunities`, { title: newTitle, description: newDesc, impact_score: newImpact }, { withCredentials: true }); setShowCreate(false); setNewTitle(''); setNewDesc(''); setNewImpact(5); fetchOpps(); } catch (e) { console.error(e); }
  };

  const updateStatus = async (oppId, newStatus) => {
    try { await axios.put(`${API}/opportunities/${oppId}`, { status: newStatus }, { withCredentials: true }); fetchOpps(); } catch (e) { console.error(e); }
  };

  const OppCard = ({ opp }) => (
    <div data-testid={`opp-card-${opp.opportunity_id}`} className="border border-[#E4E4E7] bg-white hover:border-[#D4D4D8] hover:shadow-sm transition-all p-3 mb-2 cursor-pointer rounded-sm" onClick={() => navigate(`/opportunities/${opp.opportunity_id}`)}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-xs font-mono text-[#171717] font-medium leading-tight">{opp.title}</h4>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2"><TrendingUp className="w-3 h-3 text-[#002FA7]" /><span className="text-[10px] font-mono text-[#002FA7] font-bold">{opp.impact_score?.toFixed(1)}</span></div>
      </div>
      {opp.description && <p className="text-[10px] font-mono text-[#A1A1AA] line-clamp-2 mb-2">{opp.description}</p>}
      <span className="text-[9px] font-mono text-[#A1A1AA]">{opp.insight_count || 0} insights</span>
    </div>
  );

  return (
    <div data-testid="opportunities-page" className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">Project Ideas</h1><p className="text-xs font-mono text-[#A1A1AA] mt-1">{opps.length} project ideas created</p></div>
        <div className="flex items-center gap-2">
          <div className="flex border border-[#E4E4E7] rounded-sm overflow-hidden">
            <button data-testid="view-kanban-btn" onClick={() => setView('kanban')} className={`text-xs font-mono px-2 py-1 transition-colors ${view === 'kanban' ? 'bg-[#F4F4F5] text-[#171717]' : 'text-[#A1A1AA] hover:bg-[#FAFAFA]'}`}>Board</button>
            <button data-testid="view-list-btn" onClick={() => setView('list')} className={`text-xs font-mono px-2 py-1 transition-colors ${view === 'list' ? 'bg-[#F4F4F5] text-[#171717]' : 'text-[#A1A1AA] hover:bg-[#FAFAFA]'}`}>List</button>
          </div>
          <button data-testid="create-opportunity-btn" onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-[#002FA7] hover:bg-[#0044FF] text-white text-xs font-mono px-3 py-2 transition-colors rounded-sm"><Plus className="w-3.5 h-3.5" /> New</button>
        </div>
      </div>
      {loading ? <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-40 bg-white border border-[#E4E4E7] animate-pulse" />)}</div> : opps.length === 0 ? (
        <div className="border border-[#E4E4E7] bg-white p-12 text-center shadow-sm"><Target className="w-10 h-10 text-[#E4E4E7] mx-auto mb-3" /><p className="text-sm font-mono text-[#A1A1AA]">No project ideas yet</p></div>
      ) : view === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statusColumns.map(col => {
            const colOpps = opps.filter(o => o.status === col.key);
            return (
              <div key={col.key} className="min-h-[200px]">
                <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${col.color}`}><span className="text-xs font-mono tracking-[0.1em] uppercase text-[#71717A]">{col.label}</span><span className="text-[10px] font-mono text-[#A1A1AA]">({colOpps.length})</span></div>
                {colOpps.map(opp => <OppCard key={opp.opportunity_id} opp={opp} />)}
                {colOpps.length === 0 && <div className="border border-dashed border-[#E4E4E7] p-4 text-center rounded-sm"><p className="text-[10px] font-mono text-[#A1A1AA]">No items</p></div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-[#E4E4E7] bg-white shadow-sm">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#FAFAFA] border-b border-[#E4E4E7] text-[10px] font-mono tracking-[0.15em] uppercase text-[#A1A1AA]"><div className="col-span-4">Title</div><div className="col-span-3">Description</div><div className="col-span-2">Status</div><div className="col-span-1">Impact</div><div className="col-span-1">Insights</div><div className="col-span-1"></div></div>
          {opps.map((opp, idx) => (
            <div key={opp.opportunity_id} data-testid={`opp-list-item-${idx}`} onClick={() => navigate(`/opportunities/${opp.opportunity_id}`)} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#E4E4E7] hover:bg-[#FAFAFA] cursor-pointer transition-colors">
              <div className="col-span-4 text-xs font-mono text-[#171717] truncate">{opp.title}</div>
              <div className="col-span-3 text-[10px] font-mono text-[#A1A1AA] truncate">{opp.description}</div>
              <div className="col-span-2"><select value={opp.status} onClick={e => e.stopPropagation()} onChange={e => updateStatus(opp.opportunity_id, e.target.value)} className="bg-transparent border border-[#E4E4E7] text-[10px] font-mono text-[#71717A] px-1 py-0.5 rounded-sm">{statusColumns.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></div>
              <div className="col-span-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-[#002FA7]" /><span className="text-xs font-mono text-[#002FA7]">{opp.impact_score?.toFixed(1)}</span></div>
              <div className="col-span-1 text-xs font-mono text-[#A1A1AA]">{opp.insight_count || 0}</div>
              <div className="col-span-1 flex justify-end"><ChevronRight className="w-3.5 h-3.5 text-[#A1A1AA]" /></div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white border-[#E4E4E7] text-[#171717] max-w-md shadow-lg">
          <DialogHeader><DialogTitle className="font-heading text-lg font-bold">New Opportunity</DialogTitle><DialogDescription className="text-xs font-mono text-[#A1A1AA]">Create a new product opportunity</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-xs font-mono text-[#A1A1AA] block mb-1.5">Title</label><input data-testid="opp-title-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g., Improve onboarding flow" className="w-full bg-[#FAFAFA] border border-[#E4E4E7] text-[#171717] text-sm font-mono px-3 py-2 focus:border-[#002FA7] focus:outline-none rounded-sm" /></div>
            <div><label className="text-xs font-mono text-[#A1A1AA] block mb-1.5">Description</label><textarea data-testid="opp-desc-input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Describe the opportunity..." rows={3} className="w-full bg-[#FAFAFA] border border-[#E4E4E7] text-[#171717] text-sm font-mono px-3 py-2 focus:border-[#002FA7] focus:outline-none resize-none rounded-sm" /></div>
            <div><label className="text-xs font-mono text-[#A1A1AA] block mb-1.5">Impact Score (1-10)</label><input data-testid="opp-impact-input" type="number" min="1" max="10" step="0.5" value={newImpact} onChange={e => setNewImpact(parseFloat(e.target.value))} className="w-full bg-[#FAFAFA] border border-[#E4E4E7] text-[#171717] text-sm font-mono px-3 py-2 focus:border-[#002FA7] focus:outline-none rounded-sm" /></div>
            <button data-testid="confirm-create-opp-btn" onClick={createOpp} className="w-full bg-[#002FA7] hover:bg-[#0044FF] text-white text-sm font-mono py-2 transition-colors rounded-sm">Create Opportunity</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
