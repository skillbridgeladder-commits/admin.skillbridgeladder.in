"use client";

import React from "react";

/**
 * This page serves as a mounting point for the AdminAuthGuard.
 * Since the Guard is in the RootLayout, it will automatically
 * show the login form if the user is not authenticated.
 */
export default function AuthPage() {
    return (
        <div style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-primary)",
            color: "var(--text-muted)"
        }}>
            <div className="animate-pulse">
                🔐 Securing Connection...
            </div>
        </div>
    );
}
