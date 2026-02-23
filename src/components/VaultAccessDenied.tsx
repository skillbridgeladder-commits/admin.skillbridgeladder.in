"use client";

import React from "react";
import Link from "next/link";

export default function VaultAccessDenied() {
    return (
        <div style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0c",
            color: "#fff",
            fontFamily: "var(--font-geist-sans), sans-serif",
            overflow: "hidden",
            position: "relative"
        }}>
            {/* Ambient Background Glow */}
            <div style={{
                position: "absolute",
                width: "400px",
                height: "400px",
                background: "rgba(239, 68, 68, 0.1)",
                filter: "blur(120px)",
                borderRadius: "50%",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 0
            }} />

            <div style={{
                maxWidth: "480px",
                width: "90%",
                textAlign: "center",
                zIndex: 1,
                padding: "40px",
                borderRadius: "32px",
                background: "rgba(20, 20, 22, 0.8)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)"
            }}>
                {/* Security Icon Container */}
                <div style={{
                    width: "80px",
                    height: "80px",
                    margin: "0 auto 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "24px",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    position: "relative"
                }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>

                    {/* Pulsing Ring */}
                    <div style={{
                        position: "absolute",
                        inset: "-4px",
                        borderRadius: "28px",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                    }} />
                </div>

                <h1 style={{
                    fontSize: "28px",
                    fontWeight: 800,
                    letterSpacing: "-0.5px",
                    marginBottom: "12px",
                    color: "#fff"
                }}>
                    Vault Access Denied
                </h1>

                <p style={{
                    fontSize: "15px",
                    color: "rgba(255,255,255,0.6)",
                    lineHeight: 1.6,
                    marginBottom: "32px"
                }}>
                    The session identifier provided is invalid or has expired.
                    Unauthorized access attempts are logged and monitored for system integrity.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <Link
                        href="/auth"
                        style={{
                            padding: "14px",
                            borderRadius: "16px",
                            background: "#ef4444",
                            color: "#fff",
                            fontSize: "15px",
                            fontWeight: 700,
                            textDecoration: "none",
                            transition: "all 0.2s",
                            boxShadow: "0 8px 20px rgba(239, 68, 68, 0.2)"
                        }}
                    >
                        Return to Authentication
                    </Link>

                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: "14px",
                            borderRadius: "16px",
                            background: "rgba(255,255,255,0.05)",
                            color: "rgba(255,255,255,0.8)",
                            fontSize: "14px",
                            fontWeight: 600,
                            border: "1px solid rgba(255,255,255,0.1)",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        🔄 Retry Session
                    </button>
                </div>

                <div style={{
                    marginTop: "32px",
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.3)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
                    Zero Trust Protocol Active
                </div>
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0; transform: scale(1.1); }
                }
            `}</style>
        </div>
    );
}
