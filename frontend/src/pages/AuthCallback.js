import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

export default function AuthCallback() {
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const { setUser, API, checkAuth } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    // Check for session token in URL query params (from Google OAuth callback)
    const sessionToken = searchParams.get('session');
    
    if (sessionToken) {
      // New OAuth flow - session token from backend redirect
      (async () => {
        try {
          const res = await axios.post(`${API}/auth/session`, { session_token: sessionToken }, { withCredentials: true });
          setUser(res.data);
          navigate('/dashboard', { replace: true, state: { user: res.data } });
        } catch (err) {
          console.error('Auth callback error:', err);
          navigate('/login');
        }
      })();
      return;
    }

    // Fallback: check if already authenticated
    (async () => {
      try {
        await checkAuth();
        navigate('/dashboard', { replace: true });
      } catch (err) {
        navigate('/login');
      }
    })();
  }, [navigate, setUser, API, searchParams, checkAuth]);

  return null;
}
