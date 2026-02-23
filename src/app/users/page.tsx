"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Profile {
    id: string;
    full_name: string;
    email: string;
    created_at: string;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const supabase = createClient();

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        setLoading(true);
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching users:", error);
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    }

    const filteredUsers = users.filter((u) =>
        (u.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
        (u.email?.toLowerCase() || "").includes(search.toLowerCase())
    );

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "4px" }}>User Management (CRM)</h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                        Manage registered freelancers and applicant profiles
                    </p>
                </div>
                <div style={{ textAlign: "right", color: "var(--text-secondary)", fontSize: "13px" }}>
                    <strong>{users.length}</strong> Registered Users
                </div>
            </div>

            {/* Actions / Search */}
            <div style={{
                marginBottom: "24px",
                background: "var(--bg-card)",
                padding: "20px",
                borderRadius: "16px",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                gap: "16px",
                alignItems: "center"
            }}>
                <div style={{ position: "relative", flex: 1 }}>
                    <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "16px" }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "12px 12px 12px 40px",
                            borderRadius: "10px",
                            background: "var(--bg-secondary)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                            fontSize: "14px",
                            outline: "none"
                        }}
                    />
                </div>
                <button
                    onClick={fetchUsers}
                    style={{
                        padding: "12px 20px",
                        borderRadius: "10px",
                        background: "rgba(59,130,246,0.08)",
                        color: "var(--accent-blue)",
                        border: "1px solid rgba(59,130,246,0.15)",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer"
                    }}
                >
                    Refresh List
                </button>
            </div>

            {/* Table */}
            <div style={{
                background: "var(--bg-card)",
                borderRadius: "16px",
                border: "1px solid var(--border-subtle)",
                overflow: "hidden"
            }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                    <thead>
                        <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                            <th style={{ textAlign: "left", padding: "16px", fontWeight: 600, color: "var(--text-muted)" }}>User</th>
                            <th style={{ textAlign: "left", padding: "16px", fontWeight: 600, color: "var(--text-muted)" }}>Status</th>
                            <th style={{ textAlign: "left", padding: "16px", fontWeight: 600, color: "var(--text-muted)" }}>Joined Date</th>
                            <th style={{ textAlign: "right", padding: "16px", fontWeight: 600, color: "var(--text-muted)" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading user data...</td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No users found matching your search.</td>
                            </tr>
                        ) : filteredUsers.map((user) => (
                            <tr key={user.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                <td style={{ padding: "16px" }}>
                                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{user.full_name || "Unset Name"}</div>
                                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{user.email}</div>
                                </td>
                                <td style={{ padding: "16px" }}>
                                    <span style={{
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        background: "rgba(16,185,129,0.08)",
                                        color: "var(--accent-emerald)",
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        textTransform: "uppercase"
                                    }}>
                                        Active
                                    </span>
                                </td>
                                <td style={{ padding: "16px", color: "var(--text-secondary)" }}>
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td style={{ padding: "16px", textAlign: "right" }}>
                                    <button style={{
                                        padding: "6px 12px",
                                        borderRadius: "8px",
                                        background: "transparent",
                                        border: "1px solid var(--border-subtle)",
                                        color: "var(--text-secondary)",
                                        fontSize: "12px",
                                        cursor: "pointer"
                                    }}>
                                        View Details
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
