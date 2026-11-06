'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, GitBranch, ScanSearch, Plus, Sparkles, X, Terminal, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type NoxesProject = {
  id: string;
  name: string;
  audience: string;
  description: string;
  longDescription: string;
  href: string;
  stage: string;
  highlights: string[];
  metrics: { label: string; value: string }[];
  architecture: string[];
};

export const NOXES_PROJECTS: NoxesProject[] = [
  {
    id: 'fivem',
    name: 'NOXES for FiveM',
    audience: 'For FiveM server owners',
    description: 'An AI-assisted workspace for understanding server resources and proposing changes you can review before they are applied.',
    longDescription: 'NOXES for FiveM connects directly to your server runtime, parsing fxmanifest.lua resources and applying surgical Lua patches with automated git checkpoints and safety validation.',
    href: '/dashboard',
    stage: 'Flagship project',
    highlights: ['Resource-aware assistance', 'Review before apply', 'Git checkpoints'],
    metrics: [
      { label: 'Latency', value: '< 40ms' },
      { label: 'Safety', value: '100% Verified' },
      { label: 'Runtime', value: 'Node + Lua' },
    ],
    architecture: ['Fastify Orchestrator', 'WebSocket Daemon', 'PostgreSQL Audit Log'],
  },
  {
    id: 'nexus',
    name: 'NOXES Nexus',
    audience: 'For Studio Architects',
    description: 'Multi-server orchestrator dashboard unifying distributed game nodes and automated pipeline deployments.',
    longDescription: 'Unified cluster management for high-availability game infrastructure. Monitor FPS, resource count, player capacity, and agent heartbeat in real-time.',
    href: '/projects/nexus',
    stage: 'Beta preview',
    highlights: ['Multi-node cluster view', 'Instant failover', 'Automated rollbacks'],
    metrics: [
      { label: 'Nodes', value: 'Unlimited' },
      { label: 'Uptime', value: '99.99%' },
      { label: 'Sync', value: 'Real-time' },
    ],
    architecture: ['Distributed Mesh', 'Zero-trust Auth', 'Encrypted State'],
  },
];

export default function Projects() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<NoxesProject | null>(null);
  const [addingModal, setAddingModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectsList, setProjectsList] = useState<NoxesProject[]>(NOXES_PROJECTS);

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const newProj: NoxesProject = {
      id: newProjectName.toLowerCase().replace(/\s+/g, '-'),
      name: newProjectName,
      audience: 'Custom Creator Ecosystem',
      description: 'Newly authored workspace initialized for custom resource management and AI assistance.',
      longDescription: 'Custom ecosystem sandbox with automated agent hooks and secure telemetry streams.',
      href: '/dashboard',
      stage: 'Authoring',
      highlights: ['Custom Runtime', 'Agent Hook', 'Secure Stream'],
      metrics: [{ label: 'Status', value: 'Active' }, { label: 'Auth', value: 'Clerk JWT' }],
      architecture: ['Custom Daemon', 'Secure WebSockets'],
    };
    setProjectsList([...projectsList, newProj]);
    setNewProjectName('');
    setAddingModal(false);
  };

  return (
    <section id="projects" className="border-t border-[#414548] bg-[#111315] py-24 md:py-32 relative overflow-hidden" aria-labelledby="projects-heading">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="brand-eyebrow">Studio Portfolio</p>
            <h2 id="projects-heading" className="brand-display mt-5 text-4xl font-black uppercase tracking-tight text-[#F4F1E9] md:text-6xl">
              One studio. Many worlds to author.
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <p className="max-w-md text-sm leading-relaxed text-[#B6B0A4] md:text-base">
              NOXES is an umbrella for creator-centric systems. Explore live projects or author a new ecosystem below.
            </p>
            <button
              onClick={() => setAddingModal(true)}
              className="flex-shrink-0 flex items-center gap-2 rounded-sm bg-[#E83708] px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-[#F4F1E9] transition-all hover:bg-[#d43106]"
            >
              <Plus className="w-4 h-4" /> Add Project
            </button>
          </div>
        </div>

        {/* Cinematic Card Grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 group/list">
          {projectsList.map((project) => {
            const isHovered = hoveredId === project.id;
            const isAnyHovered = hoveredId !== null;
            const isDimmed = isAnyHovered && !isHovered;

            return (
              <motion.article
                key={project.id}
                onMouseEnter={() => setHoveredId(project.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedProject(project)}
                animate={{
                  opacity: isDimmed ? 0.35 : 1,
                  scale: isHovered ? 1.02 : 1,
                }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className={`relative cursor-pointer overflow-hidden rounded-sm border p-7 md:p-9 transition-colors duration-300 ${
                  isHovered
                    ? 'border-[#E83708] bg-[#1a1c20] shadow-[0_0_30px_rgba(232,55,8,0.15)]'
                    : 'border-[#414548] bg-[#202326]'
                }`}
              >
                <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border border-[#414548]/40 bg-[#E83708]/[0.03]" />
                <div className="relative flex items-start justify-between gap-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#414548] bg-[#181A1D]">
                    <img src="/brand/noxes-symbol.svg" alt="" aria-hidden="true" className="h-7 w-7" />
                  </div>
                  <span className="rounded-sm border border-[#E83708]/30 bg-[#E83708]/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#E83708]">
                    {project.stage}
                  </span>
                </div>

                <div className="relative mt-8">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#68665F]">{project.audience}</p>
                  <h3 className="brand-display mt-2 text-3xl font-bold uppercase tracking-tight text-[#F4F1E9] md:text-4xl">{project.name}</h3>
                  <p className="mt-3.5 max-w-xl text-sm leading-relaxed text-[#B6B0A4] md:text-base">{project.description}</p>
                </div>

                <ul className="relative mt-6 grid gap-2 sm:grid-cols-3">
                  {project.highlights.map((highlight, index) => (
                    <li key={highlight} className="flex items-start gap-2 text-xs leading-relaxed text-[#F4F1E9]/80">
                      <span className="mt-0.5 text-[#E83708]">
                        {index === 0 ? <ScanSearch aria-hidden="true" className="h-3.5 w-3.5" /> : index === 1 ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <GitBranch aria-hidden="true" className="h-3.5 w-3.5" />}
                      </span>
                      {highlight}
                    </li>
                  ))}
                </ul>

                <div className="relative mt-8 flex items-center justify-between border-t border-[#414548]/50 pt-5">
                  <span className="font-mono text-xs text-[#68665F]">Click card for details & telemetry</span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#E83708] font-bold">
                    Inspect Workspace <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </div>
              </motion.article>
            );
          })}

          {/* Add New Project Card */}
          <div
            onClick={() => setAddingModal(true)}
            className="flex min-h-[320px] cursor-pointer flex-col justify-between rounded-sm border border-dashed border-[#414548] bg-[#181A1D]/60 p-7 md:p-9 transition-colors hover:border-[#E83708] hover:bg-[#181A1D]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-sm border border-[#414548] bg-[#202326] text-xl font-light text-[#E83708]" aria-hidden="true">+</span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#68665F]">Future Offerings</p>
              <h3 className="brand-display mt-2 text-2xl font-bold uppercase tracking-tight text-[#F4F1E9]">Author a new ecosystem.</h3>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[#B6B0A4]">
                Click to initialize a new project workspace. Seamlessly scaffolded with secure orchestrator hooks and automated checkpoints.
              </p>
            </div>
            <div className="font-mono text-xs text-[#E83708] flex items-center gap-1.5 font-bold">
              <Plus className="w-3.5 h-3.5" /> Create Project Workspace
            </div>
          </div>
        </div>
      </div>

      {/* Project Details Modal Drawer */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl rounded-sm border border-[#414548] bg-[#181A1D] p-8 text-[#F4F1E9] shadow-2xl"
            >
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-6 right-6 text-[#68665F] hover:text-[#F4F1E9] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-3 font-mono text-xs text-[#E83708] uppercase tracking-widest">
                <Sparkles className="w-4 h-4" /> {selectedProject.stage}
              </div>

              <h3 className="brand-display mt-3 text-3xl font-bold uppercase tracking-tight">{selectedProject.name}</h3>
              <p className="mt-2 font-mono text-xs text-[#68665F]">{selectedProject.audience}</p>

              <p className="mt-6 text-sm leading-relaxed text-[#B6B0A4]">{selectedProject.longDescription}</p>

              {/* Metrics grid */}
              <div className="mt-8 grid grid-cols-3 gap-4 border-y border-[#414548] py-5">
                {selectedProject.metrics.map((metric) => (
                  <div key={metric.label} className="bg-[#202326] p-3 rounded-sm border border-[#414548]/60">
                    <p className="font-mono text-[10px] uppercase text-[#68665F]">{metric.label}</p>
                    <p className="mt-1 font-mono text-sm font-bold text-[#F4F1E9]">{metric.value}</p>
                  </div>
                ))}
              </div>

              {/* Architecture stack */}
              <div className="mt-6">
                <p className="font-mono text-xs uppercase tracking-wider text-[#F4F1E9]">Architecture Stack</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedProject.architecture.map((item) => (
                    <span key={item} className="rounded-sm border border-[#414548] bg-[#202326] px-3 py-1 font-mono text-xs text-[#B6B0A4]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-4">
                <button
                  onClick={() => setSelectedProject(null)}
                  className="rounded-sm border border-[#414548] px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-[#B6B0A4] hover:text-[#F4F1E9]"
                >
                  Close
                </button>
                <Link
                  href={selectedProject.href}
                  className="rounded-sm bg-[#E83708] px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-[#F4F1E9] hover:bg-[#d43106]"
                >
                  Launch Workspace
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Project Modal */}
      <AnimatePresence>
        {addingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-sm border border-[#414548] bg-[#181A1D] p-7 text-[#F4F1E9]"
            >
              <button
                onClick={() => setAddingModal(false)}
                className="absolute top-5 right-5 text-[#68665F] hover:text-[#F4F1E9]"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="brand-display text-2xl font-bold uppercase tracking-tight">Create Project Workspace</h3>
              <p className="mt-2 text-xs font-mono text-[#68665F]">Initialize a new creator ecosystem in the studio.</p>

              <form onSubmit={handleAddProject} className="mt-6 space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#B6B0A4] mb-2">Project Name</label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. NOXES RP Server Alpha"
                    className="w-full rounded-sm border border-[#414548] bg-[#202326] px-4 py-3 font-mono text-xs text-[#F4F1E9] focus:border-[#E83708] focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setAddingModal(false)}
                    className="rounded-sm border border-[#414548] px-4 py-2 font-mono text-xs uppercase tracking-wider text-[#B6B0A4]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-sm bg-[#E83708] px-5 py-2 font-mono text-xs uppercase tracking-wider text-[#F4F1E9] hover:bg-[#d43106]"
                  >
                    Initialize Project
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
