"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState<"idle" | "pulsing" | "reporting">("idle");
    const [report, setReport] = useState<any>(null);
    const supabase = createClient();

    const triggerPulse = async () => {
        setStatus("pulsing");
        try {
            const res = await fetch('/api/cron/keep-alive');
            const data = await res.json();
            setReport({ type: 'pulse', data });
        } catch (err) {
            setReport({ type: 'error', message: "Pulse failed" });
        }
        setStatus("reporting");
    };

    const checkSecurity = async () => {
        setStatus("pulsing");
        const { data: logs } = await supabase
            .from("security_audit_logs")
            .select("*")
            .eq("event_type", "threat_detected")
            .neq("resolution_status", "resolved")
            .limit(5);

        setReport({ type: 'security', data: logs || [] });
        setStatus("reporting");
    };

    return (
        <div style={{ position: "fixed", bottom: "30px", right: "30px", zIndex: 10000 }}>
            {/* Bubble */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "20px",
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                    border: "none",
                    boxShadow: "0 10px 25px rgba(59,130,246,0.5)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isOpen ? "rotate(90deg) scale(0.9)" : "rotate(0) scale(1)",
                }}
            >
                {isOpen ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                )}
            </button>

            {/* Menu */}
            {isOpen && (
                <div className="animate-fade-in-up" style={{
                    position: "absolute",
                    bottom: "80px",
                    right: "0",
                    width: "320px",
                    background: "#fff",
                    borderRadius: "24px",
                    border: "1px solid rgba(0,0,0,0.05)",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
                    padding: "24px",
                    overflow: "hidden"
                }}>
                    <div style={{ marginBottom: "20px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "20px" }}>🤖</span> SBL AI Assistant
                        </h3>
                        <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Manage your ecosystem with quick actions.</p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <button
                            onClick={triggerPulse}
                            disabled={status === 'pulsing'}
                            style={{
                                padding: "12px", borderRadius: "12px", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.1)",
                                color: "var(--accent-blue)", fontSize: "13px", fontWeight: 700, cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between"
                            }}
                        >
                            Trigger Pulse Sync 📡
                            {status === 'pulsing' && "..."}
                        </button>
                        <button
                            onClick={checkSecurity}
                            disabled={status === 'pulsing'}
                            style={{
                                padding: "12px", borderRadius: "12px", background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.1)",
                                color: "var(--accent-rose)", fontSize: "13px", fontWeight: 700, cursor: "pointer", textAlign: "left"
                            }}
                        >
                            Deep Security Scan 🛡️
                        </button>
                    </div>

                    {status === 'reporting' && report && (
                        <div style={{ marginTop: "20px", padding: "16px", background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0", maxHeight: "200px", overflowY: "auto" }}>
                            {report.type === 'pulse' && (
                                <>
                                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>Pulse Report</div>
                                    {report.data.pings.map((p: any) => (
                                        <div key={p.url} style={{ fontSize: "12px", display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                            <span style={{ color: "#334155" }}>{p.url.split('//')[1]}</span>
                                            <span style={{ color: p.success ? "var(--accent-emerald)" : "var(--accent-rose)", fontWeight: 700 }}>{p.success ? "OK" : "ERR"}</span>
                                        </div>
                                    ))}
                                </>
                            )}
                            {report.type === 'security' && (
                                <>
                                    <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>Security Scan</div>
                                    {report.data.length === 0 ? (
                                        <div style={{ fontSize: "12px", color: "var(--accent-emerald)", fontWeight: 700 }}>No active threats found! ✨</div>
                                    ) : (
                                        report.data.map((l: any) => (
                                            <div key={l.id} style={{ fontSize: "12px", marginBottom: "8px", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px" }}>
                                                <div style={{ fontWeight: 700, color: "var(--accent-rose)" }}>{l.metadata?.threat_type?.toUpperCase()}</div>
                                                <div style={{ color: "#64748b", fontSize: "10px" }}>IP: {l.ip_address}</div>
                                            </div>
                                        ))
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
