import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API = 'https://api.kinesis.sayantan.space/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  // Fetch user's workspaces
  const refreshWorkspaces = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/workspaces`);
      setWorkspaces(res.data || []);
      // Set first workspace as current if none selected
      if (!currentWorkspace && res.data?.length > 0) {
        setCurrentWorkspace(res.data[0]);
      }
      return res.data;
    } catch (e) {
      console.error('Failed to get workspaces:', e);
      return [];
    }
  }, [currentWorkspace]);

  // Switch to a different workspace
  const switchWorkspace = useCallback(async (workspaceId) => {
    setWorkspaceLoading(true);
    try {
      // Call switch API
      await axios.post(`${API}/workspaces/${workspaceId}/switch`);
      // Update current workspace
      const workspace = workspaces.find(w => w.workspace_id === workspaceId);
      if (workspace) {
        setCurrentWorkspace(workspace);
      }
      return true;
    } catch (e) {
      console.error('Failed to switch workspace:', e);
      return false;
    } finally {
      setWorkspaceLoading(false);
    }
  }, [workspaces]);

  const login = async (token) => {
    try {
      // Set token globally for all subsequent requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        require('../api/apiClient').default.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (e) {
        // apiClient might not exist
      }
      
      // Fetch user details
      const res = await axios.get(`${API}/auth/me`);
      setUser(res.data);
      
      // Fetch workspaces after login
      await refreshWorkspaces();
      
      return true;
    } catch (e) {
      console.error('Failed to get user:', e);
      return false;
    }
  };

  const logout = () => {
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      API,
      workspaces,
      currentWorkspace,
      workspaceLoading,
      switchWorkspace,
      refreshWorkspaces
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
