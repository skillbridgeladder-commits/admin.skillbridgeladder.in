import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUBDOMAINS = [
    'https://skillbridgeladder.in',
    'https://media.skillbridgeladder.in',
    'https://tech.skillbridgeladder.in',
    'https://admin.skillbridgeladder.in',
    'https://hire.skillbridgeladder.in'
];

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');

    // Simple protection: Check for a secret key in header or URL
    // For Vercel Cron or similar services
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new Response('Unauthorized', { status: 401 });
    // }

    const results: any = {
        timestamp: new Date().toISOString(),
        pings: [],
        supabase: 'pending'
    };

    // 1. Ping Subdomains
    for (const url of SUBDOMAINS) {
        try {
            const start = Date.now();
            const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
            results.pings.push({
                url,
                status: res.status,
                responseTime: `${Date.now() - start}ms`,
                success: res.ok
            });
        } catch (err: any) {
            results.pings.push({
                url,
                error: err.message,
                success: false
            });
        }
    }

    // 2. Keep Supabase Alive (Execute a query)
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Perform a simple read to keep the database instance active
        const { data, error } = await supabase.from('site_settings').select('id').eq('id', 1).single();

        if (error) throw error;
        results.supabase = 'Active';
    } catch (err: any) {
        results.supabase = `Error: ${err.message}`;
    }

    return NextResponse.json(results);
}
