// ============================================
// Launcher Pro Features
// ============================================
//
// This module contains Pro/Pro+ edition features.
// In Community Edition builds, this module provides stub implementations.
//
// PROPRIETARY LICENSE
// Copyright (c) 2025 Launcher Team
// This code is NOT covered by the MIT license.
// See LICENSE_COMMERCIAL for terms.

#[cfg(feature = "pro")]
pub mod codex_pro;

#[cfg(feature = "pro")]
pub mod cloud_sync;

/// Check if Pro features are available at compile time
pub const fn is_pro_enabled() -> bool {
    cfg!(feature = "pro")
}

/// Check if Pro+ features are available at compile time
pub const fn is_pro_plus_enabled() -> bool {
    cfg!(feature = "pro_plus")
}

/// Feature availability info for the frontend
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProFeatures {
    pub pro_enabled: bool,
    pub pro_plus_enabled: bool,
    pub codex_available: bool,
    pub cloud_sync_available: bool,
    pub team_features_available: bool,
}

impl ProFeatures {
    pub fn current() -> Self {
        Self {
            pro_enabled: is_pro_enabled(),
            pro_plus_enabled: is_pro_plus_enabled(),
            codex_available: is_pro_enabled(),
            cloud_sync_available: is_pro_enabled(),
            team_features_available: is_pro_plus_enabled(),
        }
    }
}

impl Default for ProFeatures {
    fn default() -> Self {
        Self::current()
    }
}

/// Error returned when a Pro feature is accessed in Community Edition
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProFeatureError {
    pub feature: String,
    pub message: String,
    pub upgrade_url: String,
}

impl ProFeatureError {
    pub fn new(feature: &str) -> Self {
        Self {
            feature: feature.to_string(),
            message: format!(
                "{} is a Pro feature. Upgrade to unlock this functionality.",
                feature
            ),
            upgrade_url: "https://launcher.app/pricing".to_string(),
        }
    }
}

impl std::fmt::Display for ProFeatureError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for ProFeatureError {}
