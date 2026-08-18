import * as fs from 'fs/promises';
import * as path from 'path';
import { ErrorCodes, createError } from '@fivem-ai/shared';

export interface ResourceManifest {
  name: string;
  version?: string;
  description?: string;
  dependencies: string[];
  provides: string[];
  clientScripts: string[];
  serverScripts: string[];
  sharedScripts: string[];
  files: string[];
  uiPage?: string;
  dataFiles: string[];
  exports: string[];
  serverExports: string[];
  serverOnly: boolean;
  clientOnly: boolean;
}

export interface ScannedResource {
  name: string;
  relativePath: string;
  manifestPath: string;
  manifest: ResourceManifest;
  files: string[];
}

export interface ScanResult {
  framework: 'qbcore' | 'vrp' | 'esx' | 'standalone' | 'unknown';
  resources: ScannedResource[];
  scannedAt: string;
  warnings: string[];
}

/**
 * Improved Lua manifest parser with better error handling and edge case support
 */
export class ManifestParser {
  /**
   * Parse a fxmanifest.lua or __resource.lua file
   */
  static async parse(manifestPath: string): Promise<ResourceManifest> {
    const content = await fs.readFile(manifestPath, 'utf-8');
    return this.parseContent(content, manifestPath);
  }

  /**
   * Parse manifest content string
   */
  static parseContent(content: string, manifestPath?: string): ResourceManifest {
    // Remove comments
    const cleanContent = this.removeComments(content);

    const manifest: ResourceManifest = {
      name: '',
      dependencies: [],
      provides: [],
      clientScripts: [],
      serverScripts: [],
      sharedScripts: [],
      files: [],
      dataFiles: [],
      exports: [],
      serverExports: [],
      serverOnly: false,
      clientOnly: false,
    };

    // Extract name
    const nameMatch = cleanContent.match(/fx_version\s+['"]([^'"]+)['"]/i);
    if (nameMatch) {
      manifest.version = nameMatch[1];
    }

    const nameMatch2 = cleanContent.match(/name\s+['"]([^'"]+)['"]/i);
    if (nameMatch2) {
      manifest.name = nameMatch2[1];
    } else if (manifestPath) {
      // Try to extract from resource folder name as fallback
      manifest.name = path.basename(path.dirname(manifestPath));
    } else {
      manifest.name = 'unknown';
    }

    const descMatch = cleanContent.match(/description\s+['"]([^'"]+)['"]/i);
    if (descMatch) {
      manifest.description = descMatch[1];
    }

    // Extract dependencies (multiple formats)
    const deps = this.extractArray(cleanContent, 'dependency');
    const deps2 = this.extractArray(cleanContent, 'dependencies');
    manifest.dependencies = Array.from(new Set([...deps, ...deps2]));

    // Extract client scripts
    manifest.clientScripts = this.extractArray(cleanContent, 'client_script');
    manifest.clientScripts.push(...this.extractArray(cleanContent, 'client_scripts'));

    // Extract server scripts
    manifest.serverScripts = this.extractArray(cleanContent, 'server_script');
    manifest.serverScripts.push(...this.extractArray(cleanContent, 'server_scripts'));

    // Extract shared scripts
    manifest.sharedScripts = this.extractArray(cleanContent, 'shared_script');
    manifest.sharedScripts.push(...this.extractArray(cleanContent, 'shared_scripts'));

    // Extract files (generic)
    manifest.files = this.extractArray(cleanContent, 'file');
    manifest.files.push(...this.extractArray(cleanContent, 'files'));

    // Extract data files
    manifest.dataFiles = this.extractArray(cleanContent, 'data_file');
    manifest.dataFiles.push(...this.extractArray(cleanContent, 'data_files'));

    // Extract exports
    manifest.exports = this.extractArray(cleanContent, 'export');
    manifest.exports.push(...this.extractArray(cleanContent, 'exports'));

    // Extract server exports
    manifest.serverExports = this.extractArray(cleanContent, 'server_export');
    manifest.serverExports.push(...this.extractArray(cleanContent, 'server_exports'));

    // Extract provides (legacy)
    manifest.provides = this.extractArray(cleanContent, 'provide');
    manifest.provides.push(...this.extractArray(cleanContent, 'provides'));

    // Extract UI page
    const uiPageMatch = cleanContent.match(/ui_page\s+['"]([^'"]+)['"]/i);
    if (uiPageMatch) {
      manifest.uiPage = uiPageMatch[1];
    }

    // Check for server_only / client_only
    manifest.serverOnly = /server_only\s*['"]?true['"]?/i.test(cleanContent);
    manifest.clientOnly = /client_only\s*['"]?true['"]?/i.test(cleanContent);

    return manifest;
  }

  /**
   * Extract array values from manifest content
   */
  private static extractArray(content: string, key: string): string[] {
    const results: string[] = [];

    // Pattern 1: key 'value' or key "value" (single)
    const singlePattern = new RegExp(`${key}\\s+['"]([^'"]+)['"]`, 'gi');
    let match;
    while ((match = singlePattern.exec(content)) !== null) {
      results.push(match[1]);
    }

    // Pattern 2: key { 'value1', 'value2' } (table)
    const tablePattern = new RegExp(`${key}\\s*\\{([^}]+)\\}`, 'gi');
    while ((match = tablePattern.exec(content)) !== null) {
      const tableContent = match[1];
      // Extract quoted strings from table
      const itemPattern = /['"]([^'"]+)['"]/g;
      let itemMatch;
      while ((itemMatch = itemPattern.exec(tableContent)) !== null) {
        results.push(itemMatch[1]);
      }
    }

    // Pattern 3: key 'value1', 'value2' (comma-separated) - FIXED
    const commaPattern = new RegExp(`${key}\\s+(['\"][^'\"]+['\"])(?:\\s*,\\s*['\"][^'\"]+['\"])*`, 'gi');
    while ((match = commaPattern.exec(content)) !== null) {
      const itemPattern = /['"]([^'"]+)['"]/g;
      let itemMatch;
      while ((itemMatch = itemPattern.exec(match[1])) !== null) {
        results.push(itemMatch[1]);
      }
    }

    return Array.from(new Set(results)); // Deduplicate
  }

  /**
   * Remove Lua comments from content
   */
  private static removeComments(content: string): string {
    // Remove block comments (--[[ ... ]])
    let cleaned = content.replace(/--\[\[[\s\S]*?\]\]/g, '');
    // Remove line comments (-- ...)
    cleaned = cleaned.replace(/--.*$/gm, '');
    return cleaned;
  }
}

/**
 * Enhanced scanner with better manifest parsing
 */
export class Scanner {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
  }

  async scanAll(): Promise<ScanResult> {
    const resourcesPath = path.join(this.rootPath, 'resources');
    const warnings: string[] = [];

    // Check if resources directory exists
    try {
      await fs.access(resourcesPath);
    } catch {
      throw createError(
        ErrorCodes.PATH_NOT_FOUND,
        'Resources directory not found. Is this a valid FXServer installation?'
      );
    }

    // Scan resources
    const resources = await this.scanResources(resourcesPath, warnings);

    // Detect framework
    const framework = this.detectFramework(resources);

    return {
      framework,
      resources,
      scannedAt: new Date().toISOString(),
      warnings,
    };
  }

  private async scanResources(
    dir: string,
    warnings: string[],
    depth: number = 0
  ): Promise<ScannedResource[]> {
    if (depth > 5) return []; // Prevent infinite recursion

    const resources: ScannedResource[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const resourcePath = path.join(dir, entry.name);
      const manifestPath = path.join(resourcePath, 'fxmanifest.lua');
      const legacyManifestPath = path.join(resourcePath, '__resource.lua');

      let manifestFile: string | null = null;
      try {
        await fs.access(manifestPath);
        manifestFile = manifestPath;
      } catch {
        try {
          await fs.access(legacyManifestPath);
          manifestFile = legacyManifestPath;
        } catch {
          // Not a resource, might be a category folder
          const subResources = await this.scanResources(resourcePath, warnings, depth + 1);
          resources.push(...subResources);
          continue;
        }
      }

      if (!manifestFile) continue;

      try {
        const manifest = await ManifestParser.parse(manifestFile);
        const files = await this.getResourceFiles(resourcePath);

        resources.push({
          name: entry.name,
          relativePath: path.relative(this.rootPath, resourcePath),
          manifestPath: path.relative(this.rootPath, manifestFile),
          manifest,
          files,
        });
      } catch (error) {
        warnings.push(`Failed to parse manifest for ${entry.name}: ${error}`);
      }
    }

    return resources;
  }

  private async getResourceFiles(resourcePath: string): Promise<string[]> {
    const files: string[] = [];

    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          files.push(path.relative(resourcePath, fullPath));
        }
      }
    };

    await walk(resourcePath);
    return files;
  }

  private detectFramework(resources: ScannedResource[]): 'qbcore' | 'vrp' | 'esx' | 'standalone' | 'unknown' {
    const resourceNames = resources.map(r => r.name.toLowerCase());
    const allManifestDeps = resources.flatMap(r => r.manifest.dependencies.map(d => d.toLowerCase()));
    const allNames = [...resourceNames, ...allManifestDeps];

    // Check for QBCore (highest priority)
    const qbIndicators = ['qbcore', 'qb-core', 'qb-'];
    if (allNames.some(n => qbIndicators.some(i => n.includes(i)))) {
      return 'qbcore';
    }

    // Check for vRP
    const vrpIndicators = ['vrp', 'vrp-'];
    if (allNames.some(n => vrpIndicators.some(i => n.includes(i)))) {
      return 'vrp';
    }

    // Check for ESX
    const esxIndicators = ['esx', 'es_extended', 'esx-'];
    if (allNames.some(n => esxIndicators.some(i => n.includes(i)))) {
      return 'esx';
    }

    // Check for standalone frameworks
    const standaloneIndicators = ['ox_lib', 'ox-', 'qbx', 'qbx-'];
    if (allNames.some(n => standaloneIndicators.some(i => n.includes(i)))) {
      return 'standalone';
    }

    return 'unknown';
  }
}