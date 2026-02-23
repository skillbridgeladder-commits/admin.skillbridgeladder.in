"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendThreatAlert } from "@/app/actions/notifications";

export default function SecurityTracker() {
    const supabase = createClient();
    const requestCount = useRef(0);
    const lastRequestTime = useRef(Date.now());

    useEffect(() => {
        const getSubdomain = () => {
            const hostname = window.location.hostname;
            if (hostname.includes("hire.")) return "hire";
            if (hostname.includes("tech.")) return "tech";
            if (hostname.includes("media.")) return "media";
            if (hostname.includes("localhost")) {
                if (window.location.port === "3000") return "hire";
                if (window.location.port === "3001") return "admin";
            }
            return "admin";
        };

        const logEvent = async (eventType: string, metadata: any) => {
            try {
                // GeoIP fetching with timeout & fallback
                let country = "Unknown";
                let ip = "0.0.0.0";
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

                    const geoRes = await fetch("https://ipapi.co/json/", { signal: controller.signal });
                    if (geoRes.ok) {
                        const geoData = await geoRes.json();
                        country = geoData.country_name || "Unknown";
                        ip = geoData.ip || "0.0.0.0";
                    }
                    clearTimeout(timeoutId);
                } catch (e) {
                    console.log("GeoIP service unavailable, using defaults.");
                }

                // Ensure we get a user if logged in, otherwise it's an anon visitor
                const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

                const { data: logData, error: logError } = await supabase.from("security_audit_logs").insert({
                    user_id: user?.id || null,
                    subdomain: getSubdomain(),
                    event_type: eventType,
                    ip_address: ip, // Log the IP explicitly
                    user_agent: navigator.userAgent,
                    country: country,
                    metadata: {
                        ...metadata,
                        path: window.location.pathname,
                        timestamp: new Date().toISOString()
                    }
                }).select().single();

                if (!logError && eventType === 'threat_detected') {
                    // Fetch admin notification email
                    const { data: settings } = await supabase.from("site_settings").select("notification_email").eq("id", 1).single();
                    if (settings?.notification_email) {
                        await sendThreatAlert({
                            threatType: metadata.threat_type || "unknown",
                            ip: ip,
                            location: country,
                            path: window.location.pathname,
                            adminEmail: settings.notification_email
                        });
                    }
                }
            } catch (err) {
                // Silently fail to not interrupt user experience
            }
        };

        // 1. DDoS / Rate Limiting (Client-side detection)
        const checkDDoS = () => {
            const now = Date.now();
            if (now - lastRequestTime.current < 1000) {
                requestCount.current++;
            } else {
                requestCount.current = 1;
            }
            lastRequestTime.current = now;

            if (requestCount.current > 10) { // More than 10 events per second
                logEvent("threat_detected", { threat_type: "ddos_attempt", severity: "critical", note: "High frequency interaction detected" });
            }
        };

        // 2. Bot Honeypot detection
        const honeypotPaths = ["/wp-admin", "/admin-php", "/.env", "/config", "/backup", "/wp-login.php"];
        if (honeypotPaths.some(p => window.location.pathname.startsWith(p))) {
            logEvent("threat_detected", { threat_type: "honeypot_access", severity: "high" });
        }

        // 3. Track Page View
        logEvent("page_view", { href: window.location.href });

        // 4. Track Clicks & Form interactions
        const handleClick = (e: MouseEvent) => {
            checkDDoS();
            const target = e.target as HTMLElement;
            logEvent("click", {
                tag: target.tagName,
                id: target.id || null,
                text: target.innerText?.slice(0, 50).trim() || null,
                classes: target.className?.toString() || null
            });
        };

        // Form Analysis Logic
        const handleInput = (e: Event) => {
            const target = e.target as HTMLInputElement | HTMLTextAreaElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
                // Try to find a label or some descriptive text
                let fieldName = target.name || target.id;
                if (!fieldName) {
                    const label = document.querySelector(`label[for="${target.id}"]`) || target.closest('label');
                    fieldName = label?.textContent?.trim().slice(0, 30) || target.placeholder || "unnamed_field";
                }

                logEvent("form_interaction", {
                    field: fieldName,
                    type: target.type || target.tagName.toLowerCase()
                });
            }
        };

        window.addEventListener("click", handleClick);
        window.addEventListener("input", handleInput);

        return () => {
            window.removeEventListener("click", handleClick);
            window.removeEventListener("input", handleInput);
        };
    }, []);

    return null;
}
