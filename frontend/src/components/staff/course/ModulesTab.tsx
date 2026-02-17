"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileText,
  FolderOpen,
  Link as LinkIcon,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { courseStaff, type Course, type Module, type ModuleResource, ApiError } from "@/lib/api";
import { PdfPreviewModal } from "@/components/shared/PdfPreviewModal";
import { ConfirmModal } from "@/components/ui/Modal";
import { reportError } from "@/lib/reportError";
interface ModulesTabProps {
  course: Course;
  modules: Module[];
  onRefreshModules: () => Promise<void>;
  openCreateOnMount?: boolean;
  onConsumedOpenCreate?: () => void;
}

export function ModulesTab({
  course,
  modules,
  onRefreshModules,
  openCreateOnMount = false,
  onConsumedOpenCreate,
}: ModulesTabProps) {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPosition, setNewPosition] = useState<number>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const orderedModules = useMemo(
    () => [...modules].sort((a, b) => a.position - b.position || a.id - b.id),
    [modules]
  );

  const nextPosition = useMemo(() => {
    return orderedModules.length + 1;
  }, [orderedModules.length]);

  useEffect(() => {
    if (!showCreateModal) return;
    setNewTitle("");
    setNewPosition(nextPosition);
    setCreateError("");
  }, [showCreateModal, nextPosition]);

  useEffect(() => {
    if (!openCreateOnMount) return;
    setShowCreateModal(true);
    onConsumedOpenCreate?.();
  }, [onConsumedOpenCreate, openCreateOnMount]);

  async function createModule() {
    const title = newTitle.trim();
    if (!title) return;
    setIsCreating(true);
    setCreateError("");
    try {
      await courseStaff.createModule(course.id, { title, position: newPosition });
      await onRefreshModules();
      setShowCreateModal(false);
    } catch (err) {
      if (err instanceof ApiError) setCreateError(err.detail);
      else setCreateError("Failed to create module");
    } finally {
      setIsCreating(false);
    }
  }
 
  const toggleModule = (moduleId: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-[var(--muted-foreground)]">{modules.length} modules</p>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Module</span>
        </button>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">New module</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{course.code}</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-xl hover:bg-[var(--card)] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {createError && (
                  <div className="p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 text-sm text-[var(--secondary)]">
                    {createError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Title</label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Week 1: Basics"
                    required
                    className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Position</label>
                  <input
                    type="number"
                    value={newPosition}
                    onChange={(e) => setNewPosition(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">Suggested next position: {nextPosition}</p>
                </div>
              </div>

              <div className="p-5 border-t border-[var(--border)] flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={createModule}
                  disabled={isCreating || !newTitle.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modules List */}
      {modules.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <FolderOpen className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
          <p className="text-[var(--muted-foreground)]">No modules yet</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Create modules to organize your course content
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orderedModules.map((module, idx) => (
            <ModuleCard
              key={module.id}
              courseId={course.id}
              module={module}
              isExpanded={expandedModules.has(module.id)}
              onToggle={() => toggleModule(module.id)}
              onChanged={onRefreshModules}
              canMoveUp={idx > 0}
              canMoveDown={idx < orderedModules.length - 1}
              onMoveUp={async () => {
                if (idx <= 0) return;
                await courseStaff.updateModule(course.id, module.id, { position: idx });
                await onRefreshModules();
              }}
              onMoveDown={async () => {
                if (idx >= orderedModules.length - 1) return;
                await courseStaff.updateModule(course.id, module.id, { position: idx + 2 });
                await onRefreshModules();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Module Card with expandable resources section
interface ModuleCardProps {
  courseId: number;
  module: Module;
  isExpanded: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void>;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
}

function ModuleCard(
  { courseId, module, isExpanded, onToggle, onChanged, canMoveUp, canMoveDown, onMoveUp, onMoveDown }: ModuleCardProps
) {
  const [resources, setResources] = useState<ModuleResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState<"link" | "file" | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState(module.title);
  const [editPosition, setEditPosition] = useState<number>(module.position);    
  const [isSavingModule, setIsSavingModule] = useState(false);
  const [moduleEditError, setModuleEditError] = useState("");
  const [isMovingModule, setIsMovingModule] = useState(false);
  const [movingResourceId, setMovingResourceId] = useState<number | null>(null);
  const [showDeleteModuleConfirm, setShowDeleteModuleConfirm] = useState(false);
  const [confirmDeleteResourceId, setConfirmDeleteResourceId] = useState<number | null>(null);
  const [isDeletingModule, setIsDeletingModule] = useState(false);
  const [isDeletingResource, setIsDeletingResource] = useState(false);
  const [previewResource, setPreviewResource] = useState<ModuleResource | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    setEditTitle(module.title);
    setEditPosition(module.position);
  }, [module.id, module.title, module.position]);

  // Fetch resources when expanded
  useEffect(() => {
    if (isExpanded && resources.length === 0) {
      fetchResources();
    }
  }, [isExpanded]);

  async function fetchResources() {
    setIsLoading(true);
    setError("");
    try {
      const data = await courseStaff.listModuleResources(courseId, module.id);
      setResources(data.sort((a, b) => a.position - b.position || a.id - b.id));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to load resources");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function saveModule() {
    const title = editTitle.trim();
    if (!title) return;
    setIsSavingModule(true);
    setModuleEditError("");
    try {
      await courseStaff.updateModule(courseId, module.id, { title, position: editPosition });
      await onChanged();
      setShowEditModal(false);
    } catch (err) {
      if (err instanceof ApiError) setModuleEditError(err.detail);
      else setModuleEditError("Failed to update module");
    } finally {
      setIsSavingModule(false);
    }
  }

  function requestDeleteModule() {
    setShowDeleteModuleConfirm(true);
  }

  async function deleteModuleConfirmed() {
    setIsDeletingModule(true);
    setModuleEditError("");
    try {
      await courseStaff.deleteModule(courseId, module.id);
      await onChanged();
    } catch (err) {
      if (err instanceof ApiError) setModuleEditError(err.detail);
      else setModuleEditError("Failed to delete module");
    } finally {
      setIsDeletingModule(false);
      setShowDeleteModuleConfirm(false);
    }
  }

  async function handleTogglePublish(resource: ModuleResource) {
    try {
      const updated = await courseStaff.updateModuleResource(
        courseId,
        module.id,
        resource.id,
        { is_published: !resource.is_published }
      );
      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? updated : r))
      );
    } catch (err) {
      reportError("Failed to toggle publish", err);
    }
  }

  async function moveResource(resourceId: number, direction: "up" | "down") {
    if (movingResourceId !== null) return;
    const idx = resources.findIndex((r) => r.id === resourceId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= resources.length) return;

    const a = resources[idx];
    const b = resources[swapIdx];

    setMovingResourceId(resourceId);
    try {
      const [updatedA, updatedB] = await Promise.all([
        courseStaff.updateModuleResource(courseId, module.id, a.id, { position: b.position }),
        courseStaff.updateModuleResource(courseId, module.id, b.id, { position: a.position }),
      ]);
      setResources((prev) =>
        prev
          .map((r) => (r.id === updatedA.id ? updatedA : r.id === updatedB.id ? updatedB : r))
          .sort((x, y) => x.position - y.position)
      );
    } catch (err) {
      reportError("Failed to reorder resource", err);
    } finally {
      setMovingResourceId(null);
    }
  }

  function requestDeleteResource(resourceId: number) {
    setConfirmDeleteResourceId(resourceId);
  }

  async function deleteResourceConfirmed() {
    if (confirmDeleteResourceId === null) return;
    setIsDeletingResource(true);
    try {
      await courseStaff.deleteModuleResource(courseId, module.id, confirmDeleteResourceId);
      setResources((prev) => prev.filter((r) => r.id !== confirmDeleteResourceId));
    } catch (err) {
      reportError("Failed to delete resource", err);
    } finally {
      setIsDeletingResource(false);
      setConfirmDeleteResourceId(null);
    }
  }

  async function handleDownload(resource: ModuleResource) {
    try {
      const blob = await courseStaff.downloadModuleResource(
        courseId,
        module.id,
        resource.id
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resource.file_name || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      reportError("Failed to download resource", err);
    }
  }

  function isPdfResource(resource: ModuleResource) {
    const name = (resource.file_name || "").toLowerCase();
    return resource.kind === "file" && (name.endsWith(".pdf") || resource.content_type?.includes("pdf"));
  }

  function closePreview() {
    setPreviewResource(null);
    setPreviewBlob(null);
    setPreviewError("");
    setIsPreviewLoading(false);
  }

  async function openPdfPreview(resource: ModuleResource) {
    if (!isPdfResource(resource)) return;
    setPreviewResource(resource);
    setPreviewError("");
    setIsPreviewLoading(true);
    try {
      const blob = await courseStaff.downloadModuleResource(courseId, module.id, resource.id);
      const isPdf =
        blob.type.includes("pdf") ||
        (resource.file_name || "").toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        setPreviewBlob(null);
        setPreviewError("Selected file is not a PDF.");
        return;
      }
      setPreviewBlob(blob);
    } catch (err) {
      setPreviewBlob(null);
      if (err instanceof ApiError) setPreviewError(err.detail);
      else setPreviewError("Failed to load PDF preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const deleteResourceTitle = useMemo(() => {
    if (confirmDeleteResourceId === null) return null;
    return resources.find((r) => r.id === confirmDeleteResourceId)?.title ?? null;
  }, [confirmDeleteResourceId, resources]);

  return (
    <>
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Module Header */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[var(--background)] transition-colors"
        onClick={onToggle}
      >
        <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
          <span className="text-sm font-semibold text-[var(--primary)]">
            {module.position}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--foreground)]">{module.title}</p>
          {module.description && (
            <p className="text-sm text-[var(--muted-foreground)] truncate">
              {module.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!canMoveUp || isMovingModule) return;
              setIsMovingModule(true);
              try {
                await onMoveUp();
              } finally {
                setIsMovingModule(false);
              }
            }}
            disabled={!canMoveUp || isMovingModule}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Move module up"
            aria-label="Move module up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!canMoveDown || isMovingModule) return;
              setIsMovingModule(true);
              try {
                await onMoveDown();
              } finally {
                setIsMovingModule(false);
              }
            }}
            disabled={!canMoveDown || isMovingModule}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Move module down"
            aria-label="Move module down"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setModuleEditError("");
              setShowEditModal(true);
            }}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              requestDeleteModule();
            }}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--secondary)] hover:bg-[var(--secondary)]/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[var(--muted-foreground)]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--muted-foreground)]" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Edit module</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{module.title}</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-xl hover:bg-[var(--card)] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {moduleEditError && (
                  <div className="p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 text-sm text-[var(--secondary)]">
                    {moduleEditError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Title</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Position</label>
                  <input
                    type="number"
                    value={editPosition}
                    onChange={(e) => setEditPosition(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-[var(--border)] flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveModule}
                  disabled={isSavingModule || !editTitle.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isSavingModule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Resources Section */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-[var(--border)]"
        >
          <div className="p-4 bg-[var(--background)]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-[var(--foreground)]">
                Resources
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddModal("link")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 rounded-lg transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Add Link
                </button>
                <button
                  onClick={() => setShowAddModal("file")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 rounded-lg transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload File
                </button>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
              </div>
            )}

            {error && (
              <div className="p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-lg text-sm text-[var(--secondary)]">
                {error}
              </div>
            )}

            {!isLoading && !error && resources.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  No resources added yet
                </p>
              </div>
            )}

            {!isLoading && !error && resources.length > 0 && (
              <div className="space-y-2">
                {resources.map((resource, idx) => (
                  <div
                    key={resource.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${resource.is_published
                      ? "bg-[var(--card)] border-[var(--border)]"
                      : "bg-[var(--muted-foreground)]/5 border-dashed border-[var(--muted-foreground)]/30"
                      }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                      {resource.kind === "link" ? (
                        <LinkIcon className="w-4 h-4 text-[var(--primary)]" />
                      ) : (
                        <FileText className="w-4 h-4 text-[var(--primary)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {resource.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {resource.kind === "link" ? (
                          <span className="text-xs text-[var(--muted-foreground)] truncate max-w-[200px]">
                            {resource.url}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {resource.file_name} {resource.size_bytes && `(${formatFileSize(resource.size_bytes)})`}
                          </span>
                        )}
                        {!resource.is_published && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[var(--warning)]/10 text-[var(--warning)] rounded">
                            Draft
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Reorder */}
                      <button
                        onClick={() => moveResource(resource.id, "up")}
                        disabled={idx === 0 || movingResourceId !== null}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Move up"
                        aria-label="Move resource up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveResource(resource.id, "down")}
                        disabled={idx === resources.length - 1 || movingResourceId !== null}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Move down"
                        aria-label="Move resource down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      {/* Publish/Unpublish */}
                      <button
                        onClick={() => handleTogglePublish(resource)}
                        className={`p-1.5 rounded-lg transition-colors ${resource.is_published
                          ? "text-emerald-600 hover:bg-emerald-500/10"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--background)]"
                          }`}
                        title={resource.is_published ? "Unpublish" : "Publish"}
                      >
                        {resource.is_published ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>

                      {/* Open/Download */}
                      {resource.kind === "link" ? (
                        <a
                          href={resource.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
                          title="Open link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <>
                          {isPdfResource(resource) ? (
                            <button
                              onClick={() => void openPdfPreview(resource)}
                              className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
                              title="Preview PDF"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleDownload(resource)}
                            className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => requestDeleteResource(resource.id)}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--secondary)] hover:bg-[var(--secondary)]/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Add Link Modal */}
      {showAddModal === "link" && (
        <AddLinkModal
          courseId={courseId}
          moduleId={module.id}
          onClose={() => setShowAddModal(null)}
          onSuccess={(resource) => {
            setResources((prev) => [...prev, resource].sort((a, b) => a.position - b.position || a.id - b.id));
            setShowAddModal(null);
          }}
        />
      )}

      {/* Add File Modal */}
      {showAddModal === "file" && (
        <AddFileModal
          courseId={courseId}
          moduleId={module.id}
          onClose={() => setShowAddModal(null)}
          onSuccess={(resource) => {
            setResources((prev) => [...prev, resource].sort((a, b) => a.position - b.position || a.id - b.id));
            setShowAddModal(null);
          }}
        />
      )}
    </div>

    <PdfPreviewModal
      isOpen={previewResource !== null}
      onClose={closePreview}
      title={previewResource?.title || "PDF preview"}
      fileName={previewResource?.file_name}
      blob={previewBlob}
      isLoading={isPreviewLoading}
      error={previewError}
      onRetry={
        previewResource
          ? () => {
              void openPdfPreview(previewResource);
            }
          : undefined
      }
      onDownload={
        previewResource
          ? () => {
              void handleDownload(previewResource);
            }
          : undefined
      }
    />

    <ConfirmModal
      isOpen={showDeleteModuleConfirm}
      onClose={() => setShowDeleteModuleConfirm(false)}
      onConfirm={() => void deleteModuleConfirmed()}
      title={`Delete \"${module.title}\"?`}
      description="This removes module content ordering (resources and assignments remain). Continue?"
      confirmLabel="Delete"
      confirmVariant="danger"
      isLoading={isDeletingModule}
    />

    <ConfirmModal
      isOpen={confirmDeleteResourceId !== null}
      onClose={() => setConfirmDeleteResourceId(null)}
      onConfirm={() => void deleteResourceConfirmed()}
      title={deleteResourceTitle ? `Delete \"${deleteResourceTitle}\"?` : "Delete resource?"}
      description="This cannot be undone. Continue?"
      confirmLabel="Delete"
      confirmVariant="danger"
      isLoading={isDeletingResource}
    />
    </>
  );
}

// Add Link Modal
interface AddLinkModalProps {
  courseId: number;
  moduleId: number;
  onClose: () => void;
  onSuccess: (resource: ModuleResource) => void;
}

function AddLinkModal({ courseId, moduleId, onClose, onSuccess }: AddLinkModalProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    setIsSubmitting(true);
    setError("");

    try {
      const resource = await courseStaff.createLinkResource(courseId, moduleId, {
        title: title.trim(),
        url: url.trim(),
        is_published: isPublished,
      });
      onSuccess(resource);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to add link");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)]">
            Add Link Resource
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-lg text-sm text-[var(--secondary)]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Course Syllabus"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="text-sm text-[var(--foreground)]">
              Publish immediately (visible to students)
            </span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !url.trim()}
              className="flex-1 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mx-auto animate-spin" />
              ) : (
                "Add Link"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Add File Modal
interface AddFileModalProps {
  courseId: number;
  moduleId: number;
  onClose: () => void;
  onSuccess: (resource: ModuleResource) => void;
}

function AddFileModal({ courseId, moduleId, onClose, onSuccess }: AddFileModalProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !file) return;

    setIsSubmitting(true);
    setError("");

    try {
      const resource = await courseStaff.uploadFileResource(
        courseId,
        moduleId,
        file,
        title.trim(),
        undefined,
        isPublished
      );
      onSuccess(resource);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to upload file");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        // Auto-fill title from filename
        const name = selectedFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setTitle(name);
      }
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)]">
            Upload File Resource
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-lg text-sm text-[var(--secondary)]">
              {error}
            </div>
          )}

          {/* File Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file
              ? "border-[var(--primary)] bg-[var(--primary)]/5"
              : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--background)]"
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-[var(--primary)]" />
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="p-1 text-[var(--muted-foreground)] hover:text-[var(--secondary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-2" />
                <p className="text-sm text-[var(--foreground)]">
                  Click to select a file
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  PDF, DOC, TXT, ZIP, etc.
                </p>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Lecture Notes Week 1"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="text-sm text-[var(--foreground)]">
              Publish immediately (visible to students)
            </span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !file}
              className="flex-1 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mx-auto animate-spin" />
              ) : (
                "Upload File"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
