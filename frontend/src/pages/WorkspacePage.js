import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Users, Plus, Mail, Link2, Copy, Check, Trash2, Shield, Eye, Pencil, Crown, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';

export default function WorkspacePage() {
  const { API, user, checkAuth } = useAuth();
  const [searchParams] = useSearchParams();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreate, setShowCreate] = useState(searchParams.get('create') === '1');
  const [showJoin, setShowJoin] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EDITOR');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showMigrate, setShowMigrate] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const wsId = user?.active_workspace_id;
  const ws = user?.workspace;
  const myRole = user?.workspace_role;

  const fetchMembers = useCallback(async () => {
    if (!wsId) return;
    try { const res = await axios.get(`${API}/workspaces/${wsId}/members`, { withCredentials: true }); setMembers(res.data); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [API, wsId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const fetchInviteLink = async () => {
    try {
      const res = await axios.get(`${API}/workspaces/${wsId}/invite-link`, { withCredentials: true });
      const code = res.data.invite_code;
      setInviteLink(`${window.location.origin}/join?code=${code}`);
    } catch (e) { console.error(e); }
  };

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    try {
      const res = await axios.post(`${API}/workspaces/${wsId}/invite`, { email: inviteEmail, role: inviteRole }, { withCredentials: true });
      toast.success(res.data.message);
      setInviteEmail('');
      fetchMembers();
    } catch (e) { toast.error(e.response?.data?.detail || 'Invite failed'); }
  };

  const updateRole = async (memberId, role) => {
    try { await axios.put(`${API}/workspaces/${wsId}/members/${memberId}/role`, { role }, { withCredentials: true }); fetchMembers(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const removeMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    try { await axios.delete(`${API}/workspaces/${wsId}/members/${memberId}`, { withCredentials: true }); fetchMembers(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const createWorkspace = async () => {
    if (!newWsName.trim()) return;
    try { await axios.post(`${API}/workspaces`, { name: newWsName }, { withCredentials: true }); setShowCreate(false); setNewWsName(''); await checkAuth(); }
    catch (e) { console.error(e); }
  };

  const joinWorkspace = async () => {
    if (!joinCode.trim()) return;
    const code = joinCode.includes('code=') ? joinCode.split('code=')[1] : joinCode;
    try { await axios.post(`${API}/workspaces/join`, { invite_code: code }, { withCredentials: true }); setShowJoin(false); setJoinCode(''); await checkAuth(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed to join'); }
  };

  const migrateData = async () => {
    setMigrating(true);
    try { const res = await axios.post(`${API}/workspaces/${wsId}/migrate-data`, {}, { withCredentials: true }); toast.success(`Migrated data: ${JSON.stringify(res.data.counts)}`); setShowMigrate(false); }
    catch (e) { toast.error('Migration failed'); }
    finally { setMigrating(false); }
  };

  const copyLink = () => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const RoleIcon = ({ role }) => {
    if (role === 'OWNER') return <Crown className="w-3 h-3 text-amber-500" />;
    if (role === 'EDITOR') return <Pencil className="w-3 h-3 text-[#002FA7]" />;
    return <Eye className="w-3 h-3 text-[#A1A1AA]" />;
  };

  return (
    <div data-testid="workspace-page" className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">Team Workspace</h1>
          <p className="text-xs font-mono text-[#A1A1AA] mt-1">{ws?.name || 'Workspace'} · {members.length} members</p>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="join-workspace-btn" onClick={() => setShowJoin(true)} className="flex items-center gap-1.5 border border-[#E4E4E7] hover:border-[#D4D4D8] text-[#171717] text-xs font-mono px-3 py-1.5 transition-colors rounded-sm"><ArrowRight className="w-3.5 h-3.5" /> Join</button>
          <button data-testid="create-workspace-top-btn" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 border border-[#E4E4E7] hover:border-[#D4D4D8] text-[#171717] text-xs font-mono px-3 py-1.5 transition-colors rounded-sm"><Plus className="w-3.5 h-3.5" /> New</button>
          {myRole !== 'VIEWER' && <button data-testid="invite-member-btn" onClick={() => { setShowInvite(true); fetchInviteLink(); }} className="flex items-center gap-1.5 bg-[#002FA7] hover:bg-[#0044FF] text-white text-xs font-mono px-3 py-1.5 transition-colors rounded-sm"><Users className="w-3.5 h-3.5" /> Invite</button>}
        </div>
      </div>

      {/* Migrate data banner */}
      {myRole !== 'VIEWER' && (
        <div className="border border-blue-200 bg-blue-50 p-3 flex items-center justify-between rounded-sm">
          <p className="text-xs font-mono text-[#002FA7]">Have existing data from before workspaces? Migrate it here.</p>
          <button data-testid="migrate-data-btn" onClick={() => setShowMigrate(true)} className="text-xs font-mono text-[#002FA7] hover:text-[#0044FF] underline">Migrate Data</button>
        </div>
      )}

      {/* Members list */}
      <div className="border border-[#E4E4E7] bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-[#E4E4E7] flex items-center justify-between">
          <h3 className="text-sm font-heading font-bold text-[#171717]">Members</h3>
          <span className="text-[10px] font-mono text-[#A1A1AA]">{members.length} members</span>
        </div>
        {loading ? <div className="p-8 text-center text-xs font-mono text-[#A1A1AA]">Loading...</div> : (
          <div className="divide-y divide-[#E4E4E7]">
            {members.map((m, idx) => (
              <div key={m.user_id || idx} data-testid={`member-${idx}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAFAFA] transition-colors">
                {m.picture ? <img src={m.picture} alt="" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 bg-[#E4E4E7] rounded-full flex items-center justify-center text-xs font-mono text-[#71717A]">{(m.name || '?')[0]}</div>}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-[#171717] font-medium">{m.name || 'Unknown'}</p>
                  <p className="text-[10px] font-mono text-[#A1A1AA]">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1"><RoleIcon role={m.role} /><span className="text-[10px] font-mono text-[#71717A]">{m.role}</span></div>
                  {myRole === 'OWNER' && m.user_id !== user?.user_id && (
                    <div className="flex items-center gap-1">
                      <select value={m.role} onChange={e => updateRole(m.user_id, e.target.value)} className="bg-transparent border border-[#E4E4E7] text-[10px] font-mono text-[#71717A] px-1 py-0.5 rounded-sm">
                        <option value="OWNER">Owner</option><option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option>
                      </select>
                      <button onClick={() => removeMember(m.user_id)} className="p-1 text-[#A1A1AA] hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="bg-white border-[#E4E4E7] text-[#171717] max-w-md shadow-lg">
          <DialogHeader><DialogTitle className="font-heading text-lg font-bold">Invite Team Members</DialogTitle><DialogDescription className="text-xs font-mono text-[#A1A1AA]">Add people to {ws?.name}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-[#A1A1AA] mb-1.5 flex items-center gap-1"><Mail className="w-3 h-3" /> Invite by Email</label>
              <div className="flex gap-2">
                <input data-testid="invite-email-input" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" className="flex-1 bg-[#FAFAFA] border border-[#E4E4E7] text-[#171717] text-sm font-mono px-3 py-2 focus:border-[#002FA7] focus:outline-none rounded-sm" />
                <select data-testid="invite-role-select" value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="bg-[#FAFAFA] border border-[#E4E4E7] text-sm font-mono px-2 py-2 rounded-sm">
                  <option value="EDITOR">Editor</option><option value="VIEWER">Viewer</option>
                </select>
              </div>
              <button data-testid="send-invite-btn" onClick={inviteMember} className="mt-2 w-full bg-[#002FA7] hover:bg-[#0044FF] text-white text-sm font-mono py-2 transition-colors rounded-sm">Send Invite</button>
            </div>
            <div className="border-t border-[#E4E4E7] pt-4">
              <label className="text-xs font-mono text-[#A1A1AA] mb-1.5 flex items-center gap-1"><Link2 className="w-3 h-3" /> Shareable Invite Link</label>
              <div className="flex gap-2">
                <input readOnly value={inviteLink} className="flex-1 bg-[#FAFAFA] border border-[#E4E4E7] text-[#171717] text-xs font-mono px-3 py-2 rounded-sm" />
                <button data-testid="copy-invite-link-btn" onClick={copyLink} className="px-3 py-2 border border-[#E4E4E7] hover:border-[#D4D4D8] transition-colors rounded-sm">
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-[#A1A1AA]" />}
                </button>
              </div>
              <p className="text-[10px] font-mono text-[#A1A1AA] mt-1">Anyone with this link can join as Editor</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Workspace Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white border-[#E4E4E7] text-[#171717] max-w-md shadow-lg">
          <DialogHeader><DialogTitle className="font-heading text-lg font-bold">Create Workspace</DialogTitle><DialogDescription className="text-xs font-mono text-[#A1A1AA]">Start a new team workspace</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <input data-testid="new-ws-name-input" value={newWsName} onChange={e => setNewWsName(e.target.value)} placeholder="e.g., Product Team" className="w-full bg-[#FAFAFA] border border-[#E4E4E7] text-[#171717] text-sm font-mono px-3 py-2 focus:border-[#002FA7] focus:outline-none rounded-sm" />
            <button data-testid="confirm-create-ws-btn" onClick={createWorkspace} className="w-full bg-[#002FA7] hover:bg-[#0044FF] text-white text-sm font-mono py-2 transition-colors rounded-sm">Create Workspace</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Workspace Dialog */}
      <Dialog open={showJoin} onOpenChange={setShowJoin}>
        <DialogContent className="bg-white border-[#E4E4E7] text-[#171717] max-w-md shadow-lg">
          <DialogHeader><DialogTitle className="font-heading text-lg font-bold">Join Workspace</DialogTitle><DialogDescription className="text-xs font-mono text-[#A1A1AA]">Paste an invite link or code</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <input data-testid="join-code-input" value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="Paste invite link or code..." className="w-full bg-[#FAFAFA] border border-[#E4E4E7] text-[#171717] text-sm font-mono px-3 py-2 focus:border-[#002FA7] focus:outline-none rounded-sm" />
            <button data-testid="confirm-join-btn" onClick={joinWorkspace} className="w-full bg-[#002FA7] hover:bg-[#0044FF] text-white text-sm font-mono py-2 transition-colors rounded-sm">Join</button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Migrate Dialog */}
      <Dialog open={showMigrate} onOpenChange={setShowMigrate}>
        <DialogContent className="bg-white border-[#E4E4E7] text-[#171717] max-w-md shadow-lg">
          <DialogHeader><DialogTitle className="font-heading text-lg font-bold">Migrate Data</DialogTitle><DialogDescription className="text-xs font-mono text-[#A1A1AA]">Move your existing data into this workspace</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs font-mono text-[#71717A]">This will move all your sources, insights, opportunities, briefs, and tasks that aren't already in a workspace into <strong>{ws?.name}</strong>.</p>
            <button data-testid="confirm-migrate-btn" onClick={migrateData} disabled={migrating} className="w-full bg-[#002FA7] hover:bg-[#0044FF] text-white text-sm font-mono py-2 transition-colors rounded-sm disabled:opacity-50">{migrating ? 'Migrating...' : 'Migrate Now'}</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
