import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, Zap, Copy, Check, FileText, Download, Github, Loader2, Share2, Link2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { toast } from 'sonner';

export default function BriefEditorPage() {
  const { id } = useParams();
  const { API, user } = useAuth();
  const navigate = useNavigate();
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingSpec, setGeneratingSpec] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showGithub, setShowGithub] = useState(false);
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [githubResult, setGithubResult] = useState(null);
  const [exportedMd, setExportedMd] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const isViewer = user?.workspace_role === 'VIEWER';

  useEffect(() => { (async () => { try { const res = await axios.get(`${API}/briefs/${id}`, { withCredentials: true }); setBrief(res.data); } catch (e) { console.error(e); } finally { setLoading(false); } })(); }, [API, id]);

  const updateContent = (key, value) => setBrief(prev => ({ ...prev, content: { ...prev.content, [key]: value } }));

  const saveBrief = async () => { setSaving(true); try { await axios.put(`${API}/briefs/${id}`, { content: brief.content }, { withCredentials: true }); } catch (e) { console.error(e); } finally { setSaving(false); } };

  const generateSpec = async () => { setGeneratingSpec(true); try { const res = await axios.post(`${API}/briefs/${id}/generate-spec`, {}, { withCredentials: true }); setBrief(res.data); } catch (e) { console.error(e); } finally { setGeneratingSpec(false); } };

  const exportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await axios.post(`${API}/briefs/${id}/export-pdf`, {}, { withCredentials: true, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `spec-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported successfully');
    } catch (e) { 
      console.error(e); 
      toast.error('PDF export failed'); 
    }
    finally { setExportingPdf(false); }
  };

  const exportMarkdown = async () => {
    try { 
      const res = await axios.post(`${API}/briefs/${id}/export`, {}, { withCredentials: true }); 
      navigator.clipboard.writeText(res.data.markdown);
      toast.success('Markdown copied to clipboard');
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to export markdown');
    }
  };

  const openGithubExport = async () => {
    setShowGithub(true);
    setReposLoading(true);
    try { const res = await axios.get(`${API}/github/repos`, { withCredentials: true }); setRepos(res.data); } catch (e) { console.error(e); }
    finally { setReposLoading(false); }
  };

  const exportToGithub = async () => {
    if (!selectedRepo) return;
    setExporting(true);
    try { const res = await axios.post(`${API}/github/export`, { brief_id: id, repo: selectedRepo }, { withCredentials: true }); setGithubResult(res.data); } catch (e) { console.error(e); toast.error('GitHub export failed'); }
    finally { setExporting(false); }
  };

  const shareSpec = async () => {
    setSharing(true);
    try {
      const res = await axios.post(`${API}/briefs/${id}/share`, {}, { withCredentials: true });
      const link = `${window.location.origin}/shared/${res.data.share_id}`;
      setShareLink(link);
      navigator.clipboard.writeText(link);
      toast.success('Share link copied to clipboard');
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to create share link');
    }
    finally { setSharing(false); }
  };

  const revokeShare = async () => {
    try { 
      await axios.delete(`${API}/briefs/${id}/share`, { withCredentials: true }); 
      setShareLink(''); 
      toast.success('Share link revoked');
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to revoke share link');
    }
  };

  const copyShareLink = () => { navigator.clipboard.writeText(shareLink); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (loading) return <div className="p-6"><div className="h-64 bg-white border border-[#E4E4E7] animate-pulse" /></div>;
  if (!brief) return <div className="p-6 text-center text-[#A1A1AA] font-mono text-sm">Brief not found</div>;

  const content = brief.content || {};
  const spec = brief.spec;

  return (
    <div data-testid="brief-editor-page" className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button data-testid="back-btn" onClick={() => navigate(-1)} className="text-[#A1A1AA] hover:text-[#171717] transition-colors"><ArrowLeft className="w-4 h-4" /></button>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-[#171717]">Feature Brief v{brief.version}</h1>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${brief.status === 'DRAFT' ? 'text-amber-600 border-amber-200 bg-amber-50' : brief.status === 'FINAL' ? 'text-green-600 border-green-200 bg-green-50' : 'text-[#002FA7] border-blue-200 bg-blue-50'}`}>{brief.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button data-testid="save-brief-btn" onClick={saveBrief} disabled={saving} className="flex items-center gap-1.5 border border-[#E4E4E7] hover:border-[#D4D4D8] text-[#171717] text-xs font-mono px-3 py-1.5 transition-colors disabled:opacity-50 rounded-sm"><Save className="w-3.5 h-3.5" />{saving ? 'Saving...' : 'Save'}</button>
          <button data-testid="generate-spec-btn" onClick={generateSpec} disabled={generatingSpec} className="flex items-center gap-1.5 bg-[#002FA7] hover:bg-[#0044FF] text-white text-xs font-mono px-3 py-1.5 transition-colors disabled:opacity-50 rounded-sm"><Zap className={`w-3.5 h-3.5 ${generatingSpec ? 'animate-pulse' : ''}`} />{generatingSpec ? 'Generating...' : 'Generate Spec'}</button>
          {spec && <>
            <button data-testid="export-pdf-btn" onClick={exportPdf} disabled={exportingPdf} className="flex items-center gap-1.5 bg-[#171717] hover:bg-[#333] text-white text-xs font-mono px-3 py-1.5 transition-colors disabled:opacity-50 rounded-sm"><Download className={`w-3.5 h-3.5 ${exportingPdf ? 'animate-spin' : ''}`} />{exportingPdf ? 'Exporting...' : 'Export PDF'}</button>
            <button data-testid="export-md-btn" onClick={exportMarkdown} className="flex items-center gap-1.5 border border-[#E4E4E7] hover:border-[#D4D4D8] text-[#171717] text-xs font-mono px-3 py-1.5 transition-colors rounded-sm"><Copy className="w-3.5 h-3.5" /> Markdown</button>
            <button data-testid="export-github-btn" onClick={openGithubExport} className="flex items-center gap-1.5 border border-[#E4E4E7] hover:border-[#171717] text-[#171717] text-xs font-mono px-3 py-1.5 transition-colors rounded-sm"><Github className="w-3.5 h-3.5" /> GitHub</button>
            <button data-testid="share-spec-btn" onClick={shareSpec} disabled={sharing} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-mono px-3 py-1.5 transition-colors rounded-sm disabled:opacity-50"><Share2 className="w-3.5 h-3.5" /> {sharing ? 'Sharing...' : 'Share'}</button>
          </>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          {['problem_statement', 'success_metrics', 'proposed_ui', 'data_model_changes', 'workflow_impact', 'edge_cases_and_risks'].map(key => {
            const labels = { problem_statement: 'Problem Statement', success_metrics: 'Success Metrics', proposed_ui: 'Proposed UI', data_model_changes: 'Data Model Changes', workflow_impact: 'Workflow Impact', edge_cases_and_risks: 'Edge Cases & Risks' };
            const isArray = key === 'success_metrics' || key === 'edge_cases_and_risks';
            
            let displayValue = '';
            if (isArray) {
              displayValue = Array.isArray(content[key]) ? content[key].map(i => typeof i === 'object' ? JSON.stringify(i) : i).join('\n') : String(content[key] || '');
            } else {
              displayValue = typeof content[key] === 'object' ? JSON.stringify(content[key], null, 2) : (content[key] || '');
            }

            return (
              <div key={key} className="border border-[#E4E4E7] bg-white shadow-sm">
                <div className="px-4 py-2 border-b border-[#E4E4E7] bg-[#FAFAFA]"><h3 className="text-xs font-mono tracking-[0.15em] uppercase text-[#A1A1AA]">{labels[key]}</h3></div>
                <textarea data-testid={`${key}-input`} value={displayValue} onChange={e => updateContent(key, isArray ? e.target.value.split('\n').filter(Boolean) : e.target.value)} rows={key === 'problem_statement' || key === 'data_model_changes' ? 6 : 3} className="w-full bg-transparent text-sm font-mono text-[#171717] px-4 py-3 focus:outline-none resize-none" placeholder={isArray ? 'One item per line...' : `Enter ${labels[key].toLowerCase()}...`} />
              </div>
            );
          })}
        </div>
        <div className="space-y-4">
          {spec ? (
            <>
              {[{ key: 'user_stories', label: 'User Stories' }, { key: 'api_contracts', label: 'API Contracts' }, { key: 'tasks', label: 'Tasks' }].map(({ key, label }) => (
                <div key={key} className="border border-[#E4E4E7] bg-white shadow-sm">
                  <div className="px-4 py-2 border-b border-[#E4E4E7] bg-[#FAFAFA]"><h3 className="text-xs font-mono tracking-[0.15em] uppercase text-[#A1A1AA]">{label}</h3></div>
                  <div className="divide-y divide-[#E4E4E7]">
                    {(spec[key] || []).map((item, idx) => (
                      <div key={idx} className="px-4 py-3">
                        {key === 'user_stories' && <><p className="text-xs font-mono text-[#171717] font-medium">{item.title}</p><ul className="mt-1 space-y-0.5">{(item.acceptance_criteria || []).map((ac, i) => <li key={i} className="text-[10px] font-mono text-[#71717A]">- {typeof ac === 'object' ? JSON.stringify(ac) : ac}</li>)}</ul></>}
                        {key === 'api_contracts' && <><div className="flex items-center gap-2"><span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#002FA7]/10 text-[#002FA7] rounded-sm">{item.method}</span><code className="text-xs font-mono text-[#171717]">{item.path}</code></div><p className="text-[10px] font-mono text-[#A1A1AA] mt-0.5">{item.description}</p></>}
                        {key === 'tasks' && <><div className="flex items-center gap-2"><span className={`text-[9px] font-mono px-1 py-0.5 border rounded-sm ${item.priority === 'HIGH' ? 'text-red-600 border-red-200 bg-red-50' : item.priority === 'MEDIUM' ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-[#71717A] border-gray-200 bg-gray-50'}`}>{item.priority}</span><span className="text-xs font-mono text-[#171717]">{item.title}</span></div><p className="text-[10px] font-mono text-[#A1A1AA] mt-0.5">{item.description}</p></>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {(spec.database_migrations || []).length > 0 && <div className="border border-[#E4E4E7] bg-white shadow-sm"><div className="px-4 py-2 border-b border-[#E4E4E7] bg-[#FAFAFA]"><h3 className="text-xs font-mono tracking-[0.15em] uppercase text-[#A1A1AA]">Database Changes</h3></div><div className="px-4 py-3">{(spec.database_migrations || []).map((m, idx) => <p key={idx} className="text-xs font-mono text-[#71717A] mb-1">- {typeof m === 'object' ? JSON.stringify(m) : m}</p>)}</div></div>}
            </>
          ) : (
            <div className="border border-[#E4E4E7] bg-white p-12 text-center shadow-sm"><Zap className="w-10 h-10 text-[#E4E4E7] mx-auto mb-3" /><p className="text-sm font-mono text-[#A1A1AA]">No spec generated yet</p><p className="text-xs font-mono text-[#A1A1AA] mt-1">Click "Generate Spec" to create executable specifications</p></div>
          )}
          
        </div>
      </div>

      

      {/* GitHub Export Dialog */}
      <Dialog open={showGithub} onOpenChange={setShowGithub}>
        <DialogContent className="bg-white border-[#E4E4E7] text-[#171717] max-w-md shadow-lg">
          <DialogHeader><DialogTitle className="font-heading text-lg font-bold flex items-center gap-2"><Github className="w-5 h-5" /> Export to GitHub</DialogTitle><DialogDescription className="text-xs font-mono text-[#A1A1AA]">Create issues from this spec in a GitHub repo</DialogDescription></DialogHeader>
          {githubResult ? (
            <div className="space-y-3">
              <p className="text-xs font-mono text-green-600 font-medium">Created {githubResult.issues?.length} issues in {githubResult.repo}</p>
              <div className="space-y-2 max-h-64 overflow-auto">{(githubResult.issues || []).map((issue, idx) => (
                <a key={idx} href={issue.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border border-[#E4E4E7] hover:border-[#D4D4D8] transition-colors rounded-sm">
                  <span className={`text-[9px] font-mono px-1 py-0.5 rounded-sm ${issue.type === 'main' ? 'bg-[#002FA7]/10 text-[#002FA7]' : 'bg-gray-100 text-[#71717A]'}`}>#{issue.number}</span>
                  <span className="text-xs font-mono text-[#171717] truncate">{issue.title}</span>
                </a>
              ))}</div>
              <button onClick={() => { setShowGithub(false); setGithubResult(null); }} className="w-full bg-[#171717] text-white text-sm font-mono py-2 rounded-sm">Done</button>
            </div>
          ) : (
            <div className="space-y-4">
              {reposLoading ? <div className="py-8 text-center"><Loader2 className="w-5 h-5 text-[#A1A1AA] animate-spin mx-auto" /></div> : (
                <>
                  <div><label className="text-xs font-mono text-[#A1A1AA] block mb-1.5">Select Repository</label>
                    <select data-testid="github-repo-select" value={selectedRepo} onChange={e => setSelectedRepo(e.target.value)} className="w-full bg-[#FAFAFA] border border-[#E4E4E7] text-[#171717] text-sm font-mono px-3 py-2 focus:border-[#002FA7] focus:outline-none rounded-sm">
                      <option value="">Choose a repository...</option>
                      {repos.map(r => <option key={r.full_name} value={r.full_name}>{r.full_name} {r.private ? '(private)' : ''}</option>)}
                    </select>
                  </div>
                  <button data-testid="confirm-github-export-btn" onClick={exportToGithub} disabled={!selectedRepo || exporting} className="w-full bg-[#171717] hover:bg-[#333] text-white text-sm font-mono py-2 transition-colors disabled:opacity-50 rounded-sm">{exporting ? 'Creating issues...' : 'Create Issues'}</button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
