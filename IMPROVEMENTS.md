# Phase 1 Improvements Plan

## 1. Skills System (High Impact)

### What It Is
Modular, reusable prompts + tools for common FiveM tasks. Instead of one generic AI, give it specialized "skills" it can activate based on context.

### Skills to Build

| Skill | Purpose | Tools | Example Prompt |
|-------|---------|-------|----------------|
| **config-edit** | Edit config files | read_file, propose_write | "I'll read the config first, then propose changes to these settings..." |
| **vehicle-handler** | Edit vehicle handling | read_file, propose_write | "Let me check vehicles.meta and handling.meta before suggesting changes..." |
| **npc-spawner** | Add NPCs/peds | read_file, propose_write | "I'll create a new spawn point in the appropriate script..." |
| **ui-customizer** | Edit HUD/UI | read_file, propose_write | "I'll check the HUD config and propose color/position changes..." |
| **error-fixer** | Fix console errors | read_file, grep | "Let me analyze this error and find the root cause..." |
| **resource-installer** | Install new resources | unzip, copy, manifest_check | "I'll validate the resource and check for conflicts..." |
| **dependency-checker** | Check resource dependencies | read_manifest, graph_analysis | "Let me check if removing this will break other resources..." |

### Implementation
```typescript
// skills/config-edit.ts
export const configEditSkill: Skill = {
  name: 'config-edit',
  description: 'Safely edit FiveM config files',
  trigger: ['config', 'settings', 'options', 'edit'],
  systemPrompt: `You are a FiveM config specialist. 
  Always read the file first. Propose minimal changes.
  Explain what each change does.`,
  tools: ['read_remote_file', 'propose_remote_write'],
  maxTokens: 2000,
};
```

---

## 2. Better Instructions/Prompts (High Impact)

### Context-Aware System Prompts

Instead of one generic prompt, create prompts based on:

**By Framework:**
- QBCore: "You know QBCore conventions. Config is in config.lua, UI in client.lua..."
- vRP: "vRP has different structure. Check vrp/ resources..."
- ESX: "ESX uses esx_ prefix. Look for es_extended..."

**By Task Type:**
- Debugging: "Focus on error patterns, common fixes, console analysis..."
- Configuration: "Be conservative, explain each change, suggest backups..."
- Creation: "Follow FiveM best practices, check for conflicts..."

**By User Level:**
- Beginner: "Explain concepts, show full examples, be patient..."
- Advanced: "Be concise, assume knowledge, focus on efficiency..."

### Implementation
```typescript
// prompts/framework.ts
export function getFrameworkPrompt(framework: string): string {
  const prompts = {
    qbcore: `You are a QBCore expert. 
    - Config files: resources/[qb]/qb-core/config.lua
    - UI files: resources/[qb]/qb-hud/client.lua
    - Common patterns: exports['qb-core'], TriggerEvent('qb-core:...)
    - Known issues: inventory conflicts, script delays`,
    // ...
  };
  return prompts[framework] || prompts.default;
}
```

---

## 3. AI Improvements (Medium-High Impact)

### RAG (Retrieval Augmented Generation)
Store knowledge about FiveM resources and retrieve relevant info:

```typescript
// Store knowledge base
const knowledgeBase = {
  'qb-core': {
    'config.lua': 'Main configuration file for QBCore',
    'client.lua': 'Client-side scripts',
    'shared.lua': 'Shared variables and exports',
    commonIssues: ['inventory not loading', 'player not spawning'],
    commonFixes: ['check dependencies', 'verify config paths']
  }
};

// When user asks about qb-core, retrieve relevant context
async function getRelevantContext(resource: string): Promise<string> {
  return knowledgeBase[resource] || '';
}
```

### Few-Shot Examples
Show the AI examples of good responses:

```typescript
const examples = [
  {
    input: "Change my HUD color to blue",
    output: "I'll read the current HUD config first...\n\n```propose\nfile: resources/[qb]/qb-hud/config.lua\nreason: Change primary color from red to blue\n```\n\nDiff preview:\n- primaryColor: \"#ff0000\"\n+ primaryColor: \"#0066ff\"",
  }
];
```

### Tool Calling Improvements
- Better structured outputs (JSON schema validation)
- Fallback strategies (if tool fails, try alternative)
- Rate limiting (don't spam API calls)

---

## 4. App Improvements (High Impact)

### Real-Time Collaboration
- Multiple users can see the same server state
- Live cursor/selection sharing (for debugging together)
- Comment system on changes

### Version History
- Visual timeline of all changes
- Compare any two versions
- Branch and merge (like git for FiveM configs)

### Templates Gallery
- Pre-built configurations for common setups
- One-click apply templates
- Community-contributed templates

### Error Detection
- Analyze console logs for common errors
- Suggest fixes automatically
- Predict potential issues before apply

### Smart Suggestions
- "You have 12 resources with config changes - want to review all?"
- "This change might conflict with qb-inventory"
- "Based on your server, I recommend these 3 optimizations"

---

## 5. Website Improvements (Medium Impact)

### Interactive Tutorial
- Walk through first server setup
- Show the pairing flow
- Demonstrate a chat + apply cycle
- Let users try without installing

### Documentation
- searchable knowledge base
- API reference
- Troubleshooting guides
- Video tutorials

### Showcase/Examples
- Demo servers users can try
- Before/after of common changes
- Community highlights

### Onboarding Flow
- Guided setup wizard
- Skip optional steps
- Progress tracking
- Quick start vs deep dive modes

---

## 6. Agent Improvements (High Impact)

### Local Caching
- Cache file reads (don't re-read same file)
- Cache scan results (re-scan only when changed)
- Smart invalidation (know when cache is stale)

### Better File Discovery
- Index all config files on scan
- Full-text search across resources
- Dependency graph visualization

### Automated Testing
- Syntax check Lua files before apply
- Test config loading in sandbox
- Validate manifest files

### Performance
- Parallel file reads
- Compression for large files
- Streaming responses for large diffs

---

## 7. Security Improvements (Medium Impact)

### Enhanced Path Validation
- Block sensitive paths (system32, Windows, etc.)
- Allowlist mode (only specific directories)
- Symlink attack prevention

### Audit Enhancements
- Detailed change history
- User activity logging
- Anomaly detection (unusual access patterns)

### Rate Limiting
- Per-user rate limits
- Per-server rate limits
- Burst protection

---

## Implementation Priority

### Phase 1.5 (Quick Wins - 1-2 weeks)
1. ✅ Skills system (config-edit, vehicle-handler)
2. ✅ Context-aware prompts
3. ✅ Better error messages
4. ✅ Version history UI

### Phase 1.6 (Medium - 2-4 weeks)
5. ✅ RAG knowledge base
6. ✅ Templates gallery
7. ✅ Error detection
8. ✅ Real-time collaboration

### Phase 2 (Advanced - 1-2 months)
9. ✅ Local caching
10. ✅ Dependency graph visualization
11. ✅ Automated testing
12. ✅ Advanced security features

---

## Technical Architecture for Improvements

```
┌─────────────────────────────────────────────────────┐
│  WEB DASHBOARD (Next.js)                            │
│  ├── Skills Selector UI                             │
│  ├── Template Gallery                               │
│  ├── Version History Timeline                        │
│  ├── Real-time Collaboration                        │
│  └── Error Detection Dashboard                      │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│  ORCHESTRATOR (Fastify)                             │
│  ├── Skill Router (selects best skill for task)     │
│  ├── Prompt Generator (context-aware prompts)       │
│  ├── RAG Engine (retrieves relevant knowledge)      │
│  ├── Version Manager (tracks all changes)           │
│  └── Error Analyzer (detects common issues)         │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│  AGENT (Desktop)                                    │
│  ├── Local Cache (file metadata, scan results)      │
│  ├── File Indexer (full-text search)                │
│  ├── Dependency Analyzer (resource graph)           │
│  └── Syntax Validator (Lua, manifest)               │
└─────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Start with Skills System** - Highest impact, relatively simple
2. **Add Context-Aware Prompts** - Improves AI responses immediately
3. **Build Version History** - Critical for trust and rollback
4. **Implement RAG** - Makes AI smarter over time
5. **Add Templates** - Reduces friction for common tasks

Want me to implement any of these?
