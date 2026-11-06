'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Edit3, Trash2, Save, ArrowUpRight, Shield, Copy, Check, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

type Project = {
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
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminProjects() {
  const { isSignedIn, isLoaded } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Project> & {
    highlights: string[];
    metrics: { label: string; value: string }[];
    architecture: string[];
  }>({
    name: '',
    audience: '',
    description: '',
    longDescription: '',
    stage: '',
    highlights: ['', '', ''],
    metrics: [{ label: '', value: '' }, { label: '', value: '' }],
    architecture: [''],
    href: '/dashboard',
  });

  useEffect(() => {
    if (isSignedIn) {
      fetchProjects();
    } else {
      setLoading(false);
    }
  }, [isSignedIn]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) return;

    try {
      if (isEdit && editingId) {
        // Update existing
        const res = await fetch('/api/admin/projects', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, id: editingId }),
        });

        if (res.ok) {
          toast.success('Project updated successfully');
          fetchProjects();
          onCancel();
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to update project');
        }
      } else {
        // Create new
        const res = await fetch('/api/admin/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          toast.success('Project created successfully');
          fetchProjects();
          onCancel();
          setShowModal(false);
        } else {
          const data = await res.json();
          toast.error(data.error || 'Failed to create project');
        }
      }
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save project');
    }
  };

  const handleEdit = (project: Project) => {
    setIsEdit(true);
    setEditingId(project.id);
    setFormData(project);
    setShowModal(true);
    window.scrollTo(0, 0);
  };

  const handleCreate = () => {
    setIsEdit(false);
    setEditingId(null);
    setFormData({
      name: '',
      audience: '',
      description: '',
      longDescription: '',
      stage: '',
      highlights: ['', '', ''],
      metrics: [{ label: '', value: '' }, { label: '', value: '' }],
      architecture: [''],
      href: '/dashboard',
    } as Partial<Project> & { highlights: string[]; metrics: { label: string; value: string }[]; architecture: string[] });
    setShowModal(true);
    window.scrollTo(0, 0);
  };

  const onCancel = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      name: '',
      audience: '',
      description: '',
      longDescription: '',
      stage: '',
      highlights: ['', '', ''],
      metrics: [{ label: '', value: '' }, { label: '', value: '' }],
      architecture: [''],
      href: '/dashboard',
    } as Partial<Project> & { highlights: string[]; metrics: { label: string; value: string }[]; architecture: string[] });
  };

  const confirmDelete = (id: string) => {
    setProjectToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!projectToDelete || !isSignedIn) return;

    try {
      const res = await fetch(`/api/admin/projects?id=${projectToDelete}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Project deleted successfully');
        setProjects(projects.filter((p) => p.id !== projectToDelete));
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete project');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete project');
    } finally {
      setShowDeleteModal(false);
      setProjectToDelete(null);
    }
  };

  const addHighlight = () => {
    if (formData.highlights.length < 5) {
      setFormData({ ...formData, highlights: [...formData.highlights, ''] });
    }
  };

  const removeHighlight = (index: number) => {
    const newHighlights = formData.highlights.filter((_, i) => i !== index);
    setFormData({ ...formData, highlights: newHighlights });
  };

  const addObjective = () => {
    if (formData.metrics.length < 5) {
      setFormData({ ...formData, metrics: [...formData.metrics, { label: '', value: '' }] });
    }
  };

  const removeObjective = (index: number) => {
    const newMetrics = formData.metrics.filter((_, i) => i !== index);
    setFormData({ ...formData, metrics: newMetrics });
  };

  const addArchitecture = () => {
    if (formData.architecture.length < 5) {
      setFormData({ ...formData, architecture: [...formData.architecture, ''] });
    }
  };

  const removeArchitecture = (index: number) => {
    const newArchitecture = formData.architecture.filter((_, i) => i !== index);
    setFormData({ ...formData, architecture: newArchitecture });
  };

  return (
    <div className="min-h-screen bg-[#111315] py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#F4F1E9]">Project Management</h1>
            <p className="text-[#B6B0A4] mt-1">Manage your studio portfolio</p>
          </div>
          {isSignedIn && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-sm bg-[#E83708] px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-[#F4F1E9] transition-all hover:bg-[#d43106]"
            >
              <Plus className="w-4 h-4" /> Add Project
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center text-[#B6B0A4]">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center text-[#B6B0A4] py-12">
            No projects yet. Click "Add Project" to create one.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-sm border border-[#414548] bg-[#202326] p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[#F4F1E9]">{project.name}</h3>
                    <p className="text-sm text-[#B6B0A4]">{project.audience}</p>
                  </div>
                  <span className="rounded-sm border border-[#E83708]/30 bg-[#E83708]/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#E83708]">
                    {project.stage}
                  </span>
                </div>

                <p className="mt-3 text-sm text-[#B6B0A4] line-clamp-2">{project.description}</p>

                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-[#68665F]">Created: {new Date(project.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>

                {isSignedIn && (
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(project)}
                      className="flex items-center gap-1 rounded-sm border border-[#414548] px-3 py-1.5 text-xs font-mono text-[#F4F1E9] hover:bg-[#2a2d31]"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => confirmDelete(project.id)}
                      className="flex items-center gap-1 rounded-sm border border-[#E83708]/30 px-3 py-1.5 text-xs font-mono text-[#E83708] hover:bg-[#E83708]/10"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-sm border border-[#414548] bg-[#181A1D] p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#F4F1E9]">
                  {isEdit ? 'Edit Project' : 'Create Project'}
                </h2>
                <button onClick={onCancel} className="text-[#68665F] hover:text-[#F4F1E9]">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#B6B0A4] mb-2">Project Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full rounded-sm border border-[#414548] bg-[#202326] px-4 py-2.5 font-mono text-sm text-[#F4F1E9] focus:border-[#E83708] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#B6B0A4] mb-2">Audience *</label>
                  <input
                    type="text"
                    value={formData.audience}
                    onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                    required
                    className="w-full rounded-sm border border-[#414548] bg-[#202326] px-4 py-2.5 font-mono text-sm text-[#F4F1E9] focus:border-[#E83708] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#B6B0A4] mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                    className="w-full rounded-sm border border-[#414548] bg-[#202326] px-4 py-2.5 font-mono text-sm text-[#F4F1E9] focus:border-[#E83708] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#B6B0A4] mb-2">Long Description *</label>
                  <textarea
                    value={formData.longDescription}
                    onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                    required
                    rows={5}
                    className="w-full rounded-sm border border-[#414548] bg-[#202326] px-4 py-2.5 font-mono text-sm text-[#F4F1E9] focus:border-[#E83708] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#B6B0A4] mb-2">Stage *</label>
                  <input
                    type="text"
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    required
                    className="w-full rounded-sm border border-[#414548] bg-[#202326] px-4 py-2.5 font-mono text-sm text-[#F4F1E9] focus:border-[#E83708] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#B6B0A4] mb-2">Highlights</label>
                  {formData.highlights.map((highlight, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={highlight}
                        onChange={(e) => {
                          const newHighlights = [...formData.highlights];
                          newHighlights[index] = e.target.value;
                          setFormData({ ...formData, highlights: newHighlights });
                        }}
                        placeholder={`Highlight ${index + 1}`}
                        className="flex-1 rounded-sm border border-[#414548] bg-[#202326] px-4 py-2 font-mono text-xs text-[#F4F1E9] focus:border-[#E83708] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeHighlight(index)}
                        disabled={formData.highlights.length <= 1}
                        className="rounded-sm border border-[#E83708]/30 bg-[#E83708]/10 px-3 text-[#E83708] hover:bg-[#E83708]/20"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.highlights.length < 5 && (
                    <button
                      type="button"
                      onClick={addHighlight}
                      className="mt-2 flex items-center gap-1 text-xs font-mono text-[#E83708] hover:text-[#E83708]/80"
                    >
                      <PlusCircle className="w-3 h-3" /> Add Highlight
                    </button>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#B6B0A4] mb-2">Metrics</label>
                  {formData.metrics.map((metric, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={metric.label}
                        onChange={(e) => {
                          const newMetrics = [...formData.metrics];
                          newMetrics[index] = { ...metric, label: e.target.value };
                          setFormData({ ...formData, metrics: newMetrics });
                        }}
                        placeholder="Label"
                        className="flex-1 rounded-sm border border-[#414548] bg-[#202326] px-4 py-2 font-mono text-xs text-[#F4F1E9] focus:border-[#E83708] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={metric.value}
                        onChange={(e) => {
                          const newMetrics = [...formData.metrics];
                          newMetrics[index] = { ...metric, value: e.target.value };
                          setFormData({ ...formData, metrics: newMetrics });
                        }}
                        placeholder="Value"
                        className="flex-1 rounded-sm border border-[#414548] bg-[#202326] px-4 py-2 font-mono text-xs text-[#F4F1E9] focus:border-[#E83708] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeObjective(index)}
                        disabled={formData.metrics.length <= 1}
                        className="rounded-sm border border-[#E83708]/30 bg-[#E83708]/10 px-3 text-[#E83708] hover:bg-[#E83708]/20"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.metrics.length < 5 && (
                    <button
                      type="button"
                      onClick={addObjective}
                      className="mt-2 flex items-center gap-1 text-xs font-mono text-[#E83708] hover:text-[#E83708]/80"
                    >
                      <PlusCircle className="w-3 h-3" /> Add Metric
                    </button>
                  )}
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-[#B6B0A4] mb-2">Architecture Stack</label>
                  {formData.architecture.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const newArchitecture = [...formData.architecture];
                          newArchitecture[index] = e.target.value;
                          setFormData({ ...formData, architecture: newArchitecture });
                        }}
                        placeholder={`Stack item ${index + 1}`}
                        className="flex-1 rounded-sm border border-[#414548] bg-[#202326] px-4 py-2 font-mono text-xs text-[#F4F1E9] focus:border-[#E83708] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeArchitecture(index)}
                        disabled={formData.architecture.length <= 1}
                        className="rounded-sm border border-[#E83708]/30 bg-[#E83708]/10 px-3 text-[#E83708] hover:bg-[#E83708]/20"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.architecture.length < 5 && (
                    <button
                      type="button"
                      onClick={addArchitecture}
                      className="mt-2 flex items-center gap-1 text-xs font-mono text-[#E83708] hover:text-[#E83708]/80"
                    >
                      <PlusCircle className="w-3 h-3" /> Add Architecture
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-sm border border-[#414548] px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-[#B6B0A4] hover:text-[#F4F1E9]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-sm bg-[#E83708] px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-[#F4F1E9] hover:bg-[#d43106]"
                  >
                    <Save className="w-4 h-4" /> {isEdit ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-sm border border-[#E83708] bg-[#181A1D] p-8"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-[#E83708]/30 bg-[#E83708]/10 mb-4">
                <Shield className="w-6 h-6 text-[#E83708]" />
              </div>
              <h3 className="text-xl font-bold text-[#F4F1E9] mb-2">Delete Project?</h3>
              <p className="text-[#B6B0A4] mb-6">This action cannot be undone. Are you sure you want to delete this project?</p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProjectToDelete(null);
                  }}
                  className="rounded-sm border border-[#414548] px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-[#B6B0A4] hover:text-[#F4F1E9]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-sm bg-[#E83708] px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-[#F4F1E9] hover:bg-[#d43106]"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}