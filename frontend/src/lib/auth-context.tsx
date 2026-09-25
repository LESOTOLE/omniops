'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { ApiResponseWrapper } from '@/types';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'WAREHOUSE_MANAGER' | 'CASHIER';
  warehouseId?: string | null;
  warehouse?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedUser = Cookies.get('omniops_user');
    const token = Cookies.get('omniops_token');

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        Cookies.remove('omniops_user');
        Cookies.remove('omniops_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<never, ApiResponseWrapper<LoginResponseData>>('/auth/login', {
      email,
      password,
    });
    const { accessToken, user: loggedUser } = response.data;

    Cookies.set('omniops_token', accessToken, { expires: 1 });
    Cookies.set('omniops_user', JSON.stringify(loggedUser), { expires: 1 });

    setUser(loggedUser);

    if (loggedUser.role === 'CASHIER') {
      router.push('/pos');
    } else {
      router.push('/dashboard');
    }
  };

  const logout = () => {
    Cookies.remove('omniops_token');
    Cookies.remove('omniops_user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
