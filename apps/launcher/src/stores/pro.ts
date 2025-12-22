import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ProFeatures } from "@/types/pro";
import { DEFAULT_PRO_FEATURES, isProFeatureError } from "@/types/pro";

interface ProFeaturesState {
    // State
    features: ProFeatures;
    isLoading: boolean;
    error: string | null;

    // Computed helpers
    get isProEnabled(): boolean;
    get isCodexAvailable(): boolean;
    get isCloudSyncAvailable(): boolean;

    // Actions
    initialize: () => Promise<void>;
    checkFeature: (feature: keyof ProFeatures) => boolean;
}

export const useProFeaturesStore = create<ProFeaturesState>((set, get) => ({
    // Initial state - assume CE until we check
    features: DEFAULT_PRO_FEATURES,
    isLoading: true,
    error: null,

    // Computed helpers
    get isProEnabled() {
        return get().features.pro_enabled;
    },

    get isCodexAvailable() {
        return get().features.codex_available;
    },

    get isCloudSyncAvailable() {
        return get().features.cloud_sync_available;
    },

    initialize: async () => {
        set({ isLoading: true, error: null });
        try {
            const features = await invoke<ProFeatures>("get_pro_features");
            set({ features, isLoading: false });
            console.log("Pro features loaded:", features);
        } catch (error) {
            console.error("Failed to load pro features:", error);
            // Default to CE features on error
            set({
                features: DEFAULT_PRO_FEATURES,
                isLoading: false,
                error: String(error),
            });
        }
    },

    checkFeature: (feature: keyof ProFeatures) => {
        return get().features[feature] === true;
    },
}));

// Helper hook for checking if a specific feature is available
export function useProFeature(feature: keyof ProFeatures): boolean {
    const features = useProFeaturesStore((state) => state.features);
    return features[feature] === true;
}

// Helper hook for checking if Codex is available
export function useCodexAvailable(): boolean {
    return useProFeaturesStore((state) => state.features.codex_available);
}

// Helper hook for checking if Cloud Sync is available
export function useCloudSyncAvailable(): boolean {
    return useProFeaturesStore((state) => state.features.cloud_sync_available);
}

// Re-export the type guard for use in components
export { isProFeatureError };
