import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Settings, User, Key, Hash, Github, Cpu, Copy, Check, RefreshCw, Trash2, Eye, EyeOff, Clock, ArrowRight } from 'lucide-react';

export default function SettingsPage() {
  const { user, API } = useAuth();
  const [mcpKey, setMcpKey] = useState(null);
  const [mcpLoading, setMcpLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [mcpActivity, setMcpActivity] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [keyRes, actRes] = await Promise.all([
          axios.get(`${API}/mcp/key`, { withCredentials: true }),
          axios.get(`${API}/mcp/activity?limit=10`, { withCredentials: true })
        ]);
        setMcpKey(keyRes.data);
        setMcpActivity(actRes.data);
      } catch (e) { console.error(e); }
      finally { setMcpLoading(false); }
    })();
  }, [API]);

  const generateKey = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/mcp/generate-key`, {}, { withCredentials: true });
      setMcpKey({ has_key: true, api_key: res.data.api_key, created_at: new Date().toISOString() });
      setShowKey(true);
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  };

  const revokeKey = async () => {
    if (!window.confirm('Revoke MCP key? Cursor will lose access.')) return;
    try { await axios.delete(`${API}/mcp/key`, { withCredentials: true }); setMcpKey({ has_key: false }); } catch (e) { console.error(e); }
  };

  const copyKey = () => { navigator.clipboard.writeText(mcpKey.api_key); setCopied(true); setTimeout(() => setCopied(false), 2000); };

const mcpUrl = `${process.env.REACT_APP_BACKEND_URL}/api/mcp/sse?api_key=${mcpKey?.api_key || 'YOUR_KEY_HERE'}`;
  const cursorConfig = JSON.stringify({ mcpServers: { kinesis: { type: "sse", url: mcpUrl } } }, null, 2);

  return (
    <div data-testid="settings-page" className="p-4 md:p-6 space-y-6">
      <div><h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">Settings</h1><p className="text-xs font-mono text-[#A1A1AA] mt-1">Manage integrations and MCP connection</p></div>

      {/* Profile */}
      <div className="border border-[#E4E4E7] bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-[#E4E4E7]"><h3 className="text-sm font-heading font-bold text-[#171717] flex items-center gap-2"><User className="w-4 h-4" /> Profile</h3></div>
        <div className="p-4 flex items-center gap-4">
          {user?.picture ? <img src={user.picture} alt="" className="w-12 h-12 rounded-full" /> : <div className="w-12 h-12 bg-[#E4E4E7] rounded-full" />}
          <div><p className="text-sm font-mono text-[#171717]">{user?.name}</p><p className="text-xs font-mono text-[#A1A1AA]">{user?.email}</p></div>
        </div>
      </div>

      {/* MCP Integration — MAIN FEATURE */}
      <div className="border-2 border-[#002FA7]/20 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-[#002FA7]/20 bg-[#002FA7]/5">
          <h3 className="text-sm font-heading font-bold text-[#002FA7] flex items-center gap-2"><Cpu className="w-4 h-4" /> MCP Integration — Cursor Bridge</h3>
          <p className="text-[10px] font-mono text-[#002FA7]/70 mt-0.5">Connect Kinesis to Cursor for bidirectional spec execution</p>
        </div>
        <div className="p-4 space-y-4">
          {/* API Key */}
          <div>
            <label className="text-xs font-mono text-[#A1A1AA] block mb-1.5">MCP API Key</label>
            {mcpLoading ? <div className="h-10 bg-[#FAFAFA] animate-pulse rounded-sm" /> : mcpKey?.has_key ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#FAFAFA] border border-[#E4E4E7] px-3 py-2 rounded-sm flex items-center gap-2">
                  <code className="text-xs font-mono text-[#171717] flex-1 truncate">{showKey ? mcpKey.api_key : '••••••••••••••••••••••••'}</code>
                  <button data-testid="toggle-key-visibility" onClick={() => setShowKey(!showKey)} className="text-[#A1A1AA] hover:text-[#171717]">{showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
                </div>
                <button data-testid="copy-mcp-key-btn" onClick={copyKey} className="p-2 border border-[#E4E4E7] hover:border-[#D4D4D8] rounded-sm">{copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-[#A1A1AA]" />}</button>
                <button data-testid="revoke-mcp-key-btn" onClick={revokeKey} className="p-2 border border-red-200 hover:bg-red-50 rounded-sm"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            ) : (
              <button data-testid="generate-mcp-key-btn" onClick={generateKey} disabled={generating} className="flex items-center gap-2 bg-[#002FA7] hover:bg-[#0044FF] text-white text-xs font-mono px-4 py-2 transition-colors rounded-sm disabled:opacity-50">
                <Key className="w-3.5 h-3.5" />{generating ? 'Generating...' : 'Generate MCP Key'}
              </button>
            )}
          </div>

          {/* Integration Guide */}
          <div className="border border-[#E4E4E7] bg-[#FAFAFA] p-4 rounded-sm">
            <h4 className="text-xs font-heading font-bold text-[#171717] mb-3 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#E0E7FF] text-[#002FA7] text-[10px]">💡</span>
              Cursor IDE Setup Guide
            </h4>
            
            <ol className="relative border-l border-[#E4E4E7] ml-2.5 space-y-4 text-[11px] font-mono text-[#52525B]">
              <li className="ml-5">
                <span className="absolute flex items-center justify-center w-5 h-5 bg-white rounded-full -left-2.5 border border-[#E4E4E7] text-[9px] font-bold text-[#002FA7]">1</span>
                <div>
                  <strong className="text-[#171717] block mb-1">Generate API Key</strong>
                  Use the <span className="text-[#002FA7]">"Generate MCP Key"</span> button above to create a unique access token.
                </div>
              </li>
              <li className="ml-5">
                <span className="absolute flex items-center justify-center w-5 h-5 bg-white rounded-full -left-2.5 border border-[#E4E4E7] text-[9px] font-bold text-[#002FA7]">2</span>
                <div>
                  <strong className="text-[#171717] block mb-1">Configure Cursor</strong>
                  Open <code className="bg-[#F4F4F5] px-1 py-0.5 rounded text-[#E11D48]">.cursor/mcp.json</code> in your project and add:
                  <pre className="mt-2 p-2 bg-[#18181B] text-green-400 rounded text-[10px] overflow-x-auto border border-[#27272A]">
                    {cursorConfig}
                  </pre>
                </div>
              </li>
              <li className="ml-5">
                <span className="absolute flex items-center justify-center w-5 h-5 bg-white rounded-full -left-2.5 border border-[#E4E4E7] text-[9px] font-bold text-[#002FA7]">3</span>
                <div>
                  <strong className="text-[#171717] block mb-1">Start Coding</strong>
                  Open Cursor's Composer panel and ask: <br/>
                  <span className="italic">"Analyze my assigned tasks from Kinesis and implement them."</span>
                </div>
              </li>
            </ol>
          </div>

          {/* Available Tools */}
          <div>
            <label className="text-xs font-mono text-[#A1A1AA] block mb-1.5">Available MCP Tools</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { name: 'list_specs', desc: 'List all finalized specs in workspace' },
                { name: 'get_spec', desc: 'Fetch complete spec with tasks & criteria' },
                { name: 'update_task_status', desc: 'Mark tasks as DONE/IN_PROGRESS' },
                { name: 'submit_implementation', desc: 'Submit code for review' },
                { name: 'validate_implementation', desc: 'AI validates against criteria' },
              ].map(t => (
                <div key={t.name} className="flex items-start gap-2 p-2 border border-[#E4E4E7] rounded-sm">
                  <Cpu className="w-3 h-3 text-[#002FA7] mt-0.5 flex-shrink-0" />
                  <div><p className="text-[10px] font-mono text-[#171717] font-medium">{t.name}</p><p className="text-[9px] font-mono text-[#A1A1AA]">{t.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MCP Activity Log */}
      {mcpActivity.length > 0 && (
        <div className="border border-[#E4E4E7] bg-white shadow-sm">
          <div className="px-4 py-3 border-b border-[#E4E4E7]"><h3 className="text-sm font-heading font-bold text-[#171717] flex items-center gap-2"><Clock className="w-4 h-4" /> MCP Activity</h3></div>
          <div className="divide-y divide-[#E4E4E7]">
            {mcpActivity.map((act, idx) => (
              <div key={act.activity_id || idx} className="px-4 py-2 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${act.type === 'task_update' ? 'bg-[#002FA7]' : act.type === 'implementation_validated' ? 'bg-green-500' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-[#171717]">
                    {act.type === 'task_update' ? `Task → ${act.new_status}` : act.type === 'implementation_submitted' ? 'Implementation submitted' : `Validation: ${act.result || 'done'}`}
                  </p>
                  {act.notes && <p className="text-[9px] font-mono text-[#A1A1AA] truncate">{act.notes}</p>}
                </div>
                <span className="text-[9px] font-mono text-[#A1A1AA]">{act.source}</span>
                <span className="text-[9px] font-mono text-[#A1A1AA]">{new Date(act.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
