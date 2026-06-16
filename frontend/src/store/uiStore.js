import { create } from 'zustand';

export const useUIStore = create((set) => ({
  toast: null,
  showToast: (message, type = 'success', action = null) => {
    set({ toast: { message, type, action } });
    
    // Check if action object contains a custom duration
    let duration = action?.duration !== undefined ? action.duration : (action ? 5000 : 2000);
    
    if (duration > 0) {
      setTimeout(() => {
        set((state) => {
          if (state.toast && state.toast.message === message) {
            return { toast: null };
          }
          return state;
        });
      }, duration);
    }
  },
  hideToast: () => set({ toast: null })
}));
