import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(persist((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: (token: string, user: User) => {
    set({
      user,
      token,
      isAuthenticated: true,
    });
  },
  logout: () => {
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },
  setUser: (user) => set({ user, isAuthenticated: true }),
  setToken: (token) => set({ token }),
}), {
  name: 'fiesta-admin-session',
  storage: createJSONStorage(() => sessionStorage),
  partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
}));
