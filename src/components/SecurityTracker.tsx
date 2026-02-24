"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendThreatAlert } from "@/app/actions/notifications";

export default function SecurityTracker() {
    const supabase = createClient();
    const requestCount = useRef(0);
    const lastRequestTime = useRef(Date.now());
    const geoCache = useRef<{ ip: string; country: string } | null>(null);
    const loggedEvents = useRef(new Set<string>());

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

        // Fetch GeoIP once via our own server-side proxy (no CORS issues)
        const fetchGeo = async () => {
            if (geoCache.current) return geoCache.current;
            try {
                const res = await fetch("/api/geo");
                if (res.ok) {
                    geoCache.current = await res.json();
                }
            } catch {
                // Silently fail
            }
            return geoCache.current || { ip: "0.0.0.0", country: "Unknown" };
        };

        const logEvent = async (eventType: string, metadata: any) => {
            try {
                // Deduplicate repetitive events (especially client-side logs)
                const eventKey = `${eventType}-${JSON.stringify(metadata)}`;
                if (loggedEvents.current.has(eventKey)) return;

                // For high-frequency events like 'click', we only log once per minute per target
                if (eventType === 'click') {
                    const clickKey = `click-${metadata.id || metadata.text || metadata.tag}`;
                    if (loggedEvents.current.has(clickKey)) return;
                    loggedEvents.current.add(clickKey);
                    setTimeout(() => loggedEvents.current.delete(clickKey), 60000);
                } else {
                    loggedEvents.current.add(eventKey);
                }

                const geo = await fetchGeo();
                const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));

                const { error: logError } = await supabase.from("security_audit_logs").insert({
                    user_id: user?.id || null,
                    subdomain: getSubdomain(),
                    event_type: eventType,
                    ip_address: geo.ip,
                    user_agent: navigator.userAgent,
                    country: geo.country,
                    metadata: {
                        ...metadata,
                        path: window.location.pathname,
                        timestamp: new Date().toISOString()
                    }
                });

                if (!logError && eventType === 'threat_detected') {
                    const { data: settings } = await supabase.from("site_settings").select("notification_email").eq("id", 1).maybeSingle();
                    if (settings?.notification_email) {
                        await sendThreatAlert({
                            threatType: metadata.threat_type || "unknown",
                            ip: geo.ip,
                            location: geo.country,
                            path: window.location.pathname,
                            adminEmail: settings.notification_email
                        });
                    }
                }
            } catch (err) {
                // Passive failure
            }
        };

        // 1. DDoS / Bot detection (Throttled)
        const checkDDoS = () => {
            const now = Date.now();
            if (now - lastRequestTime.current < 2000) { // 2s window
                requestCount.current++;
            } else {
                requestCount.current = 1;
            }
            lastRequestTime.current = now;

            if (requestCount.current > 15) {
                logEvent("threat_detected", { threat_type: "bot_activity", severity: "high", note: "Rapid interaction detected" });
                requestCount.current = 0; // Reset after logging
            }
        };

        // 2. Honeypot paths
        const honeypotPaths = ["/wp-admin", "/admin-php", "/.env", "/backup", "/wp-login.php"];
        if (honeypotPaths.some(p => window.location.pathname.startsWith(p))) {
            logEvent("threat_detected", { threat_type: "honeypot_access", severity: "critical" });
        }

        // 3. Initial Page View (One per session per path)
        const pathKey = `view-${window.location.pathname}`;
        if (!loggedEvents.current.has(pathKey)) {
            logEvent("page_view", { path: window.location.pathname });
            loggedEvents.current.add(pathKey);
        }

        // 4. Click Tracking (Throttled to interactive elements)
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const isInteractive = target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'INPUT' || target.closest('button') || target.closest('a');

            if (isInteractive) {
                checkDDoS();
                logEvent("click", {
                    tag: target.tagName,
                    text: target.innerText?.slice(0, 30).trim() || null,
                    id: target.id || null
                });
            }
        };

        window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, [supabase]);

    return null;
}
