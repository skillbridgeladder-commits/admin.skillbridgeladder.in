"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";

const ADMIN_EMAIL = "skillbridgeladder@gmail.com";

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const [authed, setAuthed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    const supabase = createClient();

    useEffect(() => {
        const storedSession = localStorage.getItem("sbl_admin_session");
        setSessionId(storedSession);

        checkAuth(storedSession);

        // Periodically check if session is still valid (single device check)
        const interval = setInterval(() => checkAuth(storedSession), 30000);
        return () => clearInterval(interval);
    }, []);

    async function checkAuth(currentSessionId: string | null) {
        const { data: { user } } = await supabase.auth.getUser();

        if (user && user.email === ADMIN_EMAIL) {
            if (currentSessionId) {
                // Verify this session is the active one in DB
                const { data: sessions } = await supabase
                    .from("login_sessions")
                    .select("session_token, is_active")
                    .eq("user_id", user.id)
                    .eq("is_active", true)
                    .order("created_at", { ascending: false })
                    .limit(1);

                if (sessions && sessions.length > 0 && sessions[0].session_token !== currentSessionId) {
                    console.warn("Session invalidated by another device");
                    await supabase.auth.signOut();
                    localStorage.removeItem("sbl_admin_session");
                    setAuthed(false);
                    router.push("/");
                } else {
                    setAuthed(true);
                }
            } else {
                setAuthed(true);
            }
            setLoading(false);
        } else {
            setAuthed(false);
            setLoading(false);
        }
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        if (email.toLowerCase().trim() !== ADMIN_EMAIL) {
            setError("Access denied. This email is not authorized.");
            setSubmitting(false);
            return;
        }

        const { data, error: err } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password,
        });

        if (err) {
            setError(err.message);
        } else if (data.user) {
            // Create new session
            const newSessionId = crypto.randomUUID();
            localStorage.setItem("sbl_admin_session", newSessionId);
            setSessionId(newSessionId);

            // Deactivate old sessions and insert new one
            await supabase.from("login_sessions").update({ is_active: false }).eq("user_id", data.user.id);
            await supabase.from("login_sessions").insert({
                user_id: data.user.id,
                session_token: newSessionId,
                user_agent: navigator.userAgent,
                is_active: true
            });

            // Log the successful login
            await supabase.from("security_audit_logs").insert({
                user_id: data.user.id,
                subdomain: "admin",
                event_type: "login_success",
                user_agent: navigator.userAgent,
                metadata: { device: "desktop" }
            });

            setAuthed(true);
            router.push("/");
        }
        setSubmitting(false);
    }

    if (loading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-primary)", color: "var(--text-muted)" }}>
                Loading...
            </div>
        );
    }

    if (!authed) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-primary)" }}>
                <div style={{ width: "100%", maxWidth: "400px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "24px", padding: "40px" }}>
                    <div style={{ textAlign: "center", marginBottom: "28px" }}>
                        <img
                            src="/logo.jpg"
                            alt="SkillBridge Ladder"
                            style={{ width: "56px", height: "56px", borderRadius: "14px", objectFit: "cover", margin: "0 auto 14px", display: "block" }}
                        />
                        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>Admin Login</h1>
                        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
                            Restricted access — authorized personnel only
                        </p>
                    </div>

                    <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter admin email"
                                required
                                style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
                            />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={6}
                                style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid var(--border-subtle)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
                            />
                        </div>
                        {error && (
                            <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)", color: "var(--accent-rose)", fontSize: "13px" }}>
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1, marginTop: "4px" }}
                        >
                            {submitting ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <p style={{ textAlign: "center", fontSize: "11px", color: "var(--text-muted)", marginTop: "16px" }}>
                        🔒 Authorized access only. No registration available.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
