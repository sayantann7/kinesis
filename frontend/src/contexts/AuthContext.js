import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for session token in URL (from OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionToken = urlParams.get('session');
    
    if (sessionToken) {
      // Process the session token to set the cookie
      axios.post(`${API}/auth/session`, { session_token: sessionToken }, { withCredentials: true })
        .then(() => {
          // Clear the URL params and check auth
          window.history.replaceState({}, '', window.location.pathname);
          checkAuth();
        })
        .catch((err) => {
          console.error('Failed to process session:', err);
          window.history.replaceState({}, '', window.location.pathname);
          setLoading(false);
        });
      return;
    }
    
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try { await axios.post(`${API}/auth/logout`, {}, { withCredentials: true }); } catch {}
    setUser(null);
  };

  const switchWorkspace = async (wsId) => {
    try {
      await axios.post(`${API}/workspaces/${wsId}/switch`, {}, { withCredentials: true });
      await checkAuth();
    } catch (e) { console.error(e); }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, checkAuth, switchWorkspace, API }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export { API };
