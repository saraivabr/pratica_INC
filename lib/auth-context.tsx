"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from './supabase';

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User, sessionId: string) => void;
  logout: () => void;
  track: (eventType: string, page: string, data?: Record<string, any>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'pratica_session_id';
const USER_KEY = 'pratica_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-refresh session before expiry (every 7 days)
  useEffect(() => {
    if (!user || !sessionId) return;

    const REFRESH_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    
    const refreshSession = async () => {
      try {
        console.log('[auth] Auto-refreshing session...');
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(data.user);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            console.log('[auth] Session refreshed successfully');
          }
        } else {
          console.warn('[auth] Failed to refresh session, will retry on next interval');
        }
      } catch (error) {
        console.warn('[auth] Error refreshing session:', error);
      }
    };

    // Refresh immediately on mount (if logged in)
    refreshSession();

    // Schedule periodic refresh
    const intervalId = setInterval(refreshSession, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [user, sessionId]);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Get stored session from localStorage
        const storedSessionId = localStorage.getItem(SESSION_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (!storedSessionId) {
          setIsLoading(false);
          return;
        }

        // Validate session with backend
        const response = await fetch('/api/auth/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sessionId: storedSessionId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.valid && data.user) {
            setUser(data.user);
            setSessionId(storedSessionId);
            // Update stored user with latest data
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            // Cookie já está setado pelo backend (httpOnly, secure)
            // Apenas sincroniza estado local
          } else {
            // Session invalid, clear storage
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(USER_KEY);
          }
        } else {
          // Request failed, try to use stored user as fallback
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
              setSessionId(storedSessionId);
            } catch {
              localStorage.removeItem(SESSION_KEY);
              localStorage.removeItem(USER_KEY);
            }
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // On network error, try to use stored data
        const storedSessionId = localStorage.getItem(SESSION_KEY);
        const storedUser = localStorage.getItem(USER_KEY);
        if (storedSessionId && storedUser) {
          try {
            setUser(JSON.parse(storedUser));
            setSessionId(storedSessionId);
          } catch {
            // Invalid stored data
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = useCallback((userData: User, newSessionId: string) => {
    setUser(userData);
    setSessionId(newSessionId);

    // Persist session in localStorage
    localStorage.setItem(SESSION_KEY, newSessionId);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));

    // Cookie será setado pelo backend (httpOnly, secure)
    // Cliente não precisa mais setar cookie manualmente

    // Track login event (fire-and-forget, don't block login)
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userData.id, eventType: 'login', page: '/login', data: { method: 'whatsapp_otp' } }),
    }).catch((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to track login event:', err);
      }
    });
  }, []);

  const logout = useCallback(() => {
    if (user) {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, eventType: 'logout', page: window.location.pathname, data: {} }),
      }).catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to track logout event:', err);
        }
      });
    }

    setUser(null);
    setSessionId(null);

    // Clear localStorage
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);

    // Cookie será limpo pelo backend via /api/auth/logout
    // Cliente não precisa mais limpar cookie manualmente (httpOnly protege)
  }, [user]);

  const track = useCallback((eventType: string, page: string, data: Record<string, any> = {}) => {
    if (user) {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, eventType, page, data }),
      }).catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Failed to track ${eventType} event:`, err);
        }
      });
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionId,
        isLoading,
        isAuthenticated: !!user && !!sessionId,
        login,
        logout,
        track,
      }}
    >
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

// Hook for tracking page views automatically
export function usePageTracking(pageName: string) {
  const { track, user } = useAuth();

  useEffect(() => {
    if (user) {
      track('page_view', pageName, { timestamp: new Date().toISOString() });
    }
  }, [pageName, track, user]);
}

// Hook for tracking time spent on page
export function useTimeTracking(pageName: string, data: Record<string, any> = {}) {
  const { track, user } = useAuth();
  const startTime = React.useRef(0);

  useEffect(() => {
    if (!user) return;

    startTime.current = Date.now();

    return () => {
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      track('time_spent', pageName, { ...data, seconds: timeSpent });
    };
  }, [pageName, track, user, data]);
}
