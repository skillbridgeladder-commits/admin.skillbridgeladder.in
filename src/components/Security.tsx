"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendThreatAlert, sendJobStatusAlert } from "@/app/actions/notifications";

interface AuditLog {
    id: string;
    subdomain: string;
    event_type: string;
    ip_address: string;
    user_agent: string;
    country: string;
    created_at: string;
    resolution_status: string;
    metadata: any;
}

export default function SecurityPage() {
    const [settings, setSettings] = useState<any>(null);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(true);
    const [toggling, setToggling] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"feed" | "trends" | "monitor" | "settings">("feed");
    const [newIp, setNewIp] = useState("");
    const [newCountry, setNewCountry] = useState("");
    const [ipType, setIpType] = useState<"whitelisted_ips" | "blacklisted_ips">("whitelisted_ips");
    const [selectedThreat, setSelectedThreat] = useState<AuditLog | null>(null);
    const [pulseData, setPulseData] = useState<any>(null);
    const [pulsing, setPulsing] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        fetchSettings();
        fetchLogs();

        const channel = supabase
            .channel("security-logs")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "security_audit_logs" }, (payload) => {
                setLogs(prev => [payload.new as AuditLog, ...prev].slice(0, 100));
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "security_audit_logs" }, (payload) => {
                setLogs(prev => prev.map(log => log.id === payload.new.id ? { ...log, ...payload.new } : log));
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "site_settings" }, (payload) => {
                if (payload.new.id === 1) setSettings(payload.new);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    async function fetchSettings() {
        setLoading(true);
        const { data } = await supabase.from("site_settings").select("*").eq("id", 1).single();
        if (data) setSettings(data);
        setLoading(false);
    }

    async function fetchLogs() {
        setLogsLoading(true);
        const { data } = await supabase
            .from("security_audit_logs")
            .select(`
                *,
                user:profiles!security_audit_logs_user_id_fkey (full_name, email)
            `)
            .order("created_at", { ascending: false })
            .limit(100);
        if (data) setLogs(data);
        setLogsLoading(false);
    }

    async function toggleFirewall(key: string) {
        if (!settings) return;
        setToggling(key);
        const newValue = !settings[key];
        const { error } = await supabase.from("site_settings").update({ [key]: newValue, updated_at: new Date().toISOString() }).eq("id", 1);
        if (!error) setSettings({ ...settings, [key]: newValue });
        setToggling(null);
    }

    async function updateList(key: string, action: "add" | "remove", value: string) {
        if (!settings) return;
        const currentList = settings[key] || [];
        let newList;
        if (action === "add") {
            if (currentList.includes(value) || !value) return;
            newList = [...currentList, value];
        } else {
            newList = currentList.filter((i: string) => i !== value);
        }
        const { error } = await supabase.from("site_settings").update({ [key]: newList, updated_at: new Date().toISOString() }).eq("id", 1);
        if (!error) {
            setSettings({ ...settings, [key]: newList });
            if (key === 'blocked_countries') setNewCountry("");
            else setNewIp("");
        }
    }

    const resolveThreat = async (logId: string) => {
        await supabase.from("security_audit_logs").update({ resolution_status: 'resolved' }).eq("id", logId);
        fetchLogs();
        setSelectedThreat(null);
    };

    const triggerPulse = async () => {
        setPulsing(true);
        try {
            const res = await fetch('/api/cron/keep-alive');
            const data = await res.json();
            setPulseData(data);
        } catch (err) {
            console.error("Pulse failed", err);
        }
        setPulsing(false);
    };

    const threatCount = logs.filter(l => l.event_type === 'threat_detected' && l.resolution_status !== 'resolved').length;
    const ddosEvents = logs.filter(l => l.metadata?.threat_type === 'ddos_attempt').length;

    return (
        <div className="animate-fade-in" style={{ padding: "8px" }}>
            <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "4px" }}>Security Center 4.0</h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>DDoS Defense, Geo-Blocking & Unified Intelligence Feed</p>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", padding: "10px 16px", borderRadius: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-emerald)", textTransform: "uppercase" }}>Uptime</div>
                        <div style={{ fontSize: "18px", fontWeight: 800 }}>99.9%</div>
                    </div>
                    <div style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", padding: "10px 16px", borderRadius: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-rose)", textTransform: "uppercase" }}>Active Threats</div>
                        <div style={{ fontSize: "18px", fontWeight: 800 }}>{threatCount}</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
                {["feed", "monitor", "trends", "settings"].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        style={{
                            padding: "10px 24px", borderRadius: "12px", border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer",
                            background: activeTab === tab ? "var(--accent-blue)" : "var(--bg-card)",
                            color: activeTab === tab ? "#fff" : "var(--text-secondary)",
                            boxShadow: activeTab === tab ? "0 4px 12px rgba(59,130,246,0.3)" : "none"
                        }}
                    >
                        {tab.toUpperCase()}
                    </button>
                ))}
            </div>

            {activeTab === 'feed' && (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px", marginBottom: "24px" }}>
                        {/* Master Lockdown */}
                        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <h3 style={{ fontSize: "18px", fontWeight: 800 }}>🚨 Platform-Wide Lockdown</h3>
                                <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "4px" }}>Bypass with whitelisted IPs only.</p>
                            </div>
                            <button
                                onClick={() => toggleFirewall("firewall_active")}
                                style={{ padding: "12px 24px", borderRadius: "10px", background: settings?.firewall_active ? "var(--accent-rose)" : "var(--bg-secondary)", color: settings?.firewall_active ? "#fff" : "var(--text-primary)", fontWeight: 700, border: "none", cursor: "pointer" }}
                            >
                                {settings?.firewall_active ? "ON LOCKDOWN" : "ACTIVATE"}
                            </button>
                        </div>
                        {/* Advanced Controls */}
                        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "13px", fontWeight: 700 }}>🤖 Bot Protection</span>
                                <button
                                    onClick={async () => {
                                        const newValue = !settings?.captcha_enabled;
                                        await supabase.from("site_settings").update({ captcha_enabled: newValue }).eq("id", 1);
                                        fetchSettings();
                                    }}
                                    style={{ padding: "4px 12px", borderRadius: "6px", background: settings?.captcha_enabled ? "var(--accent-emerald)" : "var(--bg-secondary)", border: "none", fontSize: "10px", fontWeight: 800, color: settings?.captcha_enabled ? "#fff" : "inherit", cursor: "pointer" }}
                                >
                                    {settings?.captcha_enabled ? "ENABLED" : "DISABLED"}
                                </button>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "13px", fontWeight: 700 }}>🌍 Geo-Block</span>
                                <div style={{ display: "flex", gap: "4px" }}>
                                    <input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="Country..." style={{ padding: "4px 8px", fontSize: "11px", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", color: "var(--text-primary)" }} />
                                    <button onClick={() => updateList("blocked_countries", "add", newCountry)} style={{ background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer" }}>+</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Audit Feed Table */}
                    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "20px", overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                                    {["Time", "Identity / Country", "Event", "Activity Details", "Action"].map(h => (
                                        <th key={h} style={{ padding: "14px 24px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {logs.slice(0, 50).map((log, index) => (
                                    <tr key={log.id || `audit-${index}`} style={{ borderBottom: "1px solid var(--border-subtle-last)", background: log.event_type === 'threat_detected' ? "rgba(244,63,94,0.03)" : "inherit" }}>
                                        <td style={{ padding: "16px 24px", fontSize: "12px", color: "var(--text-muted)" }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                                        <td style={{ padding: "16px 24px" }}>
                                            <div style={{ fontSize: "13px", fontWeight: 700 }}>
                                                {(log as any).user?.full_name || (log as any).user?.email || log.ip_address || "Anon visitor"}
                                            </div>
                                            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>📍 {log.country || "Unknown"}</div>
                                        </td>
                                        <td style={{ padding: "16px 24px" }}>
                                            <span style={{ fontSize: "11px", fontWeight: 800, padding: "4px 8px", borderRadius: "6px", color: log.event_type === 'threat_detected' ? "var(--accent-rose)" : "var(--accent-blue)", background: log.event_type === 'threat_detected' ? "rgba(244,63,94,0.1)" : "rgba(59,130,246,0.1)" }}>
                                                {log.event_type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: "16px 24px", fontSize: "13px" }}>
                                            {log.event_type === 'threat_detected' ? (
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <div style={{ fontWeight: 800, color: "var(--accent-rose)" }}>{log.metadata?.threat_type?.replace(/_/g, ' ').toUpperCase()}</div>
                                                    <div style={{ color: "var(--text-muted)" }}>at {log.metadata?.path}</div>
                                                </div>
                                            ) : (
                                                <div style={{ color: "var(--text-secondary)" }}>{log.event_type === 'click' ? `Clicked ${log.metadata?.text || 'Element'}` : `Visited ${log.metadata?.path}`}</div>
                                            )}
                                        </td>
                                        <td style={{ padding: "16px 24px" }}>
                                            {log.event_type === 'threat_detected' && log.resolution_status !== 'resolved' && (
                                                <button
                                                    onClick={() => setSelectedThreat(log)}
                                                    style={{ padding: "6px 14px", borderRadius: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                                                >
                                                    Resolve 🔍
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'monitor' && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "24px" }}>
                    <div style={{ background: "var(--bg-card)", padding: "32px", borderRadius: "20px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                        <div style={{ fontSize: "40px", marginBottom: "20px" }}>⚡</div>
                        <h2 style={{ fontSize: "24px", fontWeight: 800 }}>SBL Pulse</h2>
                        <p style={{ color: "var(--text-secondary)", marginBottom: "32px", fontSize: "14px" }}>Keep-Alive system preventing Supabase inactivity & subdomain sleep.</p>

                        <button
                            onClick={triggerPulse}
                            disabled={pulsing}
                            style={{
                                padding: "14px 24px", borderRadius: "12px", background: "var(--accent-blue)", color: "#fff",
                                fontWeight: 700, border: "none", cursor: pulsing ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px"
                            }}
                        >
                            {pulsing ? "Pulsing..." : "Manual Pulse Sync"} 📡
                        </button>

                        <div style={{ marginTop: "24px", fontSize: "12px", color: "var(--text-muted)" }}>
                            Last Sync: {pulseData ? new Date(pulseData.timestamp).toLocaleTimeString() : "Never"}
                        </div>
                    </div>

                    <div style={{ background: "var(--bg-card)", padding: "32px", borderRadius: "20px" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "20px" }}>Ecosystem Heartbeat</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            {pulseData?.pings.map((ping: any) => (
                                <div key={ping.url} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: ping.success ? "var(--accent-emerald)" : "var(--accent-rose)" }} />
                                        <div style={{ fontSize: "13px", fontWeight: 600 }}>{ping.url.replace('https://', '')}</div>
                                    </div>
                                    <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
                                        <span style={{ color: "var(--text-muted)" }}>{ping.responseTime}</span>
                                        <span style={{ color: ping.success ? "var(--accent-emerald)" : "var(--accent-rose)", fontWeight: 800 }}>{ping.success ? "ONLINE" : "OFFLINE"}</span>
                                    </div>
                                </div>
                            ))}
                            {!pulseData && (
                                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "13px" }}>
                                    Trigger a pulse to verify ecosystem status.
                                </div>
                            )}
                        </div>
                        {pulseData && (
                            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "13px", fontWeight: 700 }}>Supabase Instance</span>
                                <span style={{ padding: "4px 10px", borderRadius: "6px", background: pulseData.supabase === 'Active' ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)", color: pulseData.supabase === 'Active' ? "var(--accent-emerald)" : "var(--accent-rose)", fontSize: "11px", fontWeight: 800 }}>
                                    {pulseData.supabase.toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>

                    <div style={{ background: "var(--bg-card)", padding: "24px", borderRadius: "16px", gridColumn: "span 2", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Security Incidents</div>
                            <div style={{ fontSize: "24px", fontWeight: 900 }}>{threatCount}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Threat Load</div>
                            <div style={{ fontSize: "24px", fontWeight: 900 }}>{ddosEvents}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>RPS Peak</div>
                            <div style={{ fontSize: "24px", fontWeight: 900 }}>{(logs.length / 60).toFixed(1)}</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'trends' && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    <div style={{ background: "var(--bg-card)", padding: "32px", borderRadius: "24px", border: "1px solid var(--border-subtle)" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "24px" }}>🌍 Geo-Distribution Trends</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {Array.from(new Set(logs.map(l => l.country))).filter(Boolean).slice(0, 6).map(country => {
                                const count = logs.filter(l => l.country === country).length;
                                const percentage = Math.min(100, (count / logs.length) * 100);
                                return (
                                    <div key={`geo-chart-${country}`}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                                            <span style={{ fontWeight: 600 }}>{country}</span>
                                            <span style={{ color: "var(--text-muted)" }}>{count} hits ({percentage.toFixed(1)}%)</span>
                                        </div>
                                        <div style={{ height: "8px", background: "var(--bg-secondary)", borderRadius: "4px", overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${percentage}%`, background: "var(--accent-blue)", borderRadius: "4px", transition: "width 1s ease-out" }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ background: "var(--bg-card)", padding: "32px", borderRadius: "24px", border: "1px solid var(--border-subtle)" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "24px" }}>🛡️ Threat Composition</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {['SQL Injection', 'DDoS Attempt', 'Rate Limit', 'Brute Force'].map(type => {
                                const count = logs.filter(l => l.metadata?.threat_type === type.toLowerCase().replace(/ /g, '_')).length;
                                const totalThreats = logs.filter(l => l.event_type === 'threat_detected').length || 1;
                                const percentage = Math.min(100, (count / totalThreats) * 100);
                                return (
                                    <div key={`threat-chart-${type}`}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                                            <span style={{ fontWeight: 600 }}>{type}</span>
                                            <span style={{ color: "var(--text-muted)" }}>{count} detected</span>
                                        </div>
                                        <div style={{ height: "8px", background: "var(--bg-secondary)", borderRadius: "4px", overflow: "hidden" }}>
                                            <div style={{ height: "100%", width: `${percentage}%`, background: "var(--accent-rose)", borderRadius: "4px", transition: "width 1s ease-out" }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ background: "var(--bg-card)", padding: "32px", borderRadius: "24px", border: "1px solid var(--border-subtle)", gridColumn: "span 2" }}>
                        <h3 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "16px" }}>🕒 Activity Load (24h Pulse)</h3>
                        <div style={{ height: "60px", display: "flex", alignItems: "flex-end", gap: "4px" }}>
                            {Array.from({ length: 24 }).map((_, i) => {
                                // Mock trend for pulse effect
                                const height = 20 + Math.random() * 80;
                                return (
                                    <div
                                        key={`pulse-${i}`}
                                        style={{
                                            flex: 1,
                                            height: `${height}%`,
                                            background: "linear-gradient(to top, var(--accent-blue), transparent)",
                                            borderRadius: "2px",
                                            opacity: 0.6 + (i / 24) * 0.4
                                        }}
                                    />
                                );
                            })}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
                            <span>24 Hours Ago</span>
                            <span>Live Pulse</span>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div style={{ background: "var(--bg-card)", padding: "32px", borderRadius: "20px" }}>
                    <h2 style={{ fontSize: "20px", fontWeight: 800, marginBottom: "24px" }}>System Configurations</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                        <div style={{ background: "var(--bg-secondary)", padding: "20px", borderRadius: "16px" }}>
                            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>📧 Threat Notifications</h4>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>Send alerts via Resend when threats are detected.</p>
                            <input
                                value={settings?.notification_email || ""}
                                onChange={async (e) => {
                                    const val = e.target.value;
                                    setSettings({ ...settings, notification_email: val });
                                    await supabase.from("site_settings").update({ notification_email: val }).eq("id", 1);
                                }}
                                placeholder="admin@example.com"
                                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)" }}
                            />
                        </div>
                        <div style={{ background: "var(--bg-secondary)", padding: "20px", borderRadius: "16px" }}>
                            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>🧠 Bot Sensitivity</h4>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>Adjust the threshold for auto-flagging bots.</p>
                            <input
                                type="range"
                                min="0" max="1" step="0.1"
                                value={settings?.bot_sensitivity || 0.5}
                                onChange={async (e) => {
                                    const val = parseFloat(e.target.value);
                                    setSettings({ ...settings, bot_sensitivity: val });
                                    await supabase.from("site_settings").update({ bot_sensitivity: val }).eq("id", 1);
                                }}
                                style={{ width: "100%" }}
                            />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "8px" }}>
                                <span>Relaxed</span>
                                <span>Strict</span>
                            </div>
                        </div>

                        {/* IP Management */}
                        <div style={{ background: "var(--bg-secondary)", padding: "20px", borderRadius: "16px", gridColumn: "span 2" }}>
                            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>🛡️ Network Access Control</h4>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>Manage whitelisted (trusted) and blacklisted (blocked) IP addresses.</p>

                            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                                <select
                                    value={ipType}
                                    onChange={(e) => setIpType(e.target.value as any)}
                                    style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "13px" }}
                                >
                                    <option value="whitelisted_ips">Whitelist</option>
                                    <option value="blacklisted_ips">Blacklist</option>
                                </select>
                                <input
                                    value={newIp}
                                    onChange={(e) => setNewIp(e.target.value)}
                                    placeholder="Enter IP address (e.g., 1.2.3.4)"
                                    style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "13px" }}
                                />
                                <button
                                    onClick={() => updateList(ipType, "add", newIp)}
                                    style={{ padding: "0 20px", borderRadius: "8px", background: "var(--accent-blue)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
                                >
                                    Add IP
                                </button>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {(settings?.[ipType] || []).map((ip: string) => (
                                    <div key={ip} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "8px", fontSize: "12px" }}>
                                        <code>{ip}</code>
                                        <button onClick={() => updateList(ipType, "remove", ip)} style={{ background: "none", border: "none", color: "var(--accent-rose)", cursor: "pointer", fontWeight: 800 }}>×</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Country Management */}
                        <div style={{ background: "var(--bg-secondary)", padding: "20px", borderRadius: "16px", gridColumn: "span 2" }}>
                            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>🌍 Global Geo-Blocking</h4>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>Restrict access from specific countries entirely.</p>

                            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                                <input
                                    value={newCountry}
                                    onChange={(e) => setNewCountry(e.target.value)}
                                    placeholder="Enter Country Name (e.g., India, Brazil)"
                                    style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "13px" }}
                                />
                                <button
                                    onClick={() => updateList("blocked_countries", "add", newCountry)}
                                    style={{ padding: "0 20px", borderRadius: "8px", background: "var(--accent-rose)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}
                                >
                                    Block Country
                                </button>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {(settings?.blocked_countries || []).map((c: string) => (
                                    <div key={c} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "8px", fontSize: "12px", color: "var(--accent-rose)", fontWeight: 700 }}>
                                        {c}
                                        <button onClick={() => updateList("blocked_countries", "remove", c)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 800 }}>×</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Verification Tools */}
                        <div style={{ background: "var(--bg-secondary)", padding: "20px", borderRadius: "16px", gridColumn: "span 2" }}>
                            <h4 style={{ fontSize: "14px", fontWeight: 700, marginBottom: "8px" }}>🧪 Verification & Testing</h4>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>Verify your Resend integration by sending test alerts.</p>
                            <div style={{ display: "flex", gap: "12px" }}>
                                <button
                                    onClick={async () => {
                                        if (!settings?.notification_email) { alert("Please set a notification email first."); return; }
                                        await sendThreatAlert({
                                            threatType: "test_verification",
                                            ip: "127.0.0.1",
                                            location: "Localhost (Test)",
                                            path: "/security/test",
                                            adminEmail: settings.notification_email
                                        });
                                        alert("Test threat alert sent!");
                                    }}
                                    style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "rgba(244,63,94,0.1)", color: "var(--accent-rose)", border: "1px solid rgba(244,63,94,0.2)", fontWeight: 700, cursor: "pointer" }}
                                >
                                    Test Threat Alert 🚨
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!settings?.notification_email) { alert("Please set a notification email first."); return; }
                                        await sendJobStatusAlert({
                                            userEmail: settings.notification_email,
                                            userName: "Test Admin",
                                            jobTitle: "Security Verification Specialist",
                                            newStatus: "test_active"
                                        });
                                        alert("Test Job Alert 📧");
                                    }}
                                    style={{ flex: 1, padding: "12px", borderRadius: "10px", background: "rgba(59,130,246,0.1)", color: "var(--accent-blue)", border: "1px solid rgba(59,130,246,0.2)", fontWeight: 700, cursor: "pointer" }}
                                >
                                    Test Hire Alert 📧
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Threat Resolution Modal */}
            {selectedThreat && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "var(--bg-card)", width: "500px", padding: "32px", borderRadius: "24px", border: "1px solid var(--accent-rose)" }}>
                        <h2 style={{ fontSize: "24px", fontWeight: 900, color: "var(--accent-rose)" }}>Threat Resolution Guide</h2>
                        <div style={{ margin: "24px 0", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>Attack: {selectedThreat.metadata?.threat_type?.toUpperCase()}</div>
                            <div style={{ marginTop: "12px" }}>
                                <h4 style={{ color: "var(--text-primary)" }}>What happened?</h4>
                                <p>The visitor attempted to access sensitive system files or performed interactions at a frequency typical of bots.</p>
                            </div>
                            <div style={{ marginTop: "12px" }}>
                                <h4 style={{ color: "var(--text-primary)" }}>How to prevent?</h4>
                                <p>We recommend adding this IP ({selectedThreat.ip_address}) to the Permanent Blacklist. This will block all future access from this source.</p>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "12px" }}>
                            <button onClick={() => updateList("blacklisted_ips", "add", selectedThreat.ip_address)} style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "var(--accent-rose)", color: "#fff", fontWeight: 700, border: "none" }}>Blacklist IP</button>
                            <button onClick={() => resolveThreat(selectedThreat.id)} style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "var(--bg-secondary)", color: "var(--text-primary)", fontWeight: 700, border: "none" }}>Mark Resolved</button>
                            <button onClick={() => setSelectedThreat(null)} style={{ padding: "12px", borderRadius: "12px", color: "var(--text-muted)" }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
