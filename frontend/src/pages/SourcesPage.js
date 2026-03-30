import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Plus, Upload, Trash2, RefreshCw, Database, FileText, Mic, Hash, ChevronDown, ChevronRight, MessageSquare, Users, Clock, ExternalLink, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';

export default function SourcesPage() {
  const { API } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(null);
  const [showAddText, setShowAddText] = useState(null);
  const [showSlack, setShowSlack] = useState(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('UPLOAD');
  const [processing, setProcessing] = useState({});
  const [uploading, setUploading] = useState(false);
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [slackStatus, setSlackStatus] = useState(null);
  const [slackChannels, setSlackChannels] = useState([]);
  const [slackLoading, setSlackLoading] = useState(false);
  const [importingChannel, setImportingChannel] = useState(null);
  const [slackExpanded, setSlackExpanded] = useState(false);
  const [slackMessages, setSlackMessages] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchSources = useCallback(async () => {
    try { const res = await axios.get(`${API}/sources`, { withCredentials: true }); setSources(res.data); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [API]);

  const fetchSlackStatus = useCallback(async () => {
    try { const res = await axios.get(`${API}/slack/status`, { withCredentials: true }); setSlackStatus(res.data); } catch (e) { console.error(e); }
  }, [API]);

  // Handle Slack callback redirect
  useEffect(() => {
    const slackConnected = searchParams.get('slack_connected');
    const slackTeam = searchParams.get('slack_team');
    const slackError = searchParams.get('slack_error');
    
    if (slackConnected === 'true') {
      toast.success(`Connected to Slack workspace: ${slackTeam || 'Success'}`);
      fetchSlackStatus();
      setSearchParams({});
    } else if (slackError) {
      toast.error(`Slack connection failed: ${slackError}`);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, fetchSlackStatus]);

  useEffect(() => { fetchSources(); fetchSlackStatus(); }, [fetchSources, fetchSlackStatus]);

  const createSource = async () => {
    if (!newName.trim()) return;
    try { await axios.post(`${API}/sources`, { name: newName, type: newType }, { withCredentials: true }); setShowCreate(false); setNewName(''); fetchSources(); } catch (e) { console.error(e); }
  };

  const deleteSource = async (id) => {
    if (!window.confirm('Delete this source and all its items?')) return;
    try { await axios.delete(`${API}/sources/${id}`, { withCredentials: true }); fetchSources(); } catch (e) { console.error(e); }
  };

  const processSource = async (id) => {
    setProcessing(p => ({ ...p, [id]: true }));
    try { const res = await axios.post(`${API}/sources/${id}/process`, {}, { withCredentials: true }); toast.success(`Processed ${res.data.processed} items`); fetchSources(); } catch (e) { console.error(e); }
    finally { setProcessing(p => ({ ...p, [id]: false })); }
  };

  const handleFileUpload = async (sourceId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await axios.post(`${API}/upload`, formData, { withCredentials: true });
      const isAudio = uploadRes.data.is_audio;
      const transcript = uploadRes.data.transcript;
      const text = isAudio ? (transcript || `[Audio file: ${file.name}]`) : (file.type.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.txt') ? await file.text() : `[Uploaded file: ${file.name}]`);
      await axios.post(`${API}/sources/${sourceId}/items`, { title: file.name, raw_text: text, transcript: isAudio ? transcript : text, metadata: { filename: file.name, content_type: file.type, size: file.size, file_id: uploadRes.data.file_id, is_audio: isAudio } }, { withCredentials: true });
      setShowUpload(null);
      if (isAudio && transcript) toast.success(`Audio transcribed successfully! (${transcript.length} chars)`);
      fetchSources();
    } catch (e) { console.error(e); toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  const addTextItem = async (sourceId) => {
    if (!textContent.trim()) return;
    try { await axios.post(`${API}/sources/${sourceId}/items`, { title: textTitle || 'Manual entry', raw_text: textContent }, { withCredentials: true }); setShowAddText(null); setTextTitle(''); setTextContent(''); fetchSources(); } catch (e) { console.error(e); }
  };

  const openSlackImport = async (sourceId) => {
    setShowSlack(sourceId);
    if (slackStatus?.connected) {
      setSlackLoading(true);
      try { const res = await axios.get(`${API}/slack/channels`, { withCredentials: true }); setSlackChannels(res.data); } catch (e) { console.error(e); }
      finally { setSlackLoading(false); }
    }
  };

  const importSlackChannel = async (sourceId, channelId) => {
    setImportingChannel(channelId);
    try { const res = await axios.post(`${API}/slack/import-channel`, { channel_id: channelId, source_id: sourceId }, { withCredentials: true }); toast.success(`Imported ${res.data.imported} messages`); setShowSlack(null); fetchSources(); } catch (e) { console.error(e); if (e.response?.data?.detail?.includes('not_in_channel')) { toast.error('Bot not in channel. Please mention or /invite @Kinesis in the Slack channel, or re-authenticate Slack to auto-join.', { duration: 5000 }); } else { toast.error('Import failed'); } }
    finally { setImportingChannel(null); }
  };

  const connectSlack = async () => {
    try { 
      const res = await axios.get(`${API}/slack/auth-url`, { withCredentials: true }); 
      // Use redirect instead of popup for proper OAuth callback
      window.location.href = res.data.url;
    } catch (e) { console.error(e); }
  };

  const disconnectSlack = async () => {
    if (!window.confirm('Disconnect Slack? This will remove the integration.')) return;
    try {
      await axios.delete(`${API}/slack/disconnect`, { withCredentials: true });
      setSlackStatus(null);
      setSlackChannels([]);
      setSlackExpanded(false);
    } catch (e) { console.error(e); }
  };

  const loadSlackChannels = async () => {
    if (slackChannels.length > 0) {
      setSlackExpanded(!slackExpanded);
      return;
    }
    setSlackLoading(true);
    try {
      const res = await axios.get(`${API}/slack/channels`, { withCredentials: true });
      setSlackChannels(res.data);
      setSlackExpanded(true);
    } catch (e) { 
      console.error(e); 
      // If channels fail, connection might be stale - reset status
      if (e.response?.status === 400) {
        setSlackStatus({ connected: false });
        toast.error('Slack connection expired. Please reconnect.');
      }
    }
    finally { setSlackLoading(false); }
  };

  const previewChannel = async (channel) => {
    setSelectedChannel(channel);
    setLoadingMessages(true);
    try {
      const res = await axios.get(`${API}/slack/channel-messages?channel_id=${channel.id}&limit=20`, { withCredentials: true });
      setSlackMessages(res.data.messages || []);
    } catch (e) { 
      console.error(e);
      if (e.response?.data?.detail?.includes('not_in_channel')) {
        alert('Bot is not in this channel. Please invite @Kinesis to the channel in Slack first, or add the channels:join scope to your Slack app.');
      }
      setSlackMessages([]);
    }
    finally { setLoadingMessages(false); }
  };

  const quickImportChannel = async (channelId) => {
    // Create a new source and import in one go
    setImportingChannel(channelId);
    try {
      // First create a source
      const channel = slackChannels.find(c => c.id === channelId);
      const sourceRes = await axios.post(`${API}/sources`, { 
        name: `Slack #${channel?.name || 'channel'}`, 
        type: 'SLACK' 
      }, { withCredentials: true });
      
      // Then import messages
      const importRes = await axios.post(`${API}/slack/import-channel`, { 
        channel_id: channelId, 
        source_id: sourceRes.data.source_id 
      }, { withCredentials: true });
      
      toast.success(`Created source and imported ${importRes.data.imported} messages!`);
      fetchSources();
    } catch (e) { 
      console.error(e); 
      if (e.response?.data?.detail?.includes('not_in_channel')) {
        toast.error('Bot not in channel. Please mention or /invite @Kinesis in the Slack channel, or re-authenticate Slack to auto-join.', { duration: 5000 });
      } else {
        toast.error('Import failed');
      }
    }
    finally { setImportingChannel(null); }
  };

  const sourceTypes = ['UPLOAD', 'SLACK'];

  return (
    <div data-testid="sources-page" className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#171717]">Feedback & Data</h1>
          <p className="text-xs font-mono text-[#A1A1AA] mt-1">Upload your project documentation, meeting transcripts, and Slack messages</p>
        </div>
        <button data-testid="create-source-btn" onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-[#002FA7] hover:bg-[#0044FF] text-white text-xs font-mono px-3 py-2 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Create Folder
        </button>
      </div>

      {/* Slack Integration Panel */}
      <div className="border border-[#E4E4E7] bg-white shadow-sm overflow-hidden">
        <div 
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#FAFAFA] transition-colors"
          onClick={() => slackStatus?.connected && loadSlackChannels()}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4A154B] flex items-center justify-center rounded-sm">
              <Hash className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-mono text-[#171717] font-medium">Slack Integration</p>
              <p className="text-xs font-mono text-[#A1A1AA]">
                {slackStatus?.connected 
                  ? `Connected to ${slackStatus.team_name} · Click to browse channels` 
                  : 'Import conversations from your Slack workspace'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {slackStatus?.connected ? (
              <>
                <span className="text-[10px] font-mono px-2 py-1 bg-green-50 text-green-600 border border-green-200 rounded-sm">Connected</span>
                {slackLoading ? (
                  <RefreshCw className="w-4 h-4 text-[#A1A1AA] animate-spin" />
                ) : (
                  slackExpanded ? <ChevronDown className="w-4 h-4 text-[#A1A1AA]" /> : <ChevronRight className="w-4 h-4 text-[#A1A1AA]" />
                )}
              </>
            ) : (
              <button 
                data-testid="connect-slack-btn" 
                onClick={(e) => { e.stopPropagation(); connectSlack(); }} 
                className="text-xs font-mono px-4 py-2 bg-[#4A154B] text-white hover:bg-[#611f69] transition-colors rounded-sm"
              >
                Connect Slack
              </button>
            )}
          </div>
        </div>

        {/* Expanded Channels Panel */}
        {slackStatus?.connected && slackExpanded && (
          <div className="border-t border-[#E4E4E7]">
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#E4E4E7]">
              {/* Channels List */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-mono text-[#A1A1AA] font-medium uppercase tracking-wider">Channels ({slackChannels.length})</p>
                  <button 
                    onClick={disconnectSlack} 
                    className="text-[10px] font-mono text-red-500 hover:text-red-600 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Disconnect
                  </button>
                </div>
                <div className="space-y-1 max-h-72 overflow-auto">
                  {slackChannels.map(ch => (
                    <div 
                      key={ch.id} 
                      className={`flex items-center gap-3 p-2.5 rounded-sm cursor-pointer transition-colors ${
                        selectedChannel?.id === ch.id 
                          ? 'bg-[#4A154B]/10 border border-[#4A154B]/30' 
                          : 'hover:bg-[#FAFAFA] border border-transparent'
                      }`}
                      onClick={() => previewChannel(ch)}
                    >
                      <Hash className="w-4 h-4 text-[#4A154B] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-[#171717] font-medium">#{ch.name}</p>
                        {ch.purpose && <p className="text-[10px] font-mono text-[#A1A1AA] truncate">{ch.purpose}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#A1A1AA] flex items-center gap-1">
                          <Users className="w-3 h-3" /> {ch.num_members}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); quickImportChannel(ch.id); }}
                          disabled={importingChannel === ch.id}
                          className="text-[10px] font-mono px-2 py-1 bg-[#4A154B] text-white hover:bg-[#611f69] transition-colors rounded-sm disabled:opacity-50"
                        >
                          {importingChannel === ch.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Import'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {slackChannels.length === 0 && (
                    <p className="text-xs font-mono text-[#A1A1AA] text-center py-8">No channels found</p>
                  )}
                </div>
              </div>

              {/* Message Preview */}
              <div className="p-4 bg-[#FAFAFA]">
                <p className="text-xs font-mono text-[#A1A1AA] font-medium uppercase tracking-wider mb-3">
                  {selectedChannel ? `#${selectedChannel.name} Preview` : 'Select a channel to preview'}
                </p>
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-5 h-5 text-[#A1A1AA] animate-spin" />
                  </div>
                ) : selectedChannel ? (
                  <div className="space-y-2 max-h-72 overflow-auto">
                    {slackMessages.length > 0 ? slackMessages.map((msg, idx) => (
                      <div key={idx} className="bg-white p-3 border border-[#E4E4E7] rounded-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 bg-[#4A154B]/20 rounded-full flex items-center justify-center">
                            <span className="text-[8px] font-mono text-[#4A154B]">
                              {msg.user?.substring(0, 2).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[#A1A1AA] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {msg.ts ? new Date(parseFloat(msg.ts) * 1000).toLocaleString() : 'Unknown'}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-[#171717] line-clamp-3">{msg.text}</p>
                      </div>
                    )) : (
                      <p className="text-xs font-mono text-[#A1A1AA] text-center py-8">No messages in this channel</p>
                    )}
                    {slackMessages.length > 0 && (
                      <p className="text-[10px] font-mono text-[#A1A1AA] text-center pt-2">
                        Showing latest {slackMessages.length} messages
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="w-8 h-8 text-[#E4E4E7] mb-2" />
                    <p className="text-xs font-mono text-[#A1A1AA]">Click a channel to preview messages</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white border border-[#E4E4E7] animate-pulse" />)}</div>
      ) : sources.length === 0 ? (
        <div className="border border-[#E4E4E7] bg-white p-12 text-center shadow-sm">
          <Database className="w-10 h-10 text-[#E4E4E7] mx-auto mb-3" />
          <p className="text-sm font-mono text-[#A1A1AA]">No folders created yet</p>
          <button data-testid="empty-create-source-btn" onClick={() => setShowCreate(true)} className="mt-4 text-xs font-mono text-[#002FA7] hover:text-[#0044FF] transition-colors">Create your first folder</button>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((src, idx) => (
            <div key={src.source_id} data-testid={`source-item-${idx}`} className="border border-[#E4E4E7] bg-white hover:border-[#D4D4D8] transition-colors shadow-sm animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="w-8 h-8 bg-[#002FA7]/10 flex items-center justify-center flex-shrink-0 rounded-sm"><Database className="w-4 h-4 text-[#002FA7]" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-mono text-[#171717] font-medium truncate">{src.name}</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 border border-[#E4E4E7] text-[#A1A1AA] bg-[#FAFAFA] rounded-sm">{src.type}</span>
                  </div>
                  <p className="text-[10px] font-mono text-[#A1A1AA] mt-0.5">{src.item_count || 0} items {src.last_sync ? `· Last sync: ${new Date(src.last_sync).toLocaleDateString()}` : ''}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button data-testid={`upload-file-btn-${idx}`} onClick={() => setShowUpload(src.source_id)} className="p-1.5 text-[#A1A1AA] hover:text-[#171717] border border-[#E4E4E7] hover:border-[#D4D4D8] transition-colors rounded-sm" title="Upload Files or Audio"><Upload className="w-3.5 h-3.5" /></button>
                  <button data-testid={`add-text-btn-${idx}`} onClick={() => setShowAddText(src.source_id)} className="p-1.5 text-[#A1A1AA] hover:text-[#171717] border border-[#E4E4E7] hover:border-[#D4D4D8] transition-colors rounded-sm" title="Paste Raw Text"><FileText className="w-3.5 h-3.5" /></button>
                  {slackStatus?.connected && <button data-testid={`import-slack-btn-${idx}`} onClick={() => openSlackImport(src.source_id)} className="p-1.5 text-[#A1A1AA] hover:text-[#4A154B] border border-[#E4E4E7] hover:border-[#4A154B]/30 transition-colors rounded-sm" title="Import from Slack"><Hash className="w-3.5 h-3.5" /></button>}
                  <button data-testid={`process-source-btn-${idx}`} onClick={() => processSource(src.source_id)} disabled={processing[src.source_id]} className="p-1.5 text-[#A1A1AA] hover:text-[#002FA7] border border-[#E4E4E7] hover:border-[#002FA7]/30 transition-colors rounded-sm disabled:opacity-50" title="Extract Key Findings"><RefreshCw className={`w-3.5 h-3.5 ${processing[src.source_id] ? 'animate-spin' : ''}`} /></button>
                  <button data-testid={`delete-source-btn-${idx}`} onClick={() => deleteSource(src.source_id)} className="p-1.5 text-[#A1A1AA] hover:text-red-500 border border-[#E4E4E7] hover:border-red-200 transition-colors rounded-sm" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white border-[#E4E4E7] text-[#171717] max-w-md shadow-lg">
          <DialogHeader><DialogTitle className="font-heading text-lg font-bold">Create New Folder</DialogTitle><DialogDescription className="text-xs font-mono text-[#A1A1AA]">Create a folder to group your related documents and feedback</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-xs font-mono text-[#A1A1AA] block mb-1.5">Source Name</label><input data-testid="source-name-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Customer Interviews Q1" className="w-full bg-[#FAFAFA] border border-[#E4E4E7] text-[#171717] text-sm font-mono px-3 py-2 focus:border-[#002FA7] focus:outline-none focus:ring-1 focus:ring-[#002FA7] rounded-sm" /></div>
            <div><label className="text-xs font-mono text-[#A1A1AA] block mb-1.5">What kind of data will this folder hold?</label><select data-testid="source-type-select" value={newType} onChange={e => setNewType(e.target.value)} className="w-full bg-[#FAFAFA] border border-[#E4E4E7] text-[#171717] text-sm font-mono px-3 py-2 focus:border-[#002FA7] focus:outline-none rounded-sm"><option value="UPLOAD">File Uploads & Raw Text</option><option value="SLACK">Slack Connect Imports</option></select></div>
            <button data-testid="confirm-create-source-btn" onClick={createSource} className="w-full bg-[#002FA7] hover:bg-[#0044FF] text-white text-sm font-mono py-2 transition-colors rounded-sm">Create Folder</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showUpload} onOpenChange={() => setShowUpload(null)}>
        <DialogContent className="bg-white border-[#E4E4E7] text-[#171717] max-w-md shadow-lg">
          <DialogHeader><DialogTitle className="font-heading text-lg font-bold">Upload File</DialogTitle><DialogDescription className="text-xs font-mono text-[#A1A1AA]">Upload text, audio, or document files</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-3 text-[10px] font-mono text-[#A1A1AA]">
              <div className="flex items-center gap-1"><FileText className="w-3 h-3" /> .txt, .csv, .pdf, .md</div>
              <div className="flex items-center gap-1"><Mic className="w-3 h-3 text-[#002FA7]" /> .mp3, .wav, .m4a (auto-transcribed)</div>
            </div>
            <label className="block border border-dashed border-[#D4D4D8] hover:border-[#002FA7] p-8 text-center cursor-pointer transition-colors bg-[#FAFAFA] rounded-sm">
              <Upload className="w-8 h-8 text-[#D4D4D8] mx-auto mb-2" />
              <span className="text-xs font-mono text-[#A1A1AA]">{uploading ? 'Uploading & transcribing...' : 'Click to select file'}</span>
              <input data-testid="file-upload-input" type="file" className="hidden" onChange={(e) => handleFileUpload(showUpload, e)} disabled={uploading} accept=".txt,.csv,.pdf,.md,.json,.doc,.docx,.mp3,.wav,.m4a,.mp4,.webm,.ogg" />
            </label>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showAddText} onOpenChange={() => setShowAddText(null)}>
        <DialogContent className="bg-white border-[#E4E4E7] text-[#171717] max-w-lg shadow-lg">
          <DialogHeader><DialogTitle className="font-heading text-lg font-bold">Add Text Content</DialogTitle><DialogDescription className="text-xs font-mono text-[#A1A1AA]">Paste transcript or feedback directly</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-xs font-mono text-[#A1A1AA] block mb-1.5">Title</label><input data-testid="text-title-input" value={textTitle} onChange={e => setTextTitle(e.target.value)} placeholder="e.g., Customer Call - John Doe" className="w-full bg-[#FAFAFA] border border-[#E4E4E7] text-[#171717] text-sm font-mono px-3 py-2 focus:border-[#002FA7] focus:outline-none focus:ring-1 focus:ring-[#002FA7] rounded-sm" /></div>
            <div><label className="text-xs font-mono text-[#A1A1AA] block mb-1.5">Content</label><textarea data-testid="text-content-input" value={textContent} onChange={e => setTextContent(e.target.value)} placeholder="Paste transcript, feedback, or notes here..." rows={8} className="w-full bg-[#FAFAFA] border border-[#E4E4E7] text-[#171717] text-sm font-mono px-3 py-2 focus:border-[#002FA7] focus:outline-none resize-none rounded-sm" /></div>
            <button data-testid="confirm-add-text-btn" onClick={() => addTextItem(showAddText)} className="w-full bg-[#002FA7] hover:bg-[#0044FF] text-white text-sm font-mono py-2 transition-colors rounded-sm">Add Item</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showSlack} onOpenChange={() => setShowSlack(null)}>
        <DialogContent className="bg-white border-[#E4E4E7] text-[#171717] max-w-md shadow-lg">
          <DialogHeader><DialogTitle className="font-heading text-lg font-bold">Import from Slack</DialogTitle><DialogDescription className="text-xs font-mono text-[#A1A1AA]">Select a channel to import messages from</DialogDescription></DialogHeader>
          {slackLoading ? <div className="py-8 text-center"><RefreshCw className="w-5 h-5 text-[#A1A1AA] animate-spin mx-auto" /></div> : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {slackChannels.map(ch => (
                <button key={ch.id} data-testid={`slack-channel-${ch.name}`} onClick={() => importSlackChannel(showSlack, ch.id)} disabled={importingChannel === ch.id} className="w-full flex items-center gap-3 p-3 border border-[#E4E4E7] hover:border-[#D4D4D8] hover:bg-[#FAFAFA] transition-colors text-left rounded-sm disabled:opacity-50">
                  <Hash className="w-4 h-4 text-[#A1A1AA] flex-shrink-0" />
                  <div className="flex-1 min-w-0"><p className="text-xs font-mono text-[#171717] font-medium">#{ch.name}</p>{ch.purpose && <p className="text-[10px] font-mono text-[#A1A1AA] truncate">{ch.purpose}</p>}</div>
                  <span className="text-[10px] font-mono text-[#A1A1AA]">{ch.num_members} members</span>
                </button>
              ))}
              {slackChannels.length === 0 && <p className="text-xs font-mono text-[#A1A1AA] text-center py-4">No channels found</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
