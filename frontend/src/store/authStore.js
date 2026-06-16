import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      originalUser: null,
      originalToken: null,
      setCredentials: (user, token) => set({ user, token }),
      startImpersonating: (user, token, originalUser, originalToken) => set({ user, token, originalUser, originalToken }),
      stopImpersonating: () => set((state) => ({ user: state.originalUser, token: state.originalToken, originalUser: null, originalToken: null })),
      logout: () => set({ user: null, token: null, originalUser: null, originalToken: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
