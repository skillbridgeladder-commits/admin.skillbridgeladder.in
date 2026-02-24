import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Use ip-api.com (free, no API key, higher rate limit, CORS-friendly)
        const res = await fetch("http://ip-api.com/json/?fields=query,country", {
            headers: { "User-Agent": "SBL-Admin/1.0" },
        });
        if (!res.ok) throw new Error("GeoIP unavailable");
        const data = await res.json();
        return NextResponse.json({
            ip: data.query || "0.0.0.0",
            country: data.country || "Unknown",
        });
    } catch {
        return NextResponse.json({ ip: "0.0.0.0", country: "Unknown" });
    }
}
