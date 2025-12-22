// Pro features types - mirrors the Rust ProFeatures struct

export interface ProFeatures {
  pro_enabled: boolean;
  pro_plus_enabled: boolean;
  codex_available: boolean;
  cloud_sync_available: boolean;
  team_features_available: boolean;
}

export interface ProFeatureError {
  status: "ProFeatureRequired";
  message: string;
  upgrade_url: string;
}

// Type guard to check if a response is a pro feature error
export function isProFeatureError(response: unknown): response is ProFeatureError {
  return (
    typeof response === "object" &&
    response !== null &&
    "status" in response &&
    (response as ProFeatureError).status === "ProFeatureRequired"
  );
}

// Default pro features for CE builds
export const DEFAULT_PRO_FEATURES: ProFeatures = {
  pro_enabled: false,
  pro_plus_enabled: false,
  codex_available: false,
  cloud_sync_available: false,
  team_features_available: false,
};
