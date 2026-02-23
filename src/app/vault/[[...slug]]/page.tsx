"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VaultAccessDenied from "@/components/VaultAccessDenied";

// Import sub-pages
import AdminDashboard from "@/app/page";
import UsersCRM from "@/app/users/page";
import JobsForms from "@/app/jobs/page";
import ChatHub from "@/app/chat/page";
import SecurityPage from "@/components/Security";
import SettingsPage from "@/app/settings/page";

const ADMIN_EMAIL = "skillbridgeladder@gmail.com";

export default function AdminVaultRouter() {
    const params = useParams();
    const slugParts = params.slug as string[] || [];
    const sessionSlug = slugParts[0];
    const pageType = slugParts[1] || "dashboard";

    const [authed, setAuthed] = useState(false);
    const [denied, setDenied] = useState(false);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        async function validateAdminSession() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || (user.email !== ADMIN_EMAIL && user.email !== "veer@yourdomain.com")) {
                router.push("/auth");
                return;
            }

            // Validate slug
            const { data: profile } = await supabase
                .from("profiles")
                .select("current_session_slug")
                .eq("id", user.id)
                .single();

            if (!profile || profile.current_session_slug !== sessionSlug) {
                console.warn("Invalid Admin Session Slug");
                setDenied(true);
                setLoading(false);
                return;
            }

            setAuthed(true);
            setLoading(false);
        }

        if (sessionSlug) {
            validateAdminSession();
        } else {
            // No slug provided, redirect to auth or show denied if they are supposed to be masked
            router.push("/auth");
        }
    }, [sessionSlug, supabase, router]);

    if (loading) return <div style={{ padding: "100px", textAlign: "center", color: "var(--text-muted)", background: "#0a0a0c", height: "100vh" }}>🔐 Accessing Secure Vault...</div>;

    if (denied) return <VaultAccessDenied />;
    if (!authed) return null;

    return (
        <div className="animate-fade-in">
            {pageType === "dashboard" && <AdminDashboard />}
            {pageType === "users" && <UsersCRM />}
            {pageType === "jobs" && <JobsForms />}
            {pageType === "chat" && <ChatHub />}
            {pageType === "security" && <SecurityPage />}
            {pageType === "settings" && <SettingsPage />}
        </div>
    );
}
