"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { uploadToPresignedUrl } from "@/lib/upload";
import { Paperclip, Trash2, Loader2 } from "lucide-react";

export interface TaskFileRow {
  id: number;
  task_id: number;
  file_name: string;
  s3_key: string;
  content_type: string;
  uploaded_by_sub: string;
  created_at: string;
}

interface TaskFilesProps {
  taskId: number;
  files: TaskFileRow[];
  onFilesChange: (files: TaskFileRow[]) => void;
  compact?: boolean;
}

export function TaskFiles({ taskId, files, onFilesChange, compact }: TaskFilesProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);
    setProgress(0);

    let created: TaskFileRow | null = null;
    try {
      const res = await api.post<{ file: TaskFileRow; uploadUrl: string }>(`/files/tasks/${taskId}`, {
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      });
      created = res.file;
      await uploadToPresignedUrl(res.uploadUrl, file, (p) => setProgress(p));
      onFilesChange([res.file, ...files]);
    } catch (err) {
      if (created) {
        try {
          await api.delete(`/files/${created.id}`);
        } catch {
          /* best-effort cleanup */
        }
      }
      setError(err instanceof Error ? err.message : "Échec de l’envoi");
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  async function removeFile(id: number) {
    if (!confirm("Supprimer ce fichier ?")) return;
    setError(null);
    try {
      await api.delete(`/files/${id}`);
      onFilesChange(files.filter((f) => f.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible");
    }
  }

  return (
    <div className={compact ? "mt-2 space-y-1" : "space-y-2"}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Paperclip className="h-3 w-3" />
          )}
          {uploading && progress != null ? `${progress}%` : "Fichier"}
        </button>
        {uploading && (
          <div className="h-1 min-w-[48px] flex-1 max-w-[80px] overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        )}
      </div>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      {files.length > 0 && (
        <ul className="space-y-0.5">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground"
            >
              <span className="truncate" title={f.file_name}>
                {f.file_name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(f.id)}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                aria-label={`Supprimer ${f.file_name}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
