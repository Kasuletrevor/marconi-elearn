"use client";

import { useEffect, useMemo } from "react";
import { Loader2, RotateCw, Download, ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileName?: string | null;
  blob?: Blob | null;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  onDownload?: () => void;
}

export function PdfPreviewModal({
  isOpen,
  onClose,
  title,
  fileName,
  blob,
  isLoading = false,
  error = "",
  onRetry,
  onDownload,
}: PdfPreviewModalProps) {
  const objectUrl = useMemo(
    () => (isOpen && blob ? URL.createObjectURL(blob) : null),
    [blob, isOpen]
  );

  useEffect(
    () => () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    },
    [objectUrl]
  );

  const previewUrl = useMemo(
    () => (objectUrl ? `${objectUrl}#toolbar=1&navpanes=0&scrollbar=1` : ""),
    [objectUrl]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={fileName || "PDF document preview"}
      size="lg"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-end gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--card)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              Refresh
            </button>
          )}
          {onDownload && (
            <button
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--card)] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
          {objectUrl && (
            <a
              href={objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--card)] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open new tab
            </a>
          )}
        </div>

        <div className="h-[72vh] rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-[var(--muted-foreground)]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="h-full p-6 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-[var(--secondary)]">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--background)] transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                  Try again
                </button>
              )}
            </div>
          ) : objectUrl ? (
            <iframe
              title={title}
              src={previewUrl}
              className="w-full h-full"
            />
          ) : (
            <div className="h-full flex items-center justify-center p-6 text-sm text-[var(--muted-foreground)] text-center">
              PDF preview unavailable.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
