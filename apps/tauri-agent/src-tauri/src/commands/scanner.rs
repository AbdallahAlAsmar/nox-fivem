use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceManifest {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub dependencies: Vec<String>,
    pub provides: Vec<String>,
    #[serde(rename = "clientScripts")]
    pub client_scripts: Vec<String>,
    #[serde(rename = "serverScripts")]
    pub server_scripts: Vec<String>,
    #[serde(rename = "sharedScripts")]
    pub shared_scripts: Vec<String>,
    pub files: Vec<String>,
    #[serde(rename = "dataFiles")]
    pub data_files: Vec<String>,
    pub exports: Vec<String>,
    #[serde(rename = "serverExports")]
    pub server_exports: Vec<String>,
    #[serde(rename = "serverOnly")]
    pub server_only: bool,
    #[serde(rename = "clientOnly")]
    pub client_only: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedResource {
    pub name: String,
    #[serde(rename = "relativePath")]
    pub relative_path: String,
    #[serde(rename = "manifestPath")]
    pub manifest_path: String,
    pub manifest: ResourceManifest,
    pub files: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub framework: String,
    pub resources: Vec<ScannedResource>,
    #[serde(rename = "scannedAt")]
    pub scanned_at: String,
    pub warnings: Vec<String>,
}

pub struct Scanner {
    root_path: PathBuf,
}

impl Scanner {
    pub fn new(root_path: PathBuf) -> Self {
        Self { root_path }
    }

    pub fn scan_all(&self) -> Result<ScanResult, String> {
        let resources_path = self.root_path.join("resources");
        if !resources_path.exists() {
            return Err("Resources directory not found. Please verify the server-data folder.".to_string());
        }

        let mut warnings = Vec::new();
        let mut resources = Vec::new();
        self.scan_resources_dir(&resources_path, &mut resources, &mut warnings, 0);

        let framework = self.detect_framework(&resources);

        Ok(ScanResult {
            framework,
            resources,
            scanned_at: chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, false),
            warnings,
        })
    }

    fn scan_resources_dir(
        &self,
        dir: &Path,
        resources: &mut Vec<ScannedResource>,
        warnings: &mut Vec<String>,
        depth: usize,
    ) {
        if depth > 6 {
            return;
        }

        let entries = match fs::read_dir(dir) {
            Ok(e) => e,
            Err(_) => return,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let name = entry.file_name().to_string_lossy().to_string();

            // Skip hidden or system folders
            if name.starts_with('.') {
                continue;
            }

            let fxmanifest = path.join("fxmanifest.lua");
            let legacy_manifest = path.join("__resource.lua");

            let manifest_file = if fxmanifest.exists() {
                Some(fxmanifest)
            } else if legacy_manifest.exists() {
                Some(legacy_manifest)
            } else {
                None
            };

            if let Some(man_path) = manifest_file {
                let manifest_content = fs::read_to_string(&man_path).unwrap_or_default();
                let manifest = self.parse_manifest(&manifest_content, &name, &man_path);
                let files = self.get_resource_files(&path);

                let relative_path = path
                    .strip_prefix(&self.root_path)
                    .map(|p| p.to_string_lossy().replace('\\', "/"))
                    .unwrap_or_else(|_| name.clone());

                let manifest_rel_path = man_path
                    .strip_prefix(&self.root_path)
                    .map(|p| p.to_string_lossy().replace('\\', "/"))
                    .unwrap_or_else(|_| format!("{}/fxmanifest.lua", relative_path));

                resources.push(ScannedResource {
                    name,
                    relative_path,
                    manifest_path: manifest_rel_path,
                    manifest,
                    files,
                });
            } else {
                // Category or group folder (e.g. [qb], [standalone], [voice])
                self.scan_resources_dir(&path, resources, warnings, depth + 1);
            }
        }
    }

    fn get_resource_files(&self, resource_path: &Path) -> Vec<String> {
        let mut files = Vec::new();
        self.walk_resource_files(resource_path, resource_path, &mut files, 0);
        files
    }

    fn walk_resource_files(&self, base: &Path, current: &Path, files: &mut Vec<String>, depth: usize) {
        if depth > 10 {
            return;
        }

        if let Ok(entries) = fs::read_dir(current) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();

                if name.starts_with('.') || name == "node_modules" || name == ".git" {
                    continue;
                }

                if path.is_dir() {
                    self.walk_resource_files(base, &path, files, depth + 1);
                } else if path.is_file() {
                    if let Ok(rel) = path.strip_prefix(base) {
                        files.push(rel.to_string_lossy().replace('\\', "/"));
                    }
                }
            }
        }
    }

    fn parse_manifest(&self, content: &str, folder_name: &str, _path: &Path) -> ResourceManifest {
        let cleaned = self.strip_comments(content);

        let mut manifest = ResourceManifest {
            name: folder_name.to_string(),
            version: None,
            description: None,
            dependencies: Vec::new(),
            provides: Vec::new(),
            client_scripts: Vec::new(),
            server_scripts: Vec::new(),
            shared_scripts: Vec::new(),
            files: Vec::new(),
            data_files: Vec::new(),
            exports: Vec::new(),
            server_exports: Vec::new(),
            server_only: cleaned.contains("server_only 'yes'") || cleaned.contains("server_only \"yes\"") || cleaned.contains("server_only true"),
            client_only: cleaned.contains("client_only 'yes'") || cleaned.contains("client_only \"yes\"") || cleaned.contains("client_only true"),
        };

        // Extract description
        if let Some(desc) = self.extract_single_string(&cleaned, "description") {
            manifest.description = Some(desc);
        }

        // Extract version
        if let Some(ver) = self.extract_single_string(&cleaned, "version") {
            manifest.version = Some(ver);
        }

        // Extract dependencies
        let mut deps = self.extract_strings(&cleaned, "dependency");
        deps.extend(self.extract_strings(&cleaned, "dependencies"));
        deps.dedup();
        manifest.dependencies = deps;

        // Extract scripts
        let mut client_s = self.extract_strings(&cleaned, "client_script");
        client_s.extend(self.extract_strings(&cleaned, "client_scripts"));
        manifest.client_scripts = client_s;

        let mut server_s = self.extract_strings(&cleaned, "server_script");
        server_s.extend(self.extract_strings(&cleaned, "server_scripts"));
        manifest.server_scripts = server_s;

        let mut shared_s = self.extract_strings(&cleaned, "shared_script");
        shared_s.extend(self.extract_strings(&cleaned, "shared_scripts"));
        manifest.shared_scripts = shared_s;

        let mut files = self.extract_strings(&cleaned, "file");
        files.extend(self.extract_strings(&cleaned, "files"));
        manifest.files = files;

        let mut data_f = self.extract_strings(&cleaned, "data_file");
        data_f.extend(self.extract_strings(&cleaned, "data_files"));
        manifest.data_files = data_f;

        manifest
    }

    fn strip_comments(&self, content: &str) -> String {
        let mut result = String::new();
        let mut in_block_comment = false;

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("--[[") {
                in_block_comment = true;
                continue;
            }
            if in_block_comment {
                if trimmed.contains("]]") {
                    in_block_comment = false;
                }
                continue;
            }
            if let Some(idx) = line.find("--") {
                result.push_str(&line[..idx]);
            } else {
                result.push_str(line);
            }
            result.push('\n');
        }

        result
    }

    fn extract_single_string(&self, content: &str, key: &str) -> Option<String> {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with(key) {
                if let Some(start_q) = trimmed.find('\'') {
                    if let Some(end_q) = trimmed[start_q + 1..].find('\'') {
                        return Some(trimmed[start_q + 1..start_q + 1 + end_q].to_string());
                    }
                }
                if let Some(start_q) = trimmed.find('"') {
                    if let Some(end_q) = trimmed[start_q + 1..].find('"') {
                        return Some(trimmed[start_q + 1..start_q + 1 + end_q].to_string());
                    }
                }
            }
        }
        None
    }

    fn extract_strings(&self, content: &str, key: &str) -> Vec<String> {
        let mut results = Vec::new();

        for line in content.lines() {
            let trimmed = line.trim();
            if !trimmed.starts_with(key) {
                continue;
            }

            // Extract all quoted strings from this line
            let mut chars = trimmed.char_indices();
            let mut quote_char: Option<char> = None;
            let mut start_idx = 0;

            while let Some((idx, ch)) = chars.next() {
                if ch == '\'' || ch == '"' {
                    if let Some(q) = quote_char {
                        if q == ch {
                            let str_val = &trimmed[start_idx..idx];
                            if !str_val.is_empty() {
                                results.push(str_val.to_string());
                            }
                            quote_char = None;
                        }
                    } else {
                        quote_char = Some(ch);
                        start_idx = idx + 1;
                    }
                }
            }
        }

        results
    }

    fn detect_framework(&self, resources: &[ScannedResource]) -> String {
        let mut names: Vec<String> = resources.iter().map(|r| r.name.to_lowercase()).collect();
        for r in resources {
            for dep in &r.manifest.dependencies {
                names.push(dep.to_lowercase());
            }
        }

        if names.iter().any(|n| n.contains("qb-core") || n.contains("qbcore") || n == "qb-core") {
            return "qbcore".to_string();
        }
        if names.iter().any(|n| n.contains("es_extended") || n.contains("esx") || n == "es_extended") {
            return "esx".to_string();
        }
        if names.iter().any(|n| n.contains("qbx_core") || n.contains("qbx-core") || n.contains("ox_lib")) {
            return "standalone".to_string();
        }
        if names.iter().any(|n| n.contains("vrp")) {
            return "vrp".to_string();
        }

        "unknown".to_string()
    }
}
