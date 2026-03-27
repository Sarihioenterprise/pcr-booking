"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  daily_rate: number;
}

export default function EmbedPage() {
  const { operatorId } = useParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    dates_requested: "",
    duration_days: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      const { data } = await supabase
        .from("vehicles")
        .select("id, make, model, year, color, daily_rate")
        .eq("operator_id", operatorId)
        .eq("status", "active")
        .order("daily_rate", { ascending: true });
      setVehicles((data as Vehicle[]) ?? []);
    }
    load();
  }, [operatorId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_id: operatorId,
          name: form.name,
          phone: form.phone,
          email: form.email,
          dates_requested: form.dates_requested,
          duration_days: form.duration_days
            ? parseInt(form.duration_days)
            : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.success}>
          <div style={styles.checkIcon}>&#10003;</div>
          <h2 style={styles.successTitle}>Request Submitted!</h2>
          <p style={styles.successText}>
            We&apos;ll be in touch soon to confirm your booking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Book a Vehicle</h2>

      {vehicles.length > 0 && (
        <div style={styles.vehicleList}>
          <p style={styles.subtitle}>Available Vehicles</p>
          {vehicles.map((v) => (
            <div key={v.id} style={styles.vehicleCard}>
              <span style={styles.vehicleName}>
                {v.year} {v.make} {v.model}
              </span>
              <span style={styles.vehicleRate}>
                ${Number(v.daily_rate).toFixed(0)}/day
              </span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {error && <p style={styles.error}>{error}</p>}
        <div style={styles.field}>
          <label style={styles.label}>Name *</label>
          <input
            style={styles.input}
            placeholder="Your full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Phone *</label>
          <input
            style={styles.input}
            type="tel"
            placeholder="(555) 123-4567"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Email *</label>
          <input
            style={styles.input}
            type="email"
            placeholder="you@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Preferred Dates</label>
          <input
            style={styles.input}
            placeholder="e.g., March 15 - March 22"
            value={form.dates_requested}
            onChange={(e) =>
              setForm({ ...form, dates_requested: e.target.value })
            }
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Duration (days)</label>
          <input
            style={styles.input}
            type="number"
            placeholder="7"
            value={form.duration_days}
            onChange={(e) =>
              setForm({ ...form, duration_days: e.target.value })
            }
          />
        </div>
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? "Submitting..." : "Request Booking"}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: 420,
    margin: "0 auto",
    padding: 24,
    backgroundColor: "#111118",
    borderRadius: 12,
    color: "#f1f5f9",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 16,
    color: "#f1f5f9",
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 8,
  },
  vehicleList: { marginBottom: 20 },
  vehicleCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    backgroundColor: "#1e1e2e",
    borderRadius: 8,
    marginBottom: 6,
    fontSize: 14,
  },
  vehicleName: { fontWeight: 500 },
  vehicleRate: { color: "#3B82F6", fontWeight: 600 },
  field: { marginBottom: 14 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 4,
    color: "#94a3b8",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #1e293b",
    backgroundColor: "#0a0a0f",
    color: "#f1f5f9",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "12px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#3B82F6",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
  },
  error: {
    color: "#EF4444",
    fontSize: 13,
    marginBottom: 12,
  },
  success: {
    textAlign: "center" as const,
    padding: "40px 20px",
  },
  checkIcon: {
    fontSize: 48,
    color: "#10B981",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 8,
  },
  successText: {
    color: "#94a3b8",
    fontSize: 14,
  },
};
