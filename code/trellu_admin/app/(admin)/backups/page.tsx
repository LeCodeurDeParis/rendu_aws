"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Database, ExternalLink } from "lucide-react";

interface Backup {
  id: number;
  file_name: string;
  s3_key: string;
  size: number;
  created_at: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Backup[]>("/admin/backups").then(setBackups).finally(() => setLoading(false));
  }, []);

  const s3BucketUrl = process.env.NEXT_PUBLIC_S3_BACKUPS_URL ?? "#";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Backups</h1>
        <p className="text-sm text-muted-foreground">Historique des sauvegardes de base de données</p>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : backups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Database className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">Aucun backup disponible</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Fichier</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Heure</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Taille</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Lien S3</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((backup) => {
                const date = new Date(backup.created_at);
                return (
                  <tr key={backup.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium font-mono">{backup.file_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {date.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {date.toLocaleTimeString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatBytes(backup.size)}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`${s3BucketUrl}/${backup.s3_key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Voir <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
