import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { SearchResult, SystemTheme, IndexingStatus, Command } from "@/types";

interface LauncherState {
  query: string;
  results: SearchResult[];
  matchingCommands: Command[];
  matchedCommand: Command | null; // Command that matches the current trigger (e.g., "codex:")
  selectedIndex: number;
  isLoading: boolean;
  theme: SystemTheme | null;
  indexingStatus: IndexingStatus | null;

  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  checkCommandTrigger: (query: string) => Promise<void>;
  setSelectedIndex: (index: number) => void;
  moveSelection: (direction: "up" | "down") => void;
  executeSelected: () => Promise<void>;
  hideWindow: () => Promise<void>;
  loadTheme: () => Promise<void>;
  setupIndexingListener: () => Promise<void>;
  reset: () => void;
}

export const useLauncherStore = create<LauncherState>((set, get) => ({
  query: "",
  results: [],
  matchingCommands: [],
  matchedCommand: null,
  selectedIndex: 0,
  isLoading: false,
  theme: null,
  indexingStatus: null,

  setQuery: (query) => {
    set({ query });
    get().search(query);
    get().checkCommandTrigger(query);
  },

  checkCommandTrigger: async (query) => {
    if (!query.includes(":")) {
      set({ matchedCommand: null, matchingCommands: [] });
      return;
    }

    try {
      // Check if we have an exact command trigger match
      const matchedCommand = await invoke<Command | null>("match_command_trigger", { query });
      
      // Also search for matching commands for suggestions
      const beforeColon = query.split(":")[0];
      const matchingCommands = await invoke<Command[]>("search_commands", { query: beforeColon });
      
      set({ matchedCommand, matchingCommands: matchingCommands.slice(0, 5) });
    } catch (error) {
      console.error("Command trigger check error:", error);
      set({ matchedCommand: null, matchingCommands: [] });
    }
  },

  search: async (query) => {
    if (!query.trim()) {
      set({ results: [], selectedIndex: 0, matchingCommands: [], matchedCommand: null });
      return;
    }

    set({ isLoading: true });
    try {
      const results = await invoke<SearchResult[]>("search", { query });
      set({ results, selectedIndex: 0, isLoading: false });
    } catch (error) {
      console.error("Search error:", error);
      set({ results: [], isLoading: false });
    }
  },

  setSelectedIndex: (index) => set({ selectedIndex: index }),

  moveSelection: (direction) => {
    const { results, selectedIndex } = get();
    if (results.length === 0) return;

    let newIndex: number;
    if (direction === "up") {
      newIndex = selectedIndex <= 0 ? results.length - 1 : selectedIndex - 1;
    } else {
      newIndex = selectedIndex >= results.length - 1 ? 0 : selectedIndex + 1;
    }
    set({ selectedIndex: newIndex });
  },

  executeSelected: async () => {
    const { results, selectedIndex } = get();
    if (results.length === 0) return;

    const selected = results[selectedIndex];
    try {
      await invoke("execute_result", { resultId: selected.id });
      get().hideWindow();
    } catch (error) {
      console.error("Execute error:", error);
    }
  },

  hideWindow: async () => {
    try {
      await invoke("hide_window");
      get().reset();
    } catch (error) {
      console.error("Hide window error:", error);
    }
  },

  loadTheme: async () => {
    try {
      const theme = await invoke<SystemTheme>("get_system_theme");
      set({ theme });

      if (theme.accent_color) {
        document.documentElement.style.setProperty(
          "--system-accent",
          theme.accent_color
        );
      }
    } catch (error) {
      console.error("Load theme error:", error);
    }
  },

  setupIndexingListener: async () => {
    await listen<IndexingStatus>("indexing-status", (event) => {
      set({ indexingStatus: event.payload });
    });
  },

  reset: () => set({ query: "", results: [], selectedIndex: 0 }),
}));
