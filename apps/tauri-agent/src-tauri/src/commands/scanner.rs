use std::path::PathBuf;
use std::fs;
use serde::{Deserialize, Serialize};

/// One scanned FiveM resource. Field names MUST match ScanResourcesResultSchema
/// in packages/shared/src/protocol/actions.ts: camelCase JSON keys, lowercase
/// framework enum values, ISO8601 timestamps.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceInfo {
    pub name: String,
    #[serde(rename = "relativePath")]
    pub relative_path: String,
    #[serde(rename = "manifestPath")]
    pub manifest_path: String,
    pub dependencies: Vec<String>,
    pub provides: Vec<String>,
    pub files: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub framework: String,
    pub resources: Vec<ResourceInfo>,
    /// ISO8601 timestamp (schema requires a datetime string).
    #[serde(rename = "scannedAt")]
    pub scanned_at: String,
}

pub struct Scanner {
    server_path: PathBuf,
}

/// Hard cap on total resources per scan so a pathological server tree cannot
/// make the scan run unbounded.
const MAX_RESOURCES: usize = 500;

/// Maximum recursion depth for category folders (`[category]/`). FiveM conventions
/// use at most one level of bracketed folders (e.g., `[standalone]/resource/`).
/// This prevents stack overflow from maliciously deep nesting.
const MAX_SCAN_DEPTH: usize = 3;

impl Scanner {
    pub fn new(server_path: PathBuf) -> Self {
        Self { server_path }
    }

    pub fn scan_all(&self) -> Result<ScanResult, String> {
        let resources = self.scan_resources()?;
        let framework = self.detect_framework(&resources);

        Ok(ScanResult {
            framework,
            resources,
            scanned_at: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        })
    }

    fn scan_resources(&self) -> Result<Vec<ResourceInfo>, String> {
        let mut resources = Vec::new();

        if !self.server_path.exists() {
            return Err("Server path does not exist".to_string());
        }

        // Scan for resources directory
        let resources_dir = self.server_path.join("resources");
        if !resources_dir.exists() {
            return Ok(resources);
        }

        self.scan_dir_children(&resources_dir, &mut resources, 0)?;
        Ok(resources)
    }

    /// Scan one directory level for resource manifests. Real FiveM servers
    /// nest resources under bracketed category folders (`[standalone]/resource/`),
    /// so when a child has no manifest we recurse ONE level into `[...]`
    /// subdirectories looking for manifests there.
    ///
    /// A single unreadable manifest skips that resource (logged) instead of
    /// aborting the whole scan.
    ///
    /// `depth` tracks recursion depth into bracketed category folders to prevent
    /// infinite recursion on maliciously nested directories.
    fn scan_dir_children(
        &self,
        dir: &std::path::Path,
        resources: &mut Vec<ResourceInfo>,
        depth: usize,
    ) -> Result<(), String> {
        // Prevent unbounded recursion
        if depth > MAX_SCAN_DEPTH {
            return Ok(());
        }

        let dir_entries = fs::read_dir(dir)
            .map_err(|e| format!("Failed to read {}: {}", dir.display(), e))?;

        for entry in dir_entries.flatten() {
            if resources.len() >= MAX_RESOURCES {
                break;
            }
            let dir_path = entry.path();

            if !dir_path.is_dir() {
                continue;
            }

            let resource_name = dir_path.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            let manifest_path = self.find_manifest(&dir_path);
            let manifest_path = match manifest_path {
                Some(p) => p,
                None => {
                    // No manifest directly inside. If this is a bracketed
                    // category folder ([category]/), look one level deeper.
                    if resource_name.starts_with('[') && resource_name.ends_with(']') {
                        self.scan_dir_children(&dir_path, resources, depth + 1)?;
                    }
                    continue;
                }
            };
        let dir_entries = fs::read_dir(dir)
            .map_err(|e| format!("Failed to read {}: {}", dir.display(), e))?;

        for entry in dir_entries.flatten() {
            if resources.len() >= MAX_RESOURCES {
                break;
            }
            let dir_path = entry.path();

            if !dir_path.is_dir() {
                continue;
            }

            let resource_name = dir_path.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            let manifest_path = self.find_manifest(&dir_path);
            let manifest_path = match manifest_path {
                Some(p) => p,
                None => {
                    // No manifest directly inside. If this is a bracketed
                    // category folder ([category]/), look one level deeper.
                    if resource_name.starts_with('[') && resource_name.ends_with(']') {
                        self.scan_dir_children(&dir_path, resources)?;
                    }
                    continue;
                }
            };

            match fs::read_to_string(&manifest_path) {
                Ok(manifest_content) => {
                    let (dependencies, provides, files) =
                        self.parse_manifest(&resource_name, &manifest_content);

                    let relative = dir_path.strip_prefix(&self.server_path)
                        .map(|p| p.to_string_lossy().replace('\\', "/"))
                        .unwrap_or_else(|_| resource_name.clone());

                    resources.push(ResourceInfo {
                        name: resource_name.clone(),
                        relative_path: relative,
                        manifest_path: to_forward_slashes(
                            &manifest_path.strip_prefix(&self.server_path)
                                .map(|p| p.to_path_buf())
                                .unwrap_or(manifest_path.clone()),
                        ),
                        dependencies,
                        provides,
                        files,
                    });
                }
                Err(err) => {
                    // Skip the unreadable resource; never abort the whole scan.
                    eprintln!("[Scanner] Skipping {}: failed to read manifest: {}", resource_name, err);
                }
            }
        }

        Ok(())
    }

    /// Return fxmanifest.lua (preferred) or legacy __resource.lua if present.
    fn find_manifest(&self, dir: &std::path::Path) -> Option<PathBuf> {
        let fx = dir.join("fxmanifest.lua");
        if fx.is_file() {
            return Some(fx);
        }
        let legacy = dir.join("__resource.lua");
        if legacy.is_file() {
            return Some(legacy);
        }
        None
    }

    fn parse_manifest(
        &self,
        _resource_name: &str,
        content: &str,
    ) -> (Vec<String>, Vec<String>, Vec<String>) {
        let mut dependencies = Vec::new();
        let mut provides = Vec::new();
        let mut files = Vec::new();

        // Lua tables may span lines:
        //   dependencies {
        //     'qb-core',
        //   }
        // Join continuation lines so single-line bracket matching works.
        let joined = join_lua_blocks(content);

        for line in joined.lines() {
            let line = line.trim();

            // Skip comments
            if line.starts_with("--") {
                continue;
            }

            // Parse dependencies
            if line.starts_with("dependencies") || line.starts_with("dependency ") {
                if let Some(items) = self.extract_bracketed_list(line) {
                    dependencies.extend(items);
                }
            }

            // Parse provides
            if line.starts_with("provide") {
                if let Some(val) = self.extract_quoted_string(line) {
                    provides.push(val);
                }
            }

            // Parse files
            if line.starts_with("files") || line.starts_with("client_scripts")
                || line.starts_with("server_scripts") || line.starts_with("shared_scripts")
                || line.starts_with("client_script ") || line.starts_with("server_script ")
                || line.starts_with("shared_script ") {
                if let Some(items) = self.extract_bracketed_list(line) {
                    for item in items {
                        files.push(item);
                    }
                }
            }
        }

        (dependencies, provides, files)
    }

    /// Extract a Lua table's string items. Accepts both `{ 'a', 'b' }` and
    /// legacy `[ 'a', 'b' ]` bracket styles.
    fn extract_bracketed_list(&self, line: &str) -> Option<Vec<String>> {
        // Prefer { ... } (modern Lua table syntax); fall back to [ ... ].
        let (start_ch, end_ch) = match line.find('{') {
            Some(_) => ('{', '}'),
            None => ('[', ']'),
        };
        let start = line.find(start_ch)?;
        let end = line.rfind(end_ch)?;
        if end <= start {
            return None;
        }
        let list_str = &line[start + 1..end];

        Some(
            list_str
                .split(',')
                .map(|s| s.trim().trim_matches('"').trim_matches('\'').to_string())
                .filter(|s| !s.is_empty())
                .collect()
        )
    }

    fn extract_quoted_string(&self, line: &str) -> Option<String> {
        let quote_char = if line.contains('"') { '"' } else { '\'' };
        let start = line.find(quote_char)?;
        let rest = &line[start + 1..];
        let end = rest.find(quote_char)?;
        Some(rest[..end].to_string())
    }

    /// Detect the server framework from resource names. Values MUST be drawn
    /// from ScanResourcesResultSchema's framework enum:
    /// 'qbcore' | 'vrp' | 'esx' | 'unknown' (lowercase).
    fn detect_framework(&self, resources: &[ResourceInfo]) -> String {
        let mut names: Vec<String> = resources.iter().map(|r| r.name.to_lowercase()).collect();
        names.extend(resources.iter().flat_map(|r| r.dependencies.iter().map(|d| d.to_lowercase())));

        let qb_indicators = ["qbcore", "qb-core", "qb-"];
        if names.iter().any(|n| qb_indicators.iter().any(|i| n.contains(i))) {
            return "qbcore".to_string();
        }
        if names.iter().any(|n| n.contains("esx") || n.contains("es_extended")) {
            return "esx".to_string();
        }
        if names.iter().any(|n| n.contains("vrp")) {
            return "vrp".to_string();
        }

        "unknown".to_string()
    }
}

/// Join Lua table literals that span multiple lines into single logical lines
/// so the per-line bracket parser can see them:
///
/// ```text
/// dependencies {
///   'qb-core',
/// }
/// ```
/// becomes `dependencies { 'qb-core', }`.
fn join_lua_blocks(content: &str) -> String {
    let mut out: Vec<String> = Vec::new();
    let mut pending = String::new();
    for raw in content.lines() {
        let line = raw.trim();
        // Strip trailing line comments before joining.
        let code = match line.find("--") {
            Some(idx) if !line[..idx].ends_with("[") => line[..idx].trim_end(),
            _ => line,
        };
        if pending.is_empty() {
            if (code.contains('{') && !code.contains('}'))
                || (code.contains('[') && !code.contains(']') && !code.starts_with('['))
            {
                pending.push_str(code);
                pending.push(' ');
            } else {
                out.push(code.to_string());
            }
        } else {
            pending.push_str(code);
            pending.push(' ');
            let opens = pending.matches('{').count() + pending.matches('[').count();
            let closes = pending.matches('}').count() + pending.matches(']').count();
            if closes >= opens {
                out.push(pending.clone());
                pending.clear();
            }
        }
    }
    if !pending.is_empty() {
        out.push(pending);
    }
    out.join("\n")
}

fn to_forward_slashes(p: &std::path::Path) -> String {
    p.to_string_lossy().replace('\\', "/")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_resource(name: &str) -> ResourceInfo {
        ResourceInfo {
            name: name.to_string(),
            relative_path: format!("resources/{}", name),
            manifest_path: format!("resources/{}/fxmanifest.lua", name),
            dependencies: vec![],
            provides: vec![],
            files: vec![],
        }
    }

    #[test]
    fn test_detect_qbcore() {
        let scanner = Scanner::new(PathBuf::from("/tmp/test"));
        let resources = vec![
            sample_resource("qb-core"),
        ];
        assert_eq!(scanner.detect_framework(&resources), "qbcore");
    }

    #[test]
    fn test_detect_esx() {
        let scanner = Scanner::new(PathBuf::from("/tmp/test"));
        let resources = vec![
            sample_resource("es_extended"),
        ];
        assert_eq!(scanner.detect_framework(&resources), "esx");
    }

    #[test]
    fn test_detect_unknown() {
        let scanner = Scanner::new(PathBuf::from("/tmp/test"));
        let resources = vec![
            sample_resource("my-cool-resource"),
        ];
        assert_eq!(scanner.detect_framework(&resources), "unknown");
    }

    #[test]
    fn test_scan_result_serializes_camel_case_iso8601() {
        // The orchestrator persists camelCase fields + ISO8601 scannedAt
        // (ScanResourcesResultSchema); serde renames must hold on the wire.
        let result = ScanResult {
            framework: "qbcore".to_string(),
            resources: vec![sample_resource("qb-core")],
            scanned_at: "2026-08-24T00:00:00.000Z".to_string(),
        };
        let json: serde_json::Value = serde_json::to_value(&result).unwrap();
        assert!(json.get("scannedAt").is_some(), "expected scannedAt key, got {:?}", json);
        assert!(json.get("scanned_at").is_none());
        let res = &json["resources"][0];
        assert!(res.get("relativePath").is_some(), "expected relativePath key");
        assert!(res.get("relative_path").is_none());
        assert!(res.get("manifestPath").is_some());
        assert!(res.get("manifest_path").is_none());
    }

    #[test]
    fn test_scans_nested_category_folders_and_skips_bad_manifests() {
        // Build a fake server-data tree:
        //   resources/[cats]/nested-res/fxmanifest.lua   <- found via recursion
        //   resources/plain-res/fxmanifest.lua           <- found directly
        //   resources/[cats]/broken/fxmanifest.lua       <- unreadable, skipped
        let unique = std::process::id().to_string() + "-nox-scanner";
        let base = std::env::temp_dir().join(unique);
        let _ = fs::remove_dir_all(&base);
        let nested = base.join("resources").join("[cats]").join("nested-res");
        fs::create_dir_all(&nested).unwrap();
        fs::write(nested.join("fxmanifest.lua"), "fx_version 'cerulean'\ndependencies {\n'qb-core'\n}\n").unwrap();

        let plain = base.join("resources").join("plain-res");
        fs::create_dir_all(&plain).unwrap();
        fs::write(plain.join("fxmanifest.lua"), "fx_version 'cerulean'\n").unwrap();

        let broken = base.join("resources").join("[cats]").join("broken");
        fs::create_dir_all(&broken).unwrap();
        // Raw bytes that are NOT valid UTF-8 — read_to_string must fail.
        fs::write(broken.join("fxmanifest.lua"), [0xFF_u8, 0xFE, b'n', b'o', b't']).unwrap();

        let scanner = Scanner::new(base.clone());
        let result = scanner.scan_all().expect("scan must not abort on bad manifest");

        let names: Vec<&str> = result.resources.iter().map(|r| r.name.as_str()).collect();
        assert!(names.contains(&"nested-res"), "nested resource must be found, got {:?}", names);
        assert!(names.contains(&"plain-res"), "top-level resource must be found, got {:?}", names);
        assert!(!names.contains(&"broken"), "unreadable manifest must be skipped");
        assert_eq!(result.framework, "qbcore");

        let nested_info = result.resources.iter().find(|r| r.name == "nested-res").unwrap();
        assert_eq!(nested_info.relative_path, "resources/[cats]/nested-res");
        assert_eq!(nested_info.manifest_path, "resources/[cats]/nested-res/fxmanifest.lua");

        let _ = fs::remove_dir_all(&base);
    }
}
