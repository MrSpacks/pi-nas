"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Неверный пароль");
      }
    } catch (err) {
      setError("Ошибка соединения");
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>NAS</h1>
        <p style={styles.subtitle}>Введите пароль для входа</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            style={styles.input}
          />
          <button type="submit" style={styles.button}>
            Войти
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#000",
    padding: "20px",
  },

  card: {
    background: "#111",
    padding: "32px",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "400px",
    border: "1px solid #333",
  },

  title: {
    color: "#fff",
    textAlign: "center",
    marginBottom: "16px",
    fontSize: "28px",
  },

  subtitle: {
    color: "#aaa",
    textAlign: "center",
    marginBottom: "24px",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "16px",
    background: "#222",
    border: "1px solid #444",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "16px",
  },

  button: {
    width: "100%",
    padding: "12px",
    background: "#3f3f46",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "16px",
  },

  error: {
    color: "#f87171",
    textAlign: "center",
    marginTop: "12px",
  },
} as const;