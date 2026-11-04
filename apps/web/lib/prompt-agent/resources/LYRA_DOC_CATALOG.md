# LYRA Documentation Catalog (Knowledge File)

Reference for Lyra when designing a documentation package. These are examples, not a checklist. Select only what the project actually needs.

## 1. Documentation Analysis (do before generating)
1. Understand the full project: type, size, target AI, environment.
2. Decide what must persist across sessions.
3. List the systems, features, and workflows involved.
4. Pick categories, then files. Note dependencies between files.
5. Drop anything unnecessary or duplicated.

## 2. Categories and Examples

| Category | Examples | Purpose |
|---|---|---|
| Agent instructions | AGENTS.md, CLAUDE.md, GEMINI.md, AI_WORKFLOW.md | How the AI behaves and follows project rules |
| Project context | README.md, PROJECT_BRIEF.md, CONSTRAINTS.md | What the project is and why it exists |
| Requirements | REQUIREMENTS.md, USER_STORIES.md, ACCEPTANCE_CRITERIA.md | What must be built and how success is measured |
| Architecture | SYSTEM_ARCHITECTURE.md, DATABASE_SCHEMA.md, API_SPECIFICATION.md | How components are structured and interact |
| Design / UX | DESIGN_SYSTEM.md, USER_FLOWS.md, ACCESSIBILITY.md | Visual and interaction consistency |
| System specs (project-specific only) | AUTHENTICATION_SYSTEM.md, PAYMENT_SYSTEM.md, AI_SYSTEM.md | Detailed requirements per actual feature |
| Development standards | CODING_STANDARDS.md, ERROR_HANDLING.md, DEPENDENCY_POLICY.md | Consistent, maintainable implementation |
| Testing / QA | TESTING_STRATEGY.md, TEST_PLAN.md, DEBUGGING_GUIDE.md | Make the AI validate its work |
| Planning / continuity | ROADMAP.md, TASK_BACKLOG.md, PROJECT_STATUS.md, DECISIONS.md, OPEN_QUESTIONS.md, SESSION_HANDOFF.md | Preserve context across sessions |
| Deployment / ops | DEVELOPMENT_SETUP.md, DEPLOYMENT_GUIDE.md, RELEASE_CHECKLIST.md | Configure, build, deploy, maintain |

## 3. Example Folder Structure (adapt, do not copy blindly)

```
project/
├── AGENTS.md              (or CLAUDE.md / GEMINI.md, see platform facts)
├── README.md
├── DOCUMENTATION_INDEX.md
├── project/        PROJECT_BRIEF.md, PROJECT_SCOPE.md
├── requirements/   REQUIREMENTS.md, ACCEPTANCE_CRITERIA.md
├── architecture/   SYSTEM_ARCHITECTURE.md, DATABASE_SCHEMA.md, API_SPECIFICATION.md
├── design/         DESIGN_SYSTEM.md, UI_UX_GUIDELINES.md
├── systems/        [PROJECT_SPECIFIC_SYSTEMS].md
├── standards/      CODING_STANDARDS.md
├── testing/        TESTING_STRATEGY.md
└── planning/       ROADMAP.md, TASK_BACKLOG.md, PROJECT_STATUS.md, DECISIONS.md, OPEN_QUESTIONS.md
```

## 4. Every Generated File Must Have
- A descriptive filename, a title, and a one-line purpose.
- A priority label: Essential, Recommended, or Optional.
- A "Depends on" line listing related files.
- Separate sections for **Confirmed** decisions and **Assumptions**.
- Concrete, actionable content: requirements, constraints, schemas, examples, acceptance criteria where relevant.
- Consistent terminology with the other files and the optimized prompt.
- No filler and no repetition of content that lives in another file.

## 5. File Template

```
# [Title]
**Purpose:** [one line]
**Priority:** Essential | Recommended | Optional
**Depends on:** [files]

## Confirmed
- ...

## Assumptions (change if wrong)
- ...

## Details
...

## Open Questions
- ...
```

## 6. Extra Requirements for Agent Projects
Explicitly define, in AGENTS.md or a dedicated file:
- Agent responsibilities
- Available tools and permissions
- Execution workflow
- Decision-making boundaries
- Actions that need human approval
- Error handling and recovery
- Output requirements
- Verification procedure

## 7. DOCUMENTATION_INDEX.md Must Contain
Every file, its purpose, its priority, which agent or workflow uses it, its dependencies, and the recommended reading order.
