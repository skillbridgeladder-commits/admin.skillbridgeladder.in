import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return request.cookies.get(name)?.value },
                set(name: string, value: string, options: any) {
                    request.cookies.set({ name, value, ...options })
                    response = NextResponse.next({ request })
                    response.cookies.set({ name, value, ...options })
                },
                remove(name: string, options: any) {
                    request.cookies.set({ name, value: '', ...options })
                    response = NextResponse.next({ request })
                    response.cookies.set({ name, value: '', ...options })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Protect all routes except /auth (login) and static files
    const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
    const isPublicFile = request.nextUrl.pathname.match(/\.(.*)$/)

    if (!user && !isAuthPage && !isPublicFile) {
        return NextResponse.redirect(new URL('/auth', request.url))
    }

    // Double check admin role if possible (assuming admin email for now as per user logic)
    if (user && !isAuthPage && user.email !== 'veer@yourdomain.com') { // Using user's placeholder
        // For now, only redirecting to login if no user at all, 
        // but in a real scenario we'd check a 'role' column.
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
