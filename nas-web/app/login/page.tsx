"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Неверный пароль");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>NAS</h1>
        <p style={styles.subtitle}>Введите пароль для входа</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            autoFocus
            style={styles.input}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: React.CSSProperties = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    padding: 32,
    background: "#18181b",
    borderRadius: 12,
    border: "1px solid #27272a",
  },
  title: {
    margin: "0 0 8px",
    fontSize: 24,
    fontWeight: 600,
  },
  subtitle: {
    margin: "0 0 24px",
    color: "#a1a1aa",
    fontSize: 14,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  input: {
    padding: "12px 16px",
    background: "#27272a",
    border: "1px solid #3f3f46",
    borderRadius: 8,
    color: "#fff",
    outline: "none",
  },
  error: {
    margin: 0,
    color: "#f87171",
    fontSize: 14,
  },
  button: {
    padding: "12px 16px",
    background: "#7c3aed",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
};
