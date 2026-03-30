import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FileText, ChevronRight } from 'lucide-react';

export default function BriefsListPage() {
  const { API } = useAuth();
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const oppsRes = await axios.get(`${API}/opportunities`, { withCredentials: true });
        const allBriefs = [];
        for (const opp of oppsRes.data) {
          const oppDetail = await axios.get(`${API}/opportunities/${opp.opportunity_id}`, { withCredentials: true });
          for (const brief of (oppDetail.data.briefs || [])) allBriefs.push({ ...brief, opportunity_title: opp.title });
        }
        allBriefs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setBriefs(allBriefs);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [API]);

  return (
    <div data-testid="briefs-list-page" className="p-4 md:p-6 space-y-6">
      <div><h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">Product Briefs</h1><p className="text-xs font-mono text-[#A1A1AA] mt-1">{briefs.length} product briefs created</p></div>
      {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-white border border-[#E4E4E7] animate-pulse" />)}</div> : briefs.length === 0 ? (
        <div className="border border-[#E4E4E7] bg-white p-12 text-center shadow-sm"><FileText className="w-10 h-10 text-[#E4E4E7] mx-auto mb-3" /><p className="text-sm font-mono text-[#A1A1AA]">No product briefs yet</p></div>
      ) : (
        <div className="border border-[#E4E4E7] bg-white shadow-sm">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#FAFAFA] border-b border-[#E4E4E7] text-[10px] font-mono tracking-[0.15em] uppercase text-[#A1A1AA]"><div className="col-span-4">Opportunity</div><div className="col-span-2">Version</div><div className="col-span-2">Status</div><div className="col-span-2">Spec</div><div className="col-span-2">Created</div></div>
          {briefs.map((brief, idx) => (
            <button key={brief.brief_id || idx} data-testid={`briefs-list-item-${idx}`} onClick={() => navigate(`/briefs/${brief.brief_id}`)} className="w-full grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#E4E4E7] hover:bg-[#FAFAFA] transition-colors text-left">
              <div className="col-span-4 text-xs font-mono text-[#171717] truncate">{brief.opportunity_title || 'Unknown'}</div>
              <div className="col-span-2 text-xs font-mono text-[#71717A]">v{brief.version}</div>
              <div className="col-span-2"><span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${brief.status === 'DRAFT' ? 'text-amber-600 border-amber-200 bg-amber-50' : brief.status === 'FINAL' ? 'text-green-600 border-green-200 bg-green-50' : 'text-[#002FA7] border-blue-200 bg-blue-50'}`}>{brief.status}</span></div>
              <div className="col-span-2 text-[10px] font-mono text-[#71717A]">{brief.spec ? 'Generated' : 'Pending'}</div>
              <div className="col-span-2 flex items-center justify-between"><span className="text-[10px] font-mono text-[#A1A1AA]">{new Date(brief.created_at).toLocaleDateString()}</span><ChevronRight className="w-3 h-3 text-[#A1A1AA]" /></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
