//! # launcher-plugin-sdk
//!
//! SDK for building Launcher plugins in Rust.
//!
//! ## Quick Start
//!
//! ```rust,ignore
//! use launcher_plugin_sdk::prelude::*;
//!
//! #[plugin_fn]
//! pub fn search(input: Json<SearchInput>) -> FnResult<Json<SearchOutput>> {
//!     let query = &input.0.query;
//!     log!(info, "Searching for: {}", query);
//!     
//!     let results = vec![
//!         SearchResult::new("result-1", "Hello World")
//!             .with_subtitle("A sample result")
//!             .with_icon("👋"),
//!     ];
//!     
//!     Ok(Json(SearchOutput { results }))
//! }
//! ```

pub mod types;
pub mod host;

/// Prelude module - import everything you need with `use launcher_plugin_sdk::prelude::*;`
pub mod prelude {
    pub use crate::types::*;
    pub use crate::host::*;
    pub use extism_pdk::{plugin_fn, FnResult, Json};
}

// Re-export extism_pdk for convenience
pub use extism_pdk;


