import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Users, Loader2 } from 'lucide-react';

export default function JoinPage() {
  const [searchParams] = useSearchParams();
  const { user, API, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [wsName, setWsName] = useState('');
  const code = searchParams.get('code');

  const handleLogin = async () => {
    // Get the OAuth URL from our backend
    const redirectUri = window.location.origin + '/api/auth/google/callback';
    try {
      const response = await fetch(`/api/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`);
      const data = await response.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Failed to initiate login:', error);
    }
  };

  useEffect(() => {
    if (!user || !code) { setStatus('error'); return; }
    (async () => {
      try {
        const res = await axios.post(`${API}/workspaces/join`, { invite_code: code }, { withCredentials: true });
        setWsName(res.data.workspace?.name || 'Workspace');
        setStatus('success');
        await checkAuth();
        setTimeout(() => navigate('/dashboard'), 2000);
      } catch (e) {
        const detail = e.response?.data?.detail || '';
        if (detail.includes('Already a member')) { setStatus('already'); setTimeout(() => navigate('/dashboard'), 1500); }
        else setStatus('error');
      }
    })();
  }, [user, code, API, navigate, checkAuth]);

  if (!user) return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <div className="text-center"><Users className="w-12 h-12 text-[#E4E4E7] mx-auto mb-4" /><p className="text-sm font-mono text-[#A1A1AA]">Please sign in first to join a workspace</p>
        <button onClick={handleLogin} className="mt-4 bg-[#002FA7] text-white px-4 py-2 text-sm font-mono">Sign In</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && <><Loader2 className="w-8 h-8 text-[#002FA7] animate-spin mx-auto mb-4" /><p className="text-sm font-mono text-[#A1A1AA]">Joining workspace...</p></>}
        {status === 'success' && <><Users className="w-12 h-12 text-green-600 mx-auto mb-4" /><h2 className="font-heading text-xl font-bold text-[#171717] mb-2">Joined {wsName}!</h2><p className="text-sm font-mono text-[#A1A1AA]">Redirecting to dashboard...</p></>}
        {status === 'already' && <><Users className="w-12 h-12 text-[#002FA7] mx-auto mb-4" /><p className="text-sm font-mono text-[#A1A1AA]">You're already a member. Redirecting...</p></>}
        {status === 'error' && <><Users className="w-12 h-12 text-red-400 mx-auto mb-4" /><h2 className="font-heading text-xl font-bold text-[#171717] mb-2">Invalid Invite</h2><p className="text-sm font-mono text-[#A1A1AA]">This invite link is invalid or expired</p></>}
      </div>
    </div>
  );
}
