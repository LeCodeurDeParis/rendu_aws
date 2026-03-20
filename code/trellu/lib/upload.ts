/**
 * Upload direct vers une URL présignée S3 (sans header Authorization).
 * Utilise XMLHttpRequest pour exposer la progression.
 */
export function uploadToPresignedUrl(
  url: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Envoi échoué (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Erreur réseau pendant l’envoi"));
    xhr.send(file);
  });
}
