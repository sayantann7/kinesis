import React from 'react';
import { Database, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const handleLogin = async () => {
    // Get the OAuth URL from our backend
    // Redirect URI should point to backend, which will then redirect to frontend
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
    const redirectUri = backendUrl + '/api/auth/google/callback';
    try {
      const response = await fetch(`/api/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`);
      const data = await response.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (error) {
      console.error('Failed to initiate login:', error);
      // Fallback: construct OAuth URL directly
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      if (clientId) {
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&access_type=offline`;
        window.location.href = authUrl;
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center relative overflow-hidden">
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="border border-[#E4E4E7] bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#002FA7] flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold tracking-tight text-[#171717]">Kinesis</h1>
              <p className="text-xs font-mono text-[#71717A] tracking-[0.15em] uppercase">AI Product Discovery</p>
            </div>
          </div>
          <div className="border-t border-[#E4E4E7] pt-6 mb-6">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#171717] mb-2">Sign in</h2>
            <p className="text-sm font-mono text-[#71717A] leading-relaxed">Transform customer feedback into executable specs for coding agents.</p>
          </div>
          <button data-testid="google-login-btn" onClick={handleLogin} className="w-full flex items-center justify-center gap-3 bg-[#171717] text-white font-mono text-sm font-medium py-3 px-4 hover:bg-[#333] transition-colors duration-100">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>
          <div className="mt-6 pt-4 border-t border-[#E4E4E7]">
            <p className="text-xs font-mono text-[#A1A1AA] text-center">From raw feedback to executable specs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
