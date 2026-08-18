import { describe, it, expect } from 'vitest';
import { ManifestParser } from './src/scanner/scanner';

describe('ManifestParser', () => {
  it('should parse a simple fxmanifest.lua', () => {
    const content = `
fx_version 'cerulean'
game 'gta5'
name 'My Resource'
description 'A test resource'
dependency 'qb-core'
client_script 'client/main.lua'
server_script 'server/main.lua'
shared_script 'shared/utils.lua'
export 'getData'
server_export 'getServerData'
    `;

    const manifest = ManifestParser.parseContent(content);

    expect(manifest.name).toBe('My Resource');
    expect(manifest.description).toBe('A test resource');
    expect(manifest.dependencies).toContain('qb-core');
    expect(manifest.clientScripts).toContain('client/main.lua');
    expect(manifest.serverScripts).toContain('server/main.lua');
    expect(manifest.sharedScripts).toContain('shared/utils.lua');
    expect(manifest.exports).toContain('getData');
    expect(manifest.serverExports).toContain('getServerData');
  });

  it('should parse table-style dependencies', () => {
    const content = `
fx_version 'cerulean'
game 'gta5'
name 'Table Resource'
dependencies {
  'qb-core',
  'ox_lib',
  'es_extended'
}
client_scripts {
  'client/main.lua',
  'client/gui.lua'
}
    `;

    const manifest = ManifestParser.parseContent(content);

    expect(manifest.dependencies).toContain('qb-core');
    expect(manifest.dependencies).toContain('ox_lib');
    expect(manifest.dependencies).toContain('es_extended');
    expect(manifest.clientScripts).toContain('client/main.lua');
    expect(manifest.clientScripts).toContain('client/gui.lua');
  });

  it('should handle legacy __resource.lua format', () => {
    const content = `
resource_manifest_version '44febabe-d386-4d18-afbe-5e627f4af937'
name 'Legacy Resource'
dependency 'es_extended'
client_script 'client.lua'
server_script 'server.lua'
    `;

    const manifest = ManifestParser.parseContent(content);

    expect(manifest.name).toBe('Legacy Resource');
    expect(manifest.dependencies).toContain('es_extended');
  });

  it('should extract UI page', () => {
    const content = `
fx_version 'cerulean'
game 'gta5'
name 'UI Resource'
ui_page 'html/index.html'
file 'html/index.html'
file 'html/style.css'
    `;

    const manifest = ManifestParser.parseContent(content);

    expect(manifest.uiPage).toBe('html/index.html');
    expect(manifest.files).toContain('html/index.html');
    expect(manifest.files).toContain('html/style.css');
  });

  it('should handle server_only and client_only flags', () => {
    const serverOnly = `
fx_version 'cerulean'
game 'gta5'
name 'Server Only'
server_only true
server_script 'server/main.lua'
    `;

    const manifest = ManifestParser.parseContent(serverOnly);
    expect(manifest.serverOnly).toBe(true);
    expect(manifest.clientOnly).toBe(false);

    const clientOnly = `
fx_version 'cerulean'
game 'gta5'
name 'Client Only'
client_only 'true'
client_script 'client/main.lua'
    `;

    const manifest2 = ManifestParser.parseContent(clientOnly);
    expect(manifest2.clientOnly).toBe(true);
    expect(manifest2.serverOnly).toBe(false);
  });

  it('should remove comments', () => {
    const content = `
-- This is a comment
fx_version 'cerulean'
game 'gta5'
name 'With Comments' -- inline comment
--[[
  block comment
  multiple lines
]]
dependency 'qb-core' -- another comment
    `;

    const manifest = ManifestParser.parseContent(content);

    expect(manifest.name).toBe('With Comments');
    expect(manifest.dependencies).toContain('qb-core');
  });

  it('should fallback to folder name when no name in manifest', () => {
    const content = `
fx_version 'cerulean'
game 'gta5'
dependency 'qb-core'
    `;

    const manifest = ManifestParser.parseContent(content, '/resources/my-resource/fxmanifest.lua');
    expect(manifest.name).toBe('my-resource');
  });

  it('should deduplicate dependencies', () => {
    const content = `
fx_version 'cerulean'
game 'gta5'
name 'Dedup Test'
dependency 'qb-core'
dependency 'qb-core'
dependencies { 'qb-core', 'ox_lib' }
    `;

    const manifest = ManifestParser.parseContent(content);

    const qbCoreCount = manifest.dependencies.filter(d => d === 'qb-core').length;
    expect(qbCoreCount).toBe(1);
  });
});