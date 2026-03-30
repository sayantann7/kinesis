import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { ArrowLeft, Code2, Check, Loader2, RefreshCw, Upload, Shield, CheckCircle, XCircle, HelpCircle, ArrowRight, Clock, Download, Copy, Github, Share2, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { toast } from 'sonner';

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

const Section = ({ title, children, className = '' }) => (
  <div className={`border border-[#E4E4E7] bg-white shadow-sm rounded-sm ${className}`}>
    <div className="px-4 py-2 border-b border-[#E4E4E7] bg-[#FAFAFA]">
      <h3 className="text-[10px] font-mono tracking-[0.15em] uppercase text-[#A1A1AA]">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const ValidationBadge = ({ status }) => {
  const styles = {
    PASS: 'text-green-600 border-green-200 bg-green-50',
    FAIL: 'text-red-600 border-red-200 bg-red-50',
    PARTIAL: 'text-amber-600 border-amber-200 bg-amber-50',
    PENDING: 'text-[#71717A] border-gray-200 bg-gray-50',
    UNCLEAR: 'text-purple-600 border-purple-200 bg-purple-50',
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
  const icons = {
    PENDING: null,
    IN_PROGRESS: <Loader2 className="w-3 h-3 animate-spin" />,
    DONE: <Check className="w-3 h-3" />,
    BLOCKED: <XCircle className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${styles[status] || styles.PENDING}`}>
      {icons[status]}
      {status}
    </span>
  );
};

const TaskItem = ({ task }) => {
  const priorityStyles = {
    HIGH: 'text-red-600 border-red-200 bg-red-50',
    MEDIUM: 'text-amber-600 border-amber-200 bg-amber-50',
    LOW: 'text-gray-600 border-gray-200 bg-gray-50',
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#E4E4E7] last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[9px] font-mono px-1 py-0.5 border rounded-sm ${priorityStyles[task.priority] || priorityStyles.MEDIUM}`}>
            {task.priority}
          </span>
          <StatusBadge status={task.status} />
        </div>
        <p className="text-xs font-mono text-[#171717] font-medium">{task.title}</p>
        <p className="text-[10px] font-mono text-[#A1A1AA] mt-0.5">{task.description}</p>
        {task.implementation_notes && (
          <p className="text-[10px] font-mono text-[#002FA7] mt-1 italic">Notes: {task.implementation_notes}</p>
        )}
      </div>
    </div>
  );
};

const ActivityItem = ({ activity }) => {
  const typeConfig = {
    task_update: { icon: <RefreshCw className="w-3 h-3" />, color: 'bg-[#002FA7]', label: 'Task Updated' },
    implementation_submitted: { icon: <Upload className="w-3 h-3" />, color: 'bg-amber-500', label: 'Submitted' },
    implementation_validated: { icon: <Shield className="w-3 h-3" />, color: 'bg-green-500', label: 'Validated' },
  };
  const config = typeConfig[activity.type] || typeConfig.task_update;

  return (
    <div className="flex gap-3 py-2">
      <div className={`w-6 h-6 rounded-full ${config.color} flex items-center justify-center text-white flex-shrink-0`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-mono text-[#171717] font-medium">{config.label}</span>
          <span className="text-[9px] font-mono text-[#A1A1AA]">{formatRelativeTime(activity.created_at)}</span>
        </div>
        {activity.type === 'task_update' && activity.task_title && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-[#71717A]">
            <span className="truncate">{activity.task_title}</span>
            <ArrowRight className="w-3 h-3 flex-shrink-0" />
            <StatusBadge status={activity.new_status} />
          </div>
        )}
        {activity.type === 'implementation_validated' && (
          <ValidationBadge status={activity.result} />
        )}
        {activity.notes && (
          <p className="text-[9px] font-mono text-[#A1A1AA] mt-0.5 italic truncate">"{activity.notes}"</p>
        )}
      </div>
    </div>
  );
};

const ValidationResult = ({ implementation }) => {
  const result = implementation?.validation_result;
  if (!result) return null;

  return (
    <Section title="Validation Result">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-[#71717A]">Result:</span>
        <ValidationBadge status={result.overall} />
      </div>
    </Section>
  );
};

export default function SpecDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { API } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingSpec, setGeneratingSpec] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showGithub, setShowGithub] = useState(false);
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [githubResult, setGithubResult] = useState(null);
  const [sharing, setSharing] = useState(false);

  const generateSpec = async () => {
    setGeneratingSpec(true);
    try {
      await axios.post(`${API}/briefs/${id}/generate-spec`, { prompt: regenPrompt }, { withCredentials: true }); fetchSpec(); toast.success('Spec regenerated successfully'); } catch (e) { console.error(e); toast.error('Failed to generate spec'); } finally { setGeneratingSpec(false); } };

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
      navigator.clipboard.writeText(link);
      toast.success('Share link copied to clipboard');
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to create share link');
    }
    finally { setSharing(false); }
  };

  const fetchSpec = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/specs/${id}`, { withCredentials: true });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Spec not found');
    } finally {
      setLoading(false);
    }
  }, [API, id]);

  useEffect(() => { fetchSpec(); }, [fetchSpec]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-[#002FA7] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="border border-[#E4E4E7] bg-white p-12 text-center shadow-sm rounded-sm">
          <Code2 className="w-10 h-10 text-[#E4E4E7] mx-auto mb-3" />
          <p className="text-sm font-mono text-[#A1A1AA]">{error}</p>
          <button onClick={() => navigate('/specs')} className="mt-4 text-xs font-mono text-[#002FA7] hover:underline">
            Back to Specs
          </button>
        </div>
      </div>
    );
  }

  const { brief, opportunity, tasks, implementations, activity } = data;
  const spec = brief?.spec || {};
  const content = brief?.content || {};
  const latestImpl = implementations?.[0];

  const taskStats = {
    total: tasks?.length || 0,
    done: tasks?.filter(t => t.status === 'DONE').length || 0,
    in_progress: tasks?.filter(t => t.status === 'IN_PROGRESS').length || 0,
    blocked: tasks?.filter(t => t.status === 'BLOCKED').length || 0,
  };

  return (
    <div data-testid="spec-detail-page" className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/specs')} className="p-1.5 border border-[#E4E4E7] hover:bg-[#FAFAFA] rounded-sm mt-1">
          <ArrowLeft className="w-4 h-4 text-[#71717A]" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Code2 className="w-5 h-5 text-[#002FA7]" />
            <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-[#171717] truncate">
              {opportunity?.title || 'Untitled Spec'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-mono px-2 py-0.5 border rounded-sm ${brief?.status === 'FINAL' ? 'text-green-600 border-green-200 bg-green-50' : 'text-amber-600 border-amber-200 bg-amber-50'}`}>
              {brief?.status}
            </span>
            <span className="text-xs font-mono text-[#A1A1AA]">v{brief?.version}</span>
            <span className="text-xs font-mono text-[#A1A1AA]">•</span>
            <span className="text-xs font-mono text-[#A1A1AA]">{taskStats.done}/{taskStats.total} tasks done</span>
          </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input type="text" value={regenPrompt} onChange={(e) => setRegenPrompt(e.target.value)} placeholder="Instructions (e.g. Keep it concise)" className="border border-[#E4E4E7] rounded-sm text-xs px-2 py-1.5 focus:outline-none focus:border-[#A1A1AA] w-64" disabled={generatingSpec} />
            <button data-testid="generate-spec-btn" onClick={generateSpec} disabled={generatingSpec} className="flex items-center gap-1.5 bg-[#002FA7] hover:bg-[#0044FF] text-white text-xs font-mono px-3 py-1.5 transition-colors disabled:opacity-50 rounded-sm"><Zap className={`w-3.5 h-3.5 ${generatingSpec ? 'animate-pulse' : ''}`} />{generatingSpec ? 'Generating...' : 'Generate Spec'}</button>
          {spec && <>
            <button data-testid="export-pdf-btn" onClick={exportPdf} disabled={exportingPdf} className="flex items-center gap-1.5 bg-[#171717] hover:bg-[#333] text-white text-xs font-mono px-3 py-1.5 transition-colors disabled:opacity-50 rounded-sm"><Download className={`w-3.5 h-3.5 ${exportingPdf ? 'animate-spin' : ''}`} />{exportingPdf ? 'Exporting...' : 'Export PDF'}</button>
            <button data-testid="export-md-btn" onClick={exportMarkdown} className="flex items-center gap-1.5 border border-[#E4E4E7] hover:border-[#D4D4D8] text-[#171717] text-xs font-mono px-3 py-1.5 transition-colors rounded-sm"><Copy className="w-3.5 h-3.5" /> Markdown</button>
            <button data-testid="export-github-btn" onClick={openGithubExport} className="flex items-center gap-1.5 border border-[#E4E4E7] hover:border-[#171717] text-[#171717] text-xs font-mono px-3 py-1.5 transition-colors rounded-sm"><Github className="w-3.5 h-3.5" /> GitHub</button>
            <button data-testid="share-spec-btn" onClick={shareSpec} disabled={sharing} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-mono px-3 py-1.5 transition-colors rounded-sm disabled:opacity-50"><Share2 className="w-3.5 h-3.5" /> {sharing ? 'Sharing...' : 'Share'}</button>
          </>}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Spec Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Problem Statement */}
          {content.problem_statement && (
            <Section title="Problem Statement">
              <p className="text-sm font-mono text-[#3f3f46] leading-relaxed whitespace-pre-wrap">{typeof content.problem_statement === 'object' ? JSON.stringify(content.problem_statement, null, 2) : content.problem_statement}</p>
            </Section>
          )}

          {/* User Stories */}
          {spec.user_stories?.length > 0 && (
            <Section title="User Stories">
              <div className="space-y-4">
                {spec.user_stories.map((story, i) => (
                  <div key={i}>
                    <p className="text-xs font-mono text-[#171717] font-medium mb-1">{story.title}</p>
                    <ul className="space-y-0.5 pl-3">
                      {(story.acceptance_criteria || []).map((ac, j) => (
                        <li key={j} className="text-[10px] font-mono text-[#71717A] flex items-start gap-1">
                          <span className="text-[#002FA7]">-</span>
                          <span>{typeof ac === 'object' ? JSON.stringify(ac) : ac}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* API Contracts */}
          {spec.api_contracts?.length > 0 && (
            <Section title="API Contracts">
              <div className="space-y-2">
                {spec.api_contracts.map((api, i) => (
                  <div key={i} className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#002FA7]/10 text-[#002FA7] rounded-sm font-medium">
                      {api.method}
                    </span>
                    <code className="text-xs font-mono text-[#171717]">{api.path}</code>
                    <span className="text-[10px] font-mono text-[#A1A1AA]">— {api.description}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Database Migrations */}
          {spec.database_migrations?.length > 0 && (
            <Section title="Database Migrations">
              <ul className="space-y-1">
                {spec.database_migrations.map((m, i) => (
                  <li key={i} className="text-xs font-mono text-[#3f3f46] flex items-start gap-2">
                    <span className="text-[#002FA7]">•</span>
                    <span>{typeof m === 'object' ? JSON.stringify(m) : m}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* UI Components */}
          {spec.ui_components?.length > 0 && (
            <Section title="UI Components">
              <div className="space-y-3">
                {spec.ui_components.map((comp, i) => (
                  <div key={i}>
                    <p className="text-xs font-mono text-[#171717] font-medium">{comp.name}</p>
                    {comp.description && <p className="text-[10px] font-mono text-[#A1A1AA] mt-0.5">{comp.description}</p>}
                    {comp.props?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {comp.props.map((prop, j) => (
                          <span key={j} className="text-[9px] font-mono px-1.5 py-0.5 bg-[#F4F4F5] text-[#71717A] rounded-sm">
                            {prop}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Tasks */}
          {tasks?.length > 0 && (
            <Section title={`Implementation Tasks (${taskStats.done}/${taskStats.total} done)`}>
              <div className="divide-y divide-[#E4E4E7]">
                {tasks.map(task => (
                  <TaskItem key={task.task_id} task={task} />
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right Column - Activity & Validation */}
        <div className="space-y-4">
          {/* Latest Validation */}
          {latestImpl?.validation_result && (
            <ValidationResult implementation={latestImpl} />
          )}

          {/* Implementations */}
          {implementations?.length > 0 && (
            <Section title={`Implementations (${implementations.length})`}>
              <div className="space-y-3">
                {implementations.slice(0, 5).map((impl, i) => (
                  <div key={impl.impl_id} className="border-b border-[#E4E4E7] last:border-b-0 pb-3 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ValidationBadge status={impl.validation_status} />
                      <span className="text-[9px] font-mono text-[#A1A1AA]">{formatRelativeTime(impl.created_at)}</span>
                    </div>
                    <p className="text-[10px] font-mono text-[#71717A] line-clamp-3">{impl.implementation}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Activity Timeline */}
          <Section title="Recent Activity">
            {activity?.length > 0 ? (
              <div className="space-y-1">
                {activity.slice(0, 10).map((act, i) => (
                  <ActivityItem key={act.activity_id || i} activity={act} />
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock className="w-6 h-6 text-[#E4E4E7] mx-auto mb-2" />
                <p className="text-[10px] font-mono text-[#A1A1AA]">No activity yet</p>
                <p className="text-[9px] font-mono text-[#A1A1AA]">Connect Cursor to start tracking</p>
              </div>
            )}
          </Section>

          {/* Link to Activity Page */}
          <Link
            to={`/activity?brief_id=${id}`}
            className="block text-center text-xs font-mono text-[#002FA7] hover:underline py-2 border border-[#E4E4E7] rounded-sm bg-white"
          >
            View All Activity →
          </Link>
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
