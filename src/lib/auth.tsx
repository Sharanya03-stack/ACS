"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Role = 'ACS_ADMIN' | 'OEM' | 'DEALER' | 'PARTNER' | 'TECHNICIAN';

export interface User {
  id: string;
  name: string;
  role: Role;
  roleId: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const MOCK_USERS: Record<string, User> = {
  admin001: { id: 'admin001', name: 'System Admin', role: 'ACS_ADMIN', roleId: 'admin001' },
  oem001: { id: 'oem001', name: 'OEM Representative', role: 'OEM', roleId: 'oem001' },
  dealer001: { id: 'dealer001', name: 'Dealership Manager', role: 'DEALER', roleId: 'dealer001' },
  partner001: { id: 'partner001', name: 'Installation Partner', role: 'PARTNER', roleId: 'partner001' },
  tech001: { id: 'tech001', name: 'Field Technician', role: 'TECHNICIAN', roleId: 'tech001' },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage on mount
    const storedUser = localStorage.getItem('acs_auth_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('acs_auth_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('acs_auth_user');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('acs_auth_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
