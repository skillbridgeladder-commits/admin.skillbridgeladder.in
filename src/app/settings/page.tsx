"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendTestEmail } from "@/app/actions/notifications";

export default function SettingsPage() {
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [notificationEmail, setNotificationEmail] = useState("");
    const [threatAlerts, setThreatAlerts] = useState(true);
    const [statusUpdates, setStatusUpdates] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const supabase = createClient();

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        setLoading(true);
        const { data } = await supabase.from("site_settings").select("*").eq("id", 1).single();
        if (data) {
            setMaintenanceMode(data.maintenance_mode);
            setNotificationEmail(data.notification_email || "");
            setThreatAlerts(data.email_threat_alerts ?? true);
            setStatusUpdates(data.email_status_updates ?? true);
        }
        setLoading(false);
    }

    async function toggleMaintenance() {
        setSaving(true);
        const newValue = !maintenanceMode;
        await supabase.from("site_settings").update({ maintenance_mode: newValue, updated_at: new Date().toISOString() }).eq("id", 1);
        setMaintenanceMode(newValue);
        setSaving(false);
    }

    async function saveEmailSettings() {
        setSaving(true);
        const { error } = await supabase.from("site_settings").update({
            notification_email: notificationEmail,
            email_threat_alerts: threatAlerts,
            email_status_updates: statusUpdates,
            updated_at: new Date().toISOString()
        }).eq("id", 1);

        if (!error) {
            alert("Email settings saved successfully!");
        } else {
            alert("Error saving settings: " + error.message);
        }
        setSaving(false);
    }

    async function handleTestEmail() {
        if (!notificationEmail) {
            alert("Please enter an email address first.");
            return;
        }
        setTesting(true);
        setTestResult(null);
        const result = await sendTestEmail(notificationEmail);
        setTestResult({
            success: result.success,
            message: result.success ? "Test email sent! Check your inbox." : `Failed: ${result.error}`
        });
        setTesting(false);
    }

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "4px" }}>Settings</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                    Manage global site configuration
                </p>
            </div>

            {/* Maintenance Mode Card */}
            <div
                style={{
                    background: "var(--bg-card)",
                    border: maintenanceMode ? "1px solid rgba(245,158,11,0.4)" : "1px solid var(--border-subtle)",
                    borderRadius: "20px",
                    padding: "32px",
                    maxWidth: "600px",
                    transition: "all 0.3s",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                            <span style={{ fontSize: "24px" }}>🔧</span>
                            <h2 style={{ fontSize: "20px", fontWeight: 700 }}>Maintenance Mode</h2>
                        </div>
                        <p style={{ color: "var(--text-secondary)", fontSize: "13px", maxWidth: "360px", lineHeight: 1.6 }}>
                            When enabled, the <strong>Hire</strong> portal will display a full-screen &quot;Under Maintenance&quot; overlay. All functionality will be blocked for freelancers.
                        </p>
                    </div>

                    {/* Toggle Switch */}
                    <button
                        onClick={toggleMaintenance}
                        disabled={loading || saving}
                        style={{
                            position: "relative",
                            width: "64px",
                            height: "34px",
                            borderRadius: "17px",
                            border: "none",
                            background: maintenanceMode
                                ? "linear-gradient(135deg, var(--accent-amber), #ef4444)"
                                : "var(--bg-secondary)",
                            cursor: saving ? "wait" : "pointer",
                            transition: "background 0.3s",
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                top: "3px",
                                left: maintenanceMode ? "33px" : "3px",
                                width: "28px",
                                height: "28px",
                                borderRadius: "14px",
                                background: "#fff",
                                transition: "left 0.3s ease",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                            }}
                        />
                    </button>
                </div>

                {/* Status */}
                <div
                    style={{
                        marginTop: "20px",
                        padding: "12px 16px",
                        borderRadius: "12px",
                        background: maintenanceMode ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)",
                        border: `1px solid ${maintenanceMode ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: maintenanceMode ? "var(--accent-amber)" : "var(--accent-emerald)",
                    }}
                >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: maintenanceMode ? "var(--accent-amber)" : "var(--accent-emerald)" }} />
                    {maintenanceMode
                        ? "⚠️ Hire portal is in MAINTENANCE mode"
                        : "✅ Hire portal is LIVE and operational"}
                </div>
            </div>

            {/* Email Notifications Card */}
            <div
                style={{
                    marginTop: "32px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "20px",
                    padding: "32px",
                    maxWidth: "600px",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
                    <span style={{ fontSize: "24px" }}>📧</span>
                    <h2 style={{ fontSize: "20px", fontWeight: 700 }}>Email Notifications</h2>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <div>
                        <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--text-primary)" }}>
                            Administrator Alert Email
                        </label>
                        <input
                            type="email"
                            value={notificationEmail}
                            onChange={(e) => setNotificationEmail(e.target.value)}
                            placeholder="admin@skillbridgeladder.in"
                            style={{
                                width: "100%",
                                padding: "12px 16px",
                                borderRadius: "12px",
                                background: "var(--bg-secondary)",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--text-primary)",
                                fontSize: "14px",
                                outline: "none",
                            }}
                        />
                        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                            All critical security threats will be sent to this address.
                        </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: 600 }}>Security Threat Alerts</div>
                                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Send email on high-severity threat detection</div>
                            </div>
                            <button
                                onClick={() => setThreatAlerts(!threatAlerts)}
                                style={{
                                    width: "50px",
                                    height: "26px",
                                    borderRadius: "13px",
                                    background: threatAlerts ? "var(--accent-blue)" : "var(--bg-secondary)",
                                    border: "none",
                                    position: "relative",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                <div style={{
                                    position: "absolute",
                                    top: "3px",
                                    left: threatAlerts ? "27px" : "3px",
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    background: "#fff",
                                    transition: "left 0.2s"
                                }} />
                            </button>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: 600 }}>Candidate Status Updates</div>
                                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Notify users when application status changes</div>
                            </div>
                            <button
                                onClick={() => setStatusUpdates(!statusUpdates)}
                                style={{
                                    width: "50px",
                                    height: "26px",
                                    borderRadius: "13px",
                                    background: statusUpdates ? "var(--accent-blue)" : "var(--bg-secondary)",
                                    border: "none",
                                    position: "relative",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                }}
                            >
                                <div style={{
                                    position: "absolute",
                                    top: "3px",
                                    left: statusUpdates ? "27px" : "3px",
                                    width: "20px",
                                    height: "20px",
                                    borderRadius: "50%",
                                    background: "#fff",
                                    transition: "left 0.2s"
                                }} />
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                        <button
                            onClick={saveEmailSettings}
                            disabled={loading || saving}
                            style={{
                                flex: 1,
                                padding: "12px",
                                borderRadius: "12px",
                                background: "var(--accent-blue)",
                                color: "#fff",
                                border: "none",
                                fontWeight: 600,
                                fontSize: "14px",
                                cursor: "pointer",
                                opacity: saving ? 0.7 : 1,
                            }}
                        >
                            {saving ? "Saving..." : "Save Configuration"}
                        </button>
                        <button
                            onClick={handleTestEmail}
                            disabled={loading || testing || !notificationEmail}
                            style={{
                                padding: "12px 20px",
                                borderRadius: "12px",
                                background: "transparent",
                                color: "var(--accent-blue)",
                                border: "1px solid var(--accent-blue)",
                                fontWeight: 600,
                                fontSize: "14px",
                                cursor: "pointer",
                                opacity: testing ? 0.7 : 1,
                            }}
                        >
                            {testing ? "Testing..." : "Send Test Email"}
                        </button>
                    </div>

                    {testResult && (
                        <div style={{
                            padding: "12px",
                            borderRadius: "10px",
                            background: testResult.success ? "rgba(16,185,129,0.08)" : "rgba(244,63,94,0.08)",
                            border: `1px solid ${testResult.success ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.2)"}`,
                            color: testResult.success ? "var(--accent-emerald)" : "var(--accent-rose)",
                            fontSize: "13px",
                            textAlign: "center"
                        }}>
                            {testResult.message}
                        </div>
                    )}
                </div>
            </div>

            {/* Info Card */}
            <div
                style={{
                    marginTop: "24px",
                    background: "rgba(59,130,246,0.05)",
                    border: "1px solid rgba(59,130,246,0.15)",
                    borderRadius: "16px",
                    padding: "20px 24px",
                    maxWidth: "600px",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                }}
            >
                <strong style={{ color: "var(--accent-blue)" }}>ℹ️ How it works:</strong>
                <br />
                The Hire portal listens to this setting in <strong>real-time</strong> via Supabase Realtime.
                When you toggle maintenance mode, freelancers will <em>instantly</em> see the overlay — no page refresh needed.
            </div>
        </div>
    );
}
