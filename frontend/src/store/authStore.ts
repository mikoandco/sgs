import { create } from 'zustand';
import type { User } from '../types';
import api from '../services/api';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadProfile: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem('sgs_token'),
  isAuthenticated: !!localStorage.getItem('sgs_token'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.login(email, password) as unknown as { token: string; user: User };
      const { token, user } = res;
      api.setToken(token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    api.setToken(null);
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadProfile: async () => {
    try {
      const res = await api.getProfile() as unknown as { user: User };
      set({ user: res.user });
    } catch {
      api.setToken(null);
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  initialize: async () => {
    const token = localStorage.getItem('sgs_token');
    if (token) {
      api.setToken(token);
      try {
        const res = await api.getProfile() as unknown as { user: User };
        set({ user: res.user, token, isAuthenticated: true });
      } catch {
        api.setToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      }
    }
  },
}));
