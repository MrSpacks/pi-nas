"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Item = { name: string; dir: boolean; size: number | null; mtime: number };
type ListResponse = { path: string; items: Item[] } | { error: string };

export function Dashboard() {
  const [path, setPath] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  async function fetchList(dir: string) {
    setLoading(true);
    setError("");
    try {
      const q = dir ? `?path=${encodeURIComponent(dir)}` : "";
      const res = await fetch(`/api/proxy/list${q}`);
      const data: ListResponse = await res.json();
      if (!res.ok || "error" in data) {
        setError((data as { error?: string }).error || "Ошибка загрузки");
        setItems([]);
        return;
      }
      setPath(data.path);
      setItems(data.items);
    } catch (e) {
      setError("Сеть: " + String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList("");
  }, []);

  function openDir(name: string) {
    const next = path ? `${path}/${name}` : name;
    fetchList(next);
  }

  function goUp() {
    if (!path) return;
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    fetchList(parts.join("/"));
  }

  function handleDownload(item: Item) {
    if (item.dir) return;
    const filePath = path ? `${path}/${item.name}` : item.name;
    window.open(`/api/download?path=${encodeURIComponent(filePath)}`, "_blank");
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const q = path ? `?path=${encodeURIComponent(path)}` : "";
      const res = await fetch(`/api/upload${q}`, { method: "POST", body: form });
      const data = await res.json();
      if (data.ok) fetchList(path);
      else setError(data.error || "Ошибка загрузки");
    } catch (err) {
      setError(String(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <h1 style={styles.h1}>NAS</h1>
        <button onClick={handleLogout} style={styles.logout}>
          Выход
        </button>
      </header>

      <div style={styles.breadcrumb}>
        <button
          type="button"
          onClick={() => fetchList("")}
          style={styles.link}
        >
          /
        </button>
        {path &&
          path.split("/").map((part, i, arr) => (
            <span key={i}>
              <button
                type="button"
                onClick={() => fetchList(arr.slice(0, i + 1).join("/"))}
                style={styles.link}
              >
                {part}
              </button>
              {i < arr.length - 1 && "/"}
            </span>
          ))}
      </div>

      {path && (
        <button type="button" onClick={goUp} style={styles.row}>
          📁 ..
        </button>
      )}

      {error && <p style={styles.error}>{error}</p>}

      {loading ? (
        <p style={styles.muted}>Загрузка…</p>
      ) : (
        items.map((item) => (
          <div
            key={item.name}
            style={styles.row}
            onClick={() => (item.dir ? openDir(item.name) : handleDownload(item))}
          >
            <span>{item.dir ? "📁" : "📄"}</span>
            <span style={{ flex: 1 }}>{item.name}</span>
            {item.size != null && (
              <span style={styles.muted}>
                {(item.size / 1024).toFixed(1)} KB
              </span>
            )}
          </div>
        ))
      )}

      <div style={styles.upload}>
        <label style={styles.uploadLabel}>
          {uploading ? "Загрузка…" : "Загрузить файл"}
          <input
            type="file"
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </label>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    maxWidth: 640,
    margin: "0 auto",
    padding: 24,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  h1: {
    margin: 0,
    fontSize: 20,
  },

  logout: {
    background: "transparent",
    border: "1px solid #3f3f46",
    color: "#a1a1aa",
    padding: "8px 16px",
    borderRadius: 8,
    cursor: "pointer",
  },

  breadcrumb: {
    marginBottom: 16,
    fontSize: 14,
    color: "#a1a1aa",
  },

  link: {
    background: "none",
    border: "none",
    color: "#a78bfa",
    cursor: "pointer",
    padding: 0,
    font: "inherit",
  },

  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    background: "#18181b",
    borderRadius: 8,
    marginBottom: 4,
    cursor: "pointer",
    border: "none",
    width: "100%",
    textAlign: "left",
    font: "inherit",
    color: "inherit",
  },

  error: {
    color: "#f87171",
    margin: "8px 0",
  },

  muted: {
    color: "#71717a",
    fontSize: 14,
  },

  upload: {
    marginTop: 24,
  },

  uploadLabel: {
    display: "inline-block",
    padding: "12px 20px",
    background: "#27272a",
    borderRadius: 8,
    cursor: "pointer",
    border: "1px dashed #3f3f46",
  },
} as const;