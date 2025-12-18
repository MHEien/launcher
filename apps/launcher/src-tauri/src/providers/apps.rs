use super::{ResultCategory, ResultIcon, SearchProvider, SearchResult};

// Linux implementation using freedesktop desktop entries
#[cfg(target_os = "linux")]
mod linux {
    use super::*;
    use freedesktop_desktop_entry::{default_paths, DesktopEntry, Iter};
    use std::collections::HashMap;
    use std::sync::RwLock;

    pub struct AppProvider {
        apps: RwLock<Vec<AppEntry>>,
    }

    #[derive(Debug, Clone)]
    struct AppEntry {
        id: String,
        name: String,
        generic_name: Option<String>,
        comment: Option<String>,
        exec: String,
        icon: Option<String>,
        keywords: Vec<String>,
    }

    impl AppProvider {
        pub fn new() -> Self {
            let provider = Self {
                apps: RwLock::new(Vec::new()),
            };
            provider.refresh_apps();
            provider
        }

        pub fn refresh_apps(&self) {
            let mut apps = Vec::new();
            let mut seen: HashMap<String, bool> = HashMap::new();
            let locales = &["en"];

            for path in Iter::new(default_paths()) {
                if let Ok(entry_data) = std::fs::read_to_string(&path) {
                    if let Ok(desktop) = DesktopEntry::from_str(&path, &entry_data, Some(locales)) {
                        if desktop.no_display() {
                            continue;
                        }

                        let name = desktop.name(locales).unwrap_or_default().to_string();
                        if name.is_empty() || seen.contains_key(&name) {
                            continue;
                        }
                        seen.insert(name.clone(), true);

                        let exec = desktop.exec().unwrap_or_default().to_string();
                        if exec.is_empty() {
                            continue;
                        }

                        let exec_clean = exec
                            .split_whitespace()
                            .next()
                            .unwrap_or(&exec)
                            .replace("%u", "")
                            .replace("%U", "")
                            .replace("%f", "")
                            .replace("%F", "");

                        let keywords: Vec<String> = desktop
                            .keywords(locales)
                            .map(|k| k.iter().map(|s| s.to_string()).collect())
                            .unwrap_or_default();

                        apps.push(AppEntry {
                            id: path.to_string_lossy().to_string(),
                            name: name.clone(),
                            generic_name: desktop.generic_name(locales).map(|s| s.to_string()),
                            comment: desktop.comment(locales).map(|s| s.to_string()),
                            exec: exec_clean,
                            icon: desktop.icon().map(|s| s.to_string()),
                            keywords,
                        });
                    }
                }
            }

            if let Ok(mut lock) = self.apps.write() {
                *lock = apps;
            }
        }

        fn score_match(query: &str, app: &AppEntry) -> f32 {
            let query_lower = query.to_lowercase();
            let name_lower = app.name.to_lowercase();

            if name_lower == query_lower {
                return 100.0;
            }

            if name_lower.starts_with(&query_lower) {
                return 90.0 + (query_lower.len() as f32 / name_lower.len() as f32) * 10.0;
            }

            if name_lower.contains(&query_lower) {
                return 70.0 + (query_lower.len() as f32 / name_lower.len() as f32) * 10.0;
            }

            if let Some(ref generic) = app.generic_name {
                let generic_lower = generic.to_lowercase();
                if generic_lower.contains(&query_lower) {
                    return 50.0;
                }
            }

            for keyword in &app.keywords {
                if keyword.to_lowercase().contains(&query_lower) {
                    return 40.0;
                }
            }

            if let Some(ref comment) = app.comment {
                if comment.to_lowercase().contains(&query_lower) {
                    return 30.0;
                }
            }

            0.0
        }
    }

    impl SearchProvider for AppProvider {
        fn id(&self) -> &str {
            "apps"
        }

        fn search(&self, query: &str) -> Vec<SearchResult> {
            if query.trim().is_empty() {
                return vec![];
            }

            let apps = match self.apps.read() {
                Ok(lock) => lock,
                Err(_) => return vec![],
            };

            let mut results: Vec<SearchResult> = apps
                .iter()
                .filter_map(|app| {
                    let score = Self::score_match(query, app);
                    if score > 0.0 {
                        Some(SearchResult {
                            id: format!("app:{}", app.id),
                            title: app.name.clone(),
                            subtitle: app.generic_name.clone().or(app.comment.clone()),
                            icon: app
                                .icon
                                .clone()
                                .map(ResultIcon::Text)
                                .unwrap_or(ResultIcon::Emoji("📦".to_string())),
                            category: ResultCategory::Application,
                            score,
                        })
                    } else {
                        None
                    }
                })
                .collect();

            results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
            results.truncate(10);
            results
        }

        fn execute(&self, result_id: &str) -> Result<(), String> {
            if let Some(desktop_path) = result_id.strip_prefix("app:") {
                let apps = self.apps.read().map_err(|e| e.to_string())?;
                if let Some(app) = apps.iter().find(|a| a.id == desktop_path) {
                    std::process::Command::new("sh")
                        .arg("-c")
                        .arg(&app.exec)
                        .spawn()
                        .map_err(|e| e.to_string())?;
                    Ok(())
                } else {
                    Err("App not found".to_string())
                }
            } else {
                Err("Invalid app result".to_string())
            }
        }
    }
}

// Windows implementation - scans Start Menu shortcuts with icon extraction
#[cfg(target_os = "windows")]
mod windows_impl {
    use super::*;
    use lnk::ShellLink;
    use pelite::pe64::{Pe, PeFile};
    use pelite::resources::version_info::VersionInfo;
    use sha2::{Digest, Sha256};
    use std::collections::HashMap;
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use std::path::PathBuf;
    use std::sync::RwLock;
    use ::windows::Win32::UI::Shell::{ExtractIconExW, SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
    use ::windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, HICON, ICONINFO};
    use ::windows::Win32::Graphics::Gdi::{
        CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, SelectObject,
        BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
    };
    use ::windows::core::PCWSTR;
    use ::windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;

    pub struct AppProvider {
        apps: RwLock<Vec<AppEntry>>,
        icon_cache_dir: PathBuf,
    }

    #[derive(Debug, Clone)]
    struct AppEntry {
        id: String,
        name: String,
        description: Option<String>,
        target_path: Option<String>,
        icon_path: Option<String>,
        shortcut_path: PathBuf,
    }

    impl AppProvider {
        pub fn new() -> Self {
            // Create icon cache directory
            let icon_cache_dir = dirs::data_local_dir()
                .unwrap_or_else(|| PathBuf::from("."))
                .join("launcher")
                .join("icons");
            
            let _ = std::fs::create_dir_all(&icon_cache_dir);

            let provider = Self {
                apps: RwLock::new(Vec::new()),
                icon_cache_dir,
            };
            provider.refresh_apps();
            provider
        }

        pub fn refresh_apps(&self) {
            let mut apps = Vec::new();
            let mut seen: HashMap<String, bool> = HashMap::new();

            // Common Start Menu locations
            let start_menu_paths = Self::get_start_menu_paths();

            for base_path in start_menu_paths {
                if base_path.exists() {
                    self.scan_directory(&base_path, &mut apps, &mut seen);
                }
            }

            if let Ok(mut lock) = self.apps.write() {
                *lock = apps;
            }
        }

        fn get_start_menu_paths() -> Vec<PathBuf> {
            let mut paths = Vec::new();

            // User Start Menu
            if let Some(appdata) = std::env::var_os("APPDATA") {
                let user_start = PathBuf::from(appdata)
                    .join("Microsoft")
                    .join("Windows")
                    .join("Start Menu")
                    .join("Programs");
                paths.push(user_start);
            }

            // System Start Menu
            if let Some(programdata) = std::env::var_os("PROGRAMDATA") {
                let system_start = PathBuf::from(programdata)
                    .join("Microsoft")
                    .join("Windows")
                    .join("Start Menu")
                    .join("Programs");
                paths.push(system_start);
            }

            paths
        }

        fn scan_directory(
            &self,
            dir: &PathBuf,
            apps: &mut Vec<AppEntry>,
            seen: &mut HashMap<String, bool>,
        ) {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();

                    if path.is_dir() {
                        self.scan_directory(&path, apps, seen);
                    } else if let Some(ext) = path.extension() {
                        if ext == "lnk" {
                            if let Some(name) = path.file_stem() {
                                let name_str = name.to_string_lossy().to_string();

                                // Skip duplicates and common uninstallers
                                if seen.contains_key(&name_str)
                                    || name_str.to_lowercase().contains("uninstall")
                                {
                                    continue;
                                }
                                seen.insert(name_str.clone(), true);

                                // Parse the .lnk file
                                let (lnk_description, target_path) = Self::parse_lnk(&path);
                                
                                // Try to get description from .lnk, fallback to exe version info
                                let description = lnk_description.or_else(|| {
                                    target_path.as_ref().and_then(|target| Self::get_exe_description(target))
                                });
                                
                                // Try to extract and cache the icon
                                let icon_path = self.extract_and_cache_icon(&path, &target_path);

                                apps.push(AppEntry {
                                    id: path.to_string_lossy().to_string(),
                                    name: name_str,
                                    description,
                                    target_path,
                                    icon_path,
                                    shortcut_path: path.clone(),
                                });
                            }
                        }
                    }
                }
            }
        }

        fn parse_lnk(path: &PathBuf) -> (Option<String>, Option<String>) {
            match ShellLink::open(path) {
                Ok(lnk) => {
                    let description = lnk.name()
                        .as_ref()
                        .map(|s| s.to_string())
                        .filter(|s| !s.is_empty());
                    
                    // Get the target path - could be relative or in link_info
                    let target = lnk.relative_path()
                        .as_ref()
                        .map(|s| s.to_string())
                        .or_else(|| {
                            lnk.link_info()
                                .as_ref()
                                .and_then(|info| info.local_base_path().as_ref().map(|s| s.to_string()))
                        })
                        .filter(|s| !s.is_empty());
                    
                    (description, target)
                }
                Err(_) => (None, None),
            }
        }

        /// Extract FileDescription from an executable's version info
        fn get_exe_description(exe_path: &str) -> Option<String> {
            let path = PathBuf::from(exe_path);
            if !path.exists() || path.extension().map(|e| e != "exe").unwrap_or(true) {
                return None;
            }

            // Read the executable file
            let file_data = std::fs::read(&path).ok()?;
            
            // Try parsing as PE64 first
            if let Ok(pe) = PeFile::from_bytes(&file_data) {
                if let Ok(resources) = pe.resources() {
                    if let Ok(version_info) = resources.version_info() {
                        if let Some(desc) = Self::extract_version_string(&version_info) {
                            return Some(desc);
                        }
                    }
                }
            }
            
            // Try PE32
            use pelite::pe32::Pe as Pe32;
            if let Ok(pe) = pelite::pe32::PeFile::from_bytes(&file_data) {
                if let Ok(resources) = pe.resources() {
                    if let Ok(version_info) = resources.version_info() {
                        if let Some(desc) = Self::extract_version_string(&version_info) {
                            return Some(desc);
                        }
                    }
                }
            }

            None
        }

        fn extract_version_string(version_info: &VersionInfo) -> Option<String> {
            let mut file_description: Option<String> = None;
            let mut product_name: Option<String> = None;
            
            // Try to get FileDescription from string tables
            for lang in version_info.translation() {
                version_info.strings(*lang, |key, value| {
                    let value = value.trim();
                    if !value.is_empty() {
                        if key == "FileDescription" && file_description.is_none() {
                            file_description = Some(value.to_string());
                        } else if key == "ProductName" && product_name.is_none() {
                            product_name = Some(value.to_string());
                        }
                    }
                });
                
                // Prefer FileDescription, fall back to ProductName
                if file_description.is_some() {
                    return file_description;
                }
            }
            
            // Return ProductName if FileDescription not found
            product_name
        }

        fn extract_and_cache_icon(&self, shortcut_path: &PathBuf, target_path: &Option<String>) -> Option<String> {
            // Generate cache filename based on shortcut path hash
            let mut hasher = Sha256::new();
            hasher.update(shortcut_path.to_string_lossy().as_bytes());
            let hash = format!("{:x}", hasher.finalize());
            let cache_path = self.icon_cache_dir.join(format!("{}.png", &hash[..16]));

            // Check if already cached
            if cache_path.exists() {
                return Some(cache_path.to_string_lossy().to_string());
            }

            // Try to extract icon from shortcut first, then from target
            let icon_source = if shortcut_path.exists() {
                shortcut_path.clone()
            } else if let Some(ref target) = target_path {
                PathBuf::from(target)
            } else {
                return None;
            };

            // Extract the icon using Windows Shell API
            if let Some(icon_data) = Self::extract_icon_from_file(&icon_source) {
                // Save as PNG
                if Self::save_icon_as_png(&icon_data, &cache_path) {
                    return Some(cache_path.to_string_lossy().to_string());
                }
            }

            // Fallback: try extracting from target if shortcut extraction failed
            if let Some(ref target) = target_path {
                let target_path = PathBuf::from(target);
                if target_path.exists() && target_path != icon_source {
                    if let Some(icon_data) = Self::extract_icon_from_file(&target_path) {
                        if Self::save_icon_as_png(&icon_data, &cache_path) {
                            return Some(cache_path.to_string_lossy().to_string());
                        }
                    }
                }
            }

            None
        }

        fn extract_icon_from_file(path: &PathBuf) -> Option<IconData> {
            let wide_path: Vec<u16> = OsStr::new(path)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            unsafe {
                // Try SHGetFileInfo first - it handles .lnk files well
                let mut shfi: SHFILEINFOW = std::mem::zeroed();
                let result = SHGetFileInfoW(
                    PCWSTR(wide_path.as_ptr()),
                    FILE_FLAGS_AND_ATTRIBUTES(0),
                    Some(&mut shfi),
                    std::mem::size_of::<SHFILEINFOW>() as u32,
                    SHGFI_ICON | SHGFI_LARGEICON,
                );

                if result != 0 && !shfi.hIcon.is_invalid() {
                    let icon_data = Self::hicon_to_rgba(shfi.hIcon);
                    let _ = DestroyIcon(shfi.hIcon);
                    return icon_data;
                }

                // Fallback to ExtractIconEx for executables
                let mut large_icon: HICON = HICON::default();
                let count = ExtractIconExW(
                    PCWSTR(wide_path.as_ptr()),
                    0,
                    Some(&mut large_icon),
                    None,
                    1,
                );

                if count > 0 && !large_icon.is_invalid() {
                    let icon_data = Self::hicon_to_rgba(large_icon);
                    let _ = DestroyIcon(large_icon);
                    return icon_data;
                }
            }

            None
        }

        fn hicon_to_rgba(hicon: HICON) -> Option<IconData> {
            unsafe {
                let mut icon_info: ICONINFO = std::mem::zeroed();
                if GetIconInfo(hicon, &mut icon_info).is_err() {
                    return None;
                }

                // Get bitmap info
                let hdc = CreateCompatibleDC(None);
                if hdc.is_invalid() {
                    if !icon_info.hbmColor.is_invalid() {
                        let _ = DeleteObject(icon_info.hbmColor);
                    }
                    if !icon_info.hbmMask.is_invalid() {
                        let _ = DeleteObject(icon_info.hbmMask);
                    }
                    return None;
                }

                // Use the color bitmap if available
                let hbm = if !icon_info.hbmColor.is_invalid() {
                    icon_info.hbmColor
                } else {
                    icon_info.hbmMask
                };

                let old_bm = SelectObject(hdc, hbm);

                // Set up bitmap info header for 32-bit RGBA
                let width = 32i32;
                let height = 32i32;
                
                let mut bmi: BITMAPINFO = std::mem::zeroed();
                bmi.bmiHeader.biSize = std::mem::size_of::<BITMAPINFOHEADER>() as u32;
                bmi.bmiHeader.biWidth = width;
                bmi.bmiHeader.biHeight = -height; // Top-down
                bmi.bmiHeader.biPlanes = 1;
                bmi.bmiHeader.biBitCount = 32;
                bmi.bmiHeader.biCompression = BI_RGB.0;

                let mut pixels: Vec<u8> = vec![0u8; (width * height * 4) as usize];

                let result = GetDIBits(
                    hdc,
                    hbm,
                    0,
                    height as u32,
                    Some(pixels.as_mut_ptr() as *mut _),
                    &mut bmi,
                    DIB_RGB_COLORS,
                );

                SelectObject(hdc, old_bm);
                let _ = DeleteDC(hdc);

                if !icon_info.hbmColor.is_invalid() {
                    let _ = DeleteObject(icon_info.hbmColor);
                }
                if !icon_info.hbmMask.is_invalid() {
                    let _ = DeleteObject(icon_info.hbmMask);
                }

                if result == 0 {
                    return None;
                }

                // Convert BGRA to RGBA
                for chunk in pixels.chunks_exact_mut(4) {
                    chunk.swap(0, 2); // Swap B and R
                }

                Some(IconData {
                    width: width as u32,
                    height: height as u32,
                    rgba: pixels,
                })
            }
        }

        fn save_icon_as_png(icon_data: &IconData, path: &PathBuf) -> bool {
            use image::{ImageBuffer, Rgba};

            let img: ImageBuffer<Rgba<u8>, Vec<u8>> = match ImageBuffer::from_raw(
                icon_data.width,
                icon_data.height,
                icon_data.rgba.clone(),
            ) {
                Some(img) => img,
                None => return false,
            };

            img.save(path).is_ok()
        }

        fn score_match(query: &str, app: &AppEntry) -> f32 {
            let query_lower = query.to_lowercase();
            let name_lower = app.name.to_lowercase();

            if name_lower == query_lower {
                return 100.0;
            }

            if name_lower.starts_with(&query_lower) {
                return 90.0 + (query_lower.len() as f32 / name_lower.len() as f32) * 10.0;
            }

            if name_lower.contains(&query_lower) {
                return 70.0 + (query_lower.len() as f32 / name_lower.len() as f32) * 10.0;
            }

            // Check individual words
            for word in name_lower.split_whitespace() {
                if word.starts_with(&query_lower) {
                    return 60.0;
                }
            }

            // Check description
            if let Some(ref desc) = app.description {
                if desc.to_lowercase().contains(&query_lower) {
                    return 40.0;
                }
            }

            0.0
        }
    }

    struct IconData {
        width: u32,
        height: u32,
        rgba: Vec<u8>,
    }

    impl SearchProvider for AppProvider {
        fn id(&self) -> &str {
            "apps"
        }

        fn search(&self, query: &str) -> Vec<SearchResult> {
            if query.trim().is_empty() {
                return vec![];
            }

            let apps = match self.apps.read() {
                Ok(lock) => lock,
                Err(_) => return vec![],
            };

            let mut results: Vec<SearchResult> = apps
                .iter()
                .filter_map(|app| {
                    let score = Self::score_match(query, app);
                    if score > 0.0 {
                        // Use extracted icon path, or fall back to emoji
                        let icon = app.icon_path
                            .as_ref()
                            .map(|p| ResultIcon::Path(p.clone()))
                            .unwrap_or(ResultIcon::Emoji("📦".to_string()));

                        Some(SearchResult {
                            id: format!("app:{}", app.id),
                            title: app.name.clone(),
                            subtitle: app.description.clone(),
                            icon,
                            category: ResultCategory::Application,
                            score,
                        })
                    } else {
                        None
                    }
                })
                .collect();

            results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
            results.truncate(10);
            results
        }

        fn execute(&self, result_id: &str) -> Result<(), String> {
            if let Some(shortcut_path) = result_id.strip_prefix("app:") {
                std::process::Command::new("cmd")
                    .args(["/C", "start", "", shortcut_path])
                    .spawn()
                    .map_err(|e| format!("Failed to launch app: {}", e))?;
                Ok(())
            } else {
                Err("Invalid app result".to_string())
            }
        }
    }
}

// macOS implementation - scans Applications folders
#[cfg(target_os = "macos")]
mod macos {
    use super::*;
    use std::collections::HashMap;
    use std::path::PathBuf;
    use std::sync::RwLock;

    pub struct AppProvider {
        apps: RwLock<Vec<AppEntry>>,
    }

    #[derive(Debug, Clone)]
    struct AppEntry {
        id: String,
        name: String,
        path: PathBuf,
    }

    impl AppProvider {
        pub fn new() -> Self {
            let provider = Self {
                apps: RwLock::new(Vec::new()),
            };
            provider.refresh_apps();
            provider
        }

        pub fn refresh_apps(&self) {
            let mut apps = Vec::new();
            let mut seen: HashMap<String, bool> = HashMap::new();

            // Standard Applications directories
            let app_dirs = vec![
                PathBuf::from("/Applications"),
                PathBuf::from("/System/Applications"),
                dirs::home_dir()
                    .map(|h| h.join("Applications"))
                    .unwrap_or_default(),
            ];

            for dir in app_dirs {
                if dir.exists() {
                    Self::scan_directory(&dir, &mut apps, &mut seen, 0);
                }
            }

            if let Ok(mut lock) = self.apps.write() {
                *lock = apps;
            }
        }

        fn scan_directory(
            dir: &PathBuf,
            apps: &mut Vec<AppEntry>,
            seen: &mut HashMap<String, bool>,
            depth: u32,
        ) {
            // Limit recursion depth to avoid scanning inside .app bundles too deeply
            if depth > 2 {
                return;
            }

            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();

                    if let Some(ext) = path.extension() {
                        if ext == "app" {
                            if let Some(name) = path.file_stem() {
                                let name_str = name.to_string_lossy().to_string();

                                if seen.contains_key(&name_str) {
                                    continue;
                                }
                                seen.insert(name_str.clone(), true);

                                apps.push(AppEntry {
                                    id: path.to_string_lossy().to_string(),
                                    name: name_str,
                                    path: path.clone(),
                                });
                            }
                            // Don't recurse into .app bundles
                            continue;
                        }
                    }

                    // Recurse into subdirectories (but not .app bundles)
                    if path.is_dir() {
                        Self::scan_directory(&path, apps, seen, depth + 1);
                    }
                }
            }
        }

        fn score_match(query: &str, app: &AppEntry) -> f32 {
            let query_lower = query.to_lowercase();
            let name_lower = app.name.to_lowercase();

            if name_lower == query_lower {
                return 100.0;
            }

            if name_lower.starts_with(&query_lower) {
                return 90.0 + (query_lower.len() as f32 / name_lower.len() as f32) * 10.0;
            }

            if name_lower.contains(&query_lower) {
                return 70.0 + (query_lower.len() as f32 / name_lower.len() as f32) * 10.0;
            }

            // Check individual words
            for word in name_lower.split_whitespace() {
                if word.starts_with(&query_lower) {
                    return 60.0;
                }
            }

            0.0
        }
    }

    impl SearchProvider for AppProvider {
        fn id(&self) -> &str {
            "apps"
        }

        fn search(&self, query: &str) -> Vec<SearchResult> {
            if query.trim().is_empty() {
                return vec![];
            }

            let apps = match self.apps.read() {
                Ok(lock) => lock,
                Err(_) => return vec![],
            };

            let mut results: Vec<SearchResult> = apps
                .iter()
                .filter_map(|app| {
                    let score = Self::score_match(query, app);
                    if score > 0.0 {
                        Some(SearchResult {
                            id: format!("app:{}", app.id),
                            title: app.name.clone(),
                            subtitle: Some(app.path.to_string_lossy().to_string()),
                            icon: ResultIcon::Emoji("📦".to_string()),
                            category: ResultCategory::Application,
                            score,
                        })
                    } else {
                        None
                    }
                })
                .collect();

            results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
            results.truncate(10);
            results
        }

        fn execute(&self, result_id: &str) -> Result<(), String> {
            if let Some(app_path) = result_id.strip_prefix("app:") {
                std::process::Command::new("open")
                    .arg(app_path)
                    .spawn()
                    .map_err(|e| format!("Failed to launch app: {}", e))?;
                Ok(())
            } else {
                Err("Invalid app result".to_string())
            }
        }
    }
}

#[cfg(target_os = "linux")]
pub use linux::AppProvider;

#[cfg(target_os = "windows")]
pub use windows_impl::AppProvider;

#[cfg(target_os = "macos")]
pub use macos::AppProvider;
