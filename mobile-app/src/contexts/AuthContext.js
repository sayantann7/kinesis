import React, { createContext, useState, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API = 'https://api.kinesis.sayantan.space/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (token) => {
    try {
      // Set token globally for all subsequent requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`; require('../api/apiClient').default.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user details
      const res = await axios.get(`${API}/auth/me`);
      setUser(res.data);
      return true;
    } catch (e) {
      console.error('Failed to get user:', e);
      return false;
    }
  };

  const logout = () => {
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, API }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
