use std::path::PathBuf;
use std::fs;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceInfo {
    pub name: String,
    pub path: String,
    pub manifest_path: String,
    pub dependencies: Vec<String>,
    pub provides: Vec<String>,
    pub files: Vec<String>,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub server_id: String,
    pub framework: String,
    pub resources: Vec<ResourceInfo>,
    pub scanned_at: i64,
}

pub struct Scanner {
    server_path: PathBuf,
}

impl Scanner {
    pub fn new(server_path: PathBuf) -> Self {
        Self { server_path }
    }

    pub fn scan_all(&self) -> Result<ScanResult, String> {
        let resources = self.scan_resources()?;
        let framework = self.detect_framework(&resources);
        
        Ok(ScanResult {
            server_id: String::new(),
            framework,
            resources,
            scanned_at: chrono::Utc::now().timestamp(),
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

        for entry in fs::read_dir(&resources_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let dir_path = entry.path();
            
            if !dir_path.is_dir() {
                continue;
            }

            let manifest_path = dir_path.join("fxmanifest.lua");
            if !manifest_path.exists() {
                continue;
            }

            let resource_name = dir_path.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            let manifest_content = fs::read_to_string(&manifest_path)
                .map_err(|e| format!("Failed to read {}: {}", resource_name, e))?;

            let (dependencies, provides, files, metadata) = self.parse_manifest(&resource_name, &manifest_content);

            resources.push(ResourceInfo {
                name: resource_name.clone(),
                path: dir_path.strip_prefix(&self.server_path)
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default(),
                manifest_path: "resources/".to_string() + &resource_name + "/fxmanifest.lua",
                dependencies,
                provides,
                files,
                metadata,
            });
        }

        Ok(resources)
    }

    fn parse_manifest(
        &self,
        resource_name: &str,
        content: &str,
    ) -> (Vec<String>, Vec<String>, Vec<String>, serde_json::Value) {
        let mut dependencies = Vec::new();
        let mut provides = Vec::new();
        let mut files = Vec::new();
        let mut metadata = serde_json::json!({});

        for line in content.lines() {
            let line = line.trim();
            
            // Skip comments
            if line.starts_with('--') {
                continue;
            }

            // Parse dependencies
            if line.starts_with("dependencies") {
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
                || line.starts_with("server_scripts") || line.starts_with("shared_scripts") {
                if let Some(items) = self.extract_bracketed_list(line) {
                    for item in items {
                        files.push(item);
                    }
                }
            }

            // Parse version
            if line.starts_with("version") {
                if let Some(val) = self.extract_quoted_string(line) {
                    metadata = serde_json::json!({"version": val});
                }
            }
        }

        (dependencies, provides, files, metadata)
    }

    fn extract_bracketed_list(&self, line: &str) -> Option<Vec<String>> {
        let start = line.find('[')?;
        let end = line.rfind(']')?;
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

    fn detect_framework(&self, resources: &[ResourceInfo]) -> String {
        let resource_names: Vec<&str> = resources.iter().map(|r| r.name.as_str()).collect();
        let combined = resource_names.join(" ");

        if combined.contains("qb-core") || combined.contains("qbcourse") {
            return "QBCore".to_string();
        }
        if combined.contains("esx") {
            return "ESX".to_string();
        }
        if combined.contains("vrp") || combined.contains("vrp-") {
            return "vRP".to_string();
        }

        "unknown".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_qbcore() {
        let scanner = Scanner::new(PathBuf::from("/tmp/test"));
        let resources = vec![
            ResourceInfo {
                name: "qb-core".to_string(),
                path: "resources/qb-core".to_string(),
                manifest_path: "resources/qb-core/fxmanifest.lua".to_string(),
                dependencies: vec![],
                provides: vec![],
                files: vec![],
                metadata: serde_json::json!({}),
            },
        ];
        assert_eq!(scanner.detect_framework(&resources), "QBCore");
    }

    #[test]
    fn test_detect_esx() {
        let scanner = Scanner::new(PathBuf::from("/tmp/test"));
        let resources = vec![
            ResourceInfo {
                name: "es_extended".to_string(),
                path: "resources/es_extended".to_string(),
                manifest_path: "resources/es_extended/fxmanifest.lua".to_string(),
                dependencies: vec![],
                provides: vec![],
                files: vec![],
                metadata: serde_json::json!({}),
            },
        ];
        assert_eq!(scanner.detect_framework(&resources), "ESX");
    }
}