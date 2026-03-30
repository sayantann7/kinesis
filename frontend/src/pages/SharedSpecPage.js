import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Database, FileText, Zap, ExternalLink } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SharedSpecPage() {
  const { shareId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/shared/${shareId}`);
        setData(res.data);
      } catch (e) {
        setError(e.response?.data?.detail || 'Shared spec not found');
      } finally { setLoading(false); }
    })();
  }, [shareId]);

  if (loading) return <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center"><div className="w-6 h-6 border-2 border-[#002FA7] border-t-transparent animate-spin" /></div>;
  if (error) return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <div className="text-center"><FileText className="w-12 h-12 text-[#E4E4E7] mx-auto mb-4" /><h2 className="font-heading text-xl font-bold text-[#171717] mb-2">Spec Not Found</h2><p className="text-sm font-mono text-[#A1A1AA]">{error}</p></div>
    </div>
  );

  const { brief, opportunity, workspace_name, shared_at } = data;
  const content = brief?.content || {};
  const spec = brief?.spec || {};

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="bg-white border-b border-[#E4E4E7] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-mono text-[#A1A1AA]">{workspace_name} · Shared Spec</p>
              <h1 className="font-heading text-lg font-bold text-[#171717]">{opportunity?.title || 'Feature Specification'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-2 py-1 border rounded-sm ${brief?.status === 'FINAL' ? 'text-green-600 border-green-200 bg-green-50' : 'text-amber-600 border-amber-200 bg-amber-50'}`}>{brief?.status}</span>
            <span className="text-[10px] font-mono text-[#A1A1AA]">v{brief?.version}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Brief Content */}
<Section title="Problem Statement"><p className="text-sm font-mono text-[#3f3f46] leading-relaxed whitespace-pre-wrap">{typeof content.problem_statement === 'object' ? JSON.stringify(content.problem_statement, null, 2) : (content.problem_statement || 'N/A')}</p></Section>

          {(content.success_metrics || []).length > 0 && (
            <Section title="Success Metrics">
              <ul className="space-y-1">{content.success_metrics.map((m, i) => <li key={i} className="text-sm font-mono text-[#3f3f46] flex items-start gap-2"><span className="text-[#002FA7] mt-0.5">-</span>{typeof m === 'object' ? JSON.stringify(m) : m}</li>)}</ul>
            </Section>
          )}

          {content.proposed_ui && <Section title="Proposed UI"><p className="text-sm font-mono text-[#3f3f46] leading-relaxed whitespace-pre-wrap">{typeof content.proposed_ui === 'object' ? JSON.stringify(content.proposed_ui, null, 2) : content.proposed_ui}</p></Section>}
          {content.workflow_impact && <Section title="Workflow Impact"><p className="text-sm font-mono text-[#3f3f46] leading-relaxed whitespace-pre-wrap">{typeof content.workflow_impact === 'object' ? JSON.stringify(content.workflow_impact, null, 2) : content.workflow_impact}</p></Section>}

          {(content.edge_cases_and_risks || []).length > 0 && (
            <Section title="Edge Cases & Risks">
              <ul className="space-y-1">{content.edge_cases_and_risks.map((r, i) => <li key={i} className="text-sm font-mono text-[#3f3f46] flex items-start gap-2"><span className="text-red-500 mt-0.5">!</span>{typeof r === 'object' ? JSON.stringify(r) : r}</li>)}</ul>
          </Section>
        )}

        {/* Spec */}
        {spec.user_stories?.length > 0 && (
          <Section title="User Stories">
            {spec.user_stories.map((s, i) => (
              <div key={i} className="mb-4"><p className="text-sm font-mono text-[#171717] font-medium">{s.title}</p>
                <ul className="mt-1 space-y-0.5">{(s.acceptance_criteria || []).map((ac, j) => <li key={j} className="text-xs font-mono text-[#71717A]">- {typeof ac === 'object' ? JSON.stringify(ac) : ac}</li>)}</ul>
              </div>
            ))}
          </Section>
        )}

        {spec.api_contracts?.length > 0 && (
          <Section title="API Contracts">
            {spec.api_contracts.map((a, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#002FA7]/10 text-[#002FA7] rounded-sm">{a.method}</span>
                <code className="text-xs font-mono text-[#171717]">{a.path}</code>
                <span className="text-[10px] font-mono text-[#A1A1AA]">- {a.description}</span>
              </div>
            ))}
          </Section>
        )}

        {spec.tasks?.length > 0 && (
          <Section title="Implementation Tasks">
            {spec.tasks.map((t, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className={`text-[9px] font-mono px-1 py-0.5 border rounded-sm mt-0.5 ${t.priority === 'HIGH' ? 'text-red-600 border-red-200 bg-red-50' : t.priority === 'MEDIUM' ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-gray-600 border-gray-200 bg-gray-50'}`}>{t.priority}</span>
                <div><p className="text-xs font-mono text-[#171717] font-medium">{t.title}</p><p className="text-[10px] font-mono text-[#A1A1AA]">{t.description}</p></div>
              </div>
            ))}
          </Section>
        )}

        <div className="text-center py-6 border-t border-[#E4E4E7]">
          <p className="text-[10px] font-mono text-[#A1A1AA]">Shared from Kinesis · {shared_at ? new Date(shared_at).toLocaleDateString() : ''}</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="border border-[#E4E4E7] bg-white shadow-sm">
      <div className="px-5 py-3 border-b border-[#E4E4E7] bg-[#FAFAFA]"><h3 className="text-xs font-mono tracking-[0.15em] uppercase text-[#A1A1AA]">{title}</h3></div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
