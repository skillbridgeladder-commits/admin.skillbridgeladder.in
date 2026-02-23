"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
    const pathname = usePathname();
    const [sessionSlug, setSessionSlug] = useState("");

    useEffect(() => {
        const getSlug = () => {
            const match = document.cookie.match(/sbl_session_slug=([^;]+)/);
            if (match) {
                setSessionSlug(match[1]);
            } else {
                // If cookie is missing, wait a bit and retry (AuthGuard might be setting it)
                setTimeout(getSlug, 500);
            }
        };
        getSlug();
    }, []);

    const navItems = [
        { href: sessionSlug ? `/vault/${sessionSlug}/dashboard` : "#", label: "Dashboard", icon: "📊" },
        { href: sessionSlug ? `/vault/${sessionSlug}/users` : "#", label: "Users (CRM)", icon: "👥" },
        { href: sessionSlug ? `/vault/${sessionSlug}/jobs` : "#", label: "Jobs & Forms", icon: "📋" },
        { href: sessionSlug ? `/vault/${sessionSlug}/chat` : "#", label: "Chat Hub", icon: "💬" },
        { href: sessionSlug ? `/vault/${sessionSlug}/security` : "#", label: "Vault (Security)", icon: "🔐" },
        { href: sessionSlug ? `/vault/${sessionSlug}/settings` : "#", label: "Settings", icon: "⚙️" },
    ];

    return (
        <aside
            style={{
                width: "260px",
                height: "100vh",
                position: "fixed",
                top: 0,
                left: 0,
                background: "linear-gradient(180deg, #0f1629 0%, #0a0e1a 100%)",
                borderRight: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                padding: "0",
                zIndex: 50,
            }}
        >
            {/* Logo */}
            <div
                style={{
                    padding: "24px 20px",
                    borderBottom: "1px solid var(--border-subtle)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <img
                        src="/logo.jpg"
                        alt="SkillBridge Ladder"
                        style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "12px",
                            objectFit: "cover",
                        }}
                    />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: "16px", color: "var(--text-primary)" }}>
                            SkillBridge
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "1.5px", textTransform: "uppercase" }}>
                            Admin Panel
                        </div>
                    </div>
                </div>
            </div>

            {/* Nav Items */}
            <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "12px 16px",
                                borderRadius: "10px",
                                fontSize: "14px",
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? "#fff" : "var(--text-secondary)",
                                background: isActive
                                    ? "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.1))"
                                    : "transparent",
                                border: isActive ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
                                textDecoration: "none",
                                transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                                    e.currentTarget.style.color = "var(--text-primary)";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.color = "var(--text-secondary)";
                                }
                            }}
                        >
                            <span style={{ fontSize: "18px" }}>{item.icon}</span>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div
                style={{
                    padding: "16px 20px",
                    borderTop: "1px solid var(--border-subtle)",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                }}
            >
                SkillBridge Ladder © 2026
            </div>
        </aside>
    );
}
