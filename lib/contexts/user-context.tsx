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
        // Cookieにも保存してServer Actionからアクセス可能にする
        document.cookie = `current-user-id=${user.userId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      } else {
        // デフォルトユーザーを設定（システム管理者）
        const defaultUser: UserForClient = {
          userId: 'c7508587-9b6e-433d-9a6a-e6ba6af831c6', // 実際のADMIN001のUUID
          userName: 'システム管理者',
          userCode: 'ADMIN001',
          email: 'admin@example.com',
          roleCode: 'ADMIN',
          isActive: true,
          lastLoginAt: null,
          passwordHash: '',
          userKana: 'システムカンリシャ',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setCurrentUserState(defaultUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUser));
        // Cookieにも保存
        document.cookie = `current-user-id=${defaultUser.userId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
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
      // Cookieにも保存してServer Actionからアクセス可能にする
      document.cookie = `current-user-id=${user.userId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
    } else {
      localStorage.removeItem(STORAGE_KEY);
      document.cookie = 'current-user-id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
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