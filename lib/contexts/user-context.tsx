'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UserForClient } from '@/types/unified';

interface UserContextType {
  currentUser: UserForClient | null;
  setCurrentUser: (user: UserForClient | null) => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'biz-clone-current-user';

interface UserContextProviderProps {
  children: ReactNode;
}

export function UserContextProvider({ children }: UserContextProviderProps) {
  const [currentUser, setCurrentUserState] = useState<UserForClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ローカルストレージからユーザー情報を復元
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY);
      if (storedUser) {
        const user = JSON.parse(storedUser) as UserForClient;
        setCurrentUserState(user);
      } else {
        // デフォルトユーザーを設定（システム管理者）
        const defaultUser: UserForClient = {
          userId: 'default-admin',
          userName: 'システム管理者',
          userCode: 'ADMIN',
          email: 'admin@system.local',
          roleCode: 'ADMIN',
          isActive: true,
          lastLoginAt: null,
          passwordHash: '',
          userKana: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setCurrentUserState(defaultUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUser));
      }
    } catch (error) {
      console.error('ユーザー情報の復元に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setCurrentUser = (user: UserForClient | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const value: UserContextType = {
    currentUser,
    setCurrentUser,
    isLoading
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserContextProvider');
  }
  return context;
}