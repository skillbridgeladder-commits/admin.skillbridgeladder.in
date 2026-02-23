"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendJobStatusAlert } from "@/app/actions/notifications";

interface Application {
  id: string;
  user_id: string;
  job_id: string;
  form_data: Record<string, string>;
  status: string;
  private_notes: string;
  created_at: string;
  jobs?: { title: string; form_schema: any[] };
  profiles?: { full_name: string; email: string };
}

const statusColors: Record<string, string> = {
  Applied: "#3b82f6",
  "Round 1": "#f59e0b",
  Interview: "#8b5cf6",
  Hired: "#10b981",
  Rejected: "#f43f5e",
};

const allStatuses = ["Applied", "Round 1", "Interview", "Hired", "Rejected"];

export default function AdminDashboard() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [filterJob, setFilterJob] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
    // Real-time subscription for application updates
    const channel = supabase
      .channel("admin-applications")
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchData() {
    setLoading(true);
    console.log("Fetching dashboard data...");

    // Primary query with joins
    const { data, error } = await supabase
      .from("applications")
      .select("*, jobs(title, form_schema), profiles(full_name, email)")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Primary dashboard fetch failed, trying fallback:", error.message);

      // Fallback: Fetch everything separately and join manually
      const [appsRes, jobsRes, profRes] = await Promise.all([
        supabase.from("applications").select("*").order("created_at", { ascending: false }),
        supabase.from("jobs").select("id, title, form_schema"),
        supabase.from("profiles").select("id, full_name, email")
      ]);

      if (appsRes.data) {
        const combined = appsRes.data.map(app => ({
          ...app,
          jobs: jobsRes.data?.find(j => j.id === app.job_id),
          profiles: profRes.data?.find(p => p.id === app.user_id)
        }));
        setApplications(combined as Application[]);
      }
      if (jobsRes.data) setJobs(jobsRes.data);
    } else {
      if (data) setApplications(data as Application[]);

      const { data: jobsData } = await supabase.from("jobs").select("id, title, form_schema");
      if (jobsData) setJobs(jobsData);
    }

    setLoading(false);
  }

  async function updateStatus(appId: string, newStatus: string) {
    const { error } = await supabase.from("applications").update({ status: newStatus }).eq("id", appId);
    if (!error) {
      // Trigger notification
      const app = applications.find(a => a.id === appId);
      if (app) {
        const email = app.profiles?.email || app.form_data?._email || app.form_data?.Email;
        const name = app.profiles?.full_name || app.form_data?._name || app.form_data?.Name || "Applicant";
        const jobTitle = app.jobs?.title || "Position";

        if (email) {
          await sendJobStatusAlert({
            userEmail: email,
            userName: name,
            jobTitle: jobTitle,
            newStatus: newStatus
          });
        }
      }
      fetchData();
    }
  }

  async function saveNotes(appId: string) {
    await supabase.from("applications").update({ private_notes: notesValue }).eq("id", appId);
    setEditingNotes(null);
    fetchData();
  }

  const filtered = applications.filter((app) => {
    if (filterJob && app.job_id !== filterJob) return false;
    if (filterStatus && app.status !== filterStatus) return false;
    return true;
  });

  const exportToCSV = () => {
    if (filtered.length === 0) return;

    const headers = ["ID", "Applicant", "Email", "Job", "Status", "Date", "Notes"];
    const rows = filtered.map(app => [
      app.id,
      app.profiles?.full_name || app.form_data?._name || "Unknown",
      app.profiles?.email || app.form_data?._email || "",
      app.jobs?.title || "",
      app.status,
      new Date(app.created_at).toLocaleDateString(),
      app.private_notes || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sbl_applications_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "4px" }}>
          CRM Dashboard
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          Manage all freelancer applications in one place
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        {allStatuses.map((status) => {
          const count = applications.filter((a) => a.status === status).length;
          return (
            <div
              key={status}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "14px",
                padding: "20px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onClick={() => setFilterStatus(filterStatus === status ? "" : status)}
            >
              <div style={{ fontSize: "32px", fontWeight: 800, color: statusColors[status] }}>
                {count}
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                {status}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <select
          value={filterJob}
          onChange={(e) => setFilterJob(e.target.value)}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "10px 16px",
            color: "var(--text-primary)",
            fontSize: "13px",
            outline: "none",
            minWidth: "200px",
          }}
        >
          <option value="">All Jobs</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "10px 16px",
            color: "var(--text-primary)",
            fontSize: "13px",
            outline: "none",
            minWidth: "160px",
          }}
        >
          <option value="">All Statuses</option>
          {allStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {(filterJob || filterStatus) && (
          <button
            onClick={() => { setFilterJob(""); setFilterStatus(""); }}
            style={{
              background: "rgba(244,63,94,0.1)",
              border: "1px solid rgba(244,63,94,0.3)",
              borderRadius: "10px",
              padding: "10px 20px",
              color: "var(--accent-rose)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Clear Filters
          </button>
        )}

        <div style={{ flex: 1 }} />

        <button
          onClick={exportToCSV}
          disabled={filtered.length === 0}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "10px 20px",
            color: "var(--text-primary)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            opacity: filtered.length === 0 ? 0.5 : 1
          }}
        >
          <span>📊</span> Export to Excel
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          Loading applications...
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            background: "var(--bg-card)",
            borderRadius: "16px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
          <div style={{ color: "var(--text-secondary)" }}>No applications found</div>
        </div>
      ) : (
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "16px",
            border: "1px solid var(--border-subtle)",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {["Applicant", "Job", "Status", "Date", "Notes", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "14px 16px",
                      textAlign: "left",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <React.Fragment key={app.id}>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>
                        {app.profiles?.full_name || app.form_data?._name || "Unknown"}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {app.profiles?.email || app.form_data?._email || ""}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                      {app.jobs?.title || "—"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <select
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                        style={{
                          background: `${statusColors[app.status]}20`,
                          border: `1px solid ${statusColors[app.status]}50`,
                          borderRadius: "8px",
                          padding: "6px 12px",
                          color: statusColors[app.status],
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        {allStatuses.map((s) => (
                          <option key={s} value={s} style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--text-muted)" }}>
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "14px 16px", maxWidth: "200px" }}>
                      {editingNotes === app.id ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <input
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            style={{
                              background: "var(--bg-secondary)",
                              border: "1px solid var(--border-active)",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              color: "var(--text-primary)",
                              fontSize: "12px",
                              flex: 1,
                              outline: "none",
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => saveNotes(app.id)}
                            style={{
                              background: "var(--accent-blue)",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 10px",
                              color: "#fff",
                              fontSize: "11px",
                              cursor: "pointer",
                            }}
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => { setEditingNotes(app.id); setNotesValue(app.private_notes || ""); }}
                          style={{
                            fontSize: "12px",
                            color: app.private_notes ? "var(--text-secondary)" : "var(--text-muted)",
                            cursor: "pointer",
                            fontStyle: app.private_notes ? "normal" : "italic",
                          }}
                        >
                          {app.private_notes || "Add note..."}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <button
                        onClick={() => setSelectedApp(app)}
                        style={{
                          background: "rgba(59,130,246,0.1)",
                          border: "1px solid rgba(59,130,246,0.3)",
                          borderRadius: "8px",
                          padding: "6px 14px",
                          color: "var(--accent-blue)",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Application Detail Modal (Google Form Style) */}
      {selectedApp && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}
          onClick={() => setSelectedApp(null)}
        >
          <div
            style={{
              background: "var(--bg-primary)",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              borderRadius: "24px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              animation: "slide-up 0.3s ease-out"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-card)" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 800 }}>Application Details</h2>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>ID: {selectedApp.id}</p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                style={{ background: "transparent", border: "none", fontSize: "24px", cursor: "pointer", color: "var(--text-muted)" }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: "32px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* CRM Power Actions */}
              <div style={{
                background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)",
                border: "1px solid rgba(59,130,246,0.2)",
                borderRadius: "16px",
                padding: "20px",
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                alignItems: "center"
              }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-blue)", textTransform: "uppercase", width: "100%", marginBottom: "4px" }}>CRM Power Actions</div>

                <button
                  onClick={() => {
                    const phone = Object.values(selectedApp.form_data).find(v => typeof v === 'string' && /^\+?[0-9]{10,15}$/.test(v.replace(/\s/g, '')));
                    if (phone) window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');
                    else alert("No phone number detected in form data.");
                  }}
                  style={{
                    background: "#25D366",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px 18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <span>💬</span> WhatsApp
                </button>

                <button
                  onClick={() => {
                    window.location.href = `/chat?u=${selectedApp.user_id}`;
                  }}
                  style={{
                    background: "var(--accent-blue)",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "10px 18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <span>⚡</span> Direct Chat
                </button>

                <button
                  onClick={() => {
                    const email = selectedApp.profiles?.email || selectedApp.form_data?._email;
                    if (email) {
                      navigator.clipboard.writeText(email);
                      alert("Email copied to clipboard!");
                    }
                  }}
                  style={{
                    background: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "10px",
                    padding: "10px 18px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <span>📋</span> Copy Email
                </button>
              </div>

              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-blue)", textTransform: "uppercase", marginBottom: "12px" }}>Applicant Info</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>FULL NAME</div>
                    <div style={{ fontWeight: 600 }}>{selectedApp.profiles?.full_name || selectedApp.form_data?._name || "Unknown"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>EMAIL ADDRESS</div>
                    <div>{selectedApp.profiles?.email || selectedApp.form_data?._email || "N/A"}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-rose)", textTransform: "uppercase", marginBottom: "12px" }}>Job Details</div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>POSITION</div>
                  <div style={{ fontWeight: 600 }}>{selectedApp.jobs?.title || "Unknown Position"}</div>
                </div>
              </div>

              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#10b981", textTransform: "uppercase", marginBottom: "4px" }}>Form Responses (Google Form Style)</div>
                {Object.entries(selectedApp.form_data || {}).filter(([k]) => !k.startsWith("_")).map(([key, val]) => {
                  const schema = selectedApp.jobs?.form_schema;
                  const fields = Array.isArray(schema) ? schema : ((schema as any)?.fields || []);
                  const fieldDef = fields.find((f: any) => f.id === key);
                  const label = fieldDef?.label || key;
                  return (
                    <div key={key} style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border-subtle-last)" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>{label}</div>
                      <div style={{ fontSize: "14px", color: "var(--text-secondary)", whiteSpace: "pre-wrap", background: "var(--bg-secondary)", padding: "12px", borderRadius: "8px" }}>
                        {Array.isArray(val) ? val.join(", ") : val || "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: "20px 32px", borderTop: "1px solid var(--border-subtle)", background: "var(--bg-card)", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSelectedApp(null)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
