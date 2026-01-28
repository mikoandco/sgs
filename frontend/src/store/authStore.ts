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
      const res = await api.login(email, password);
      const { token, user } = res.data;
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
      const res = await api.getProfile();
      set({ user: res.data });
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
        const res = await api.getProfile();
        set({ user: res.data, token, isAuthenticated: true });
      } catch {
        api.setToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      }
    }
  },
}));
