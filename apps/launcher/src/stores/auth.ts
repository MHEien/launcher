import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

interface User {
  id: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setupAuthListener: () => Promise<() => void>;
}

interface TauriAuthState {
  is_authenticated: boolean;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    avatar: string | null;
  } | null;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const authState = await invoke<TauriAuthState>("get_auth_state");
      set({
        isAuthenticated: authState.is_authenticated,
        user: authState.user,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to initialize auth:", error);
      set({ isLoading: false, error: String(error) });
    }
  },

  login: async () => {
    set({ isLoading: true, error: null });
    try {
      await invoke("open_login");
      // The actual auth completion happens via deep link callback
      // which triggers the auth-callback event
    } catch (error) {
      console.error("Failed to open login:", error);
      set({ isLoading: false, error: String(error) });
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      const authState = await invoke<TauriAuthState>("logout");
      set({
        isAuthenticated: authState.is_authenticated,
        user: authState.user,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to logout:", error);
      set({ isLoading: false, error: String(error) });
    }
  },

  setupAuthListener: async () => {
    // Listen for auth callback from deep link
    const unlisten = await listen<string>("auth-callback", async (event) => {
      const token = event.payload;
      console.log("Received auth callback with token");
      
      set({ isLoading: true, error: null });
      try {
        const authState = await invoke<TauriAuthState>("handle_auth_callback", { token });
        set({
          isAuthenticated: authState.is_authenticated,
          user: authState.user,
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to handle auth callback:", error);
        set({ isLoading: false, error: String(error) });
      }
    });

    return unlisten;
  },
}));
