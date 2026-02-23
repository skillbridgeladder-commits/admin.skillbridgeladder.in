import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AdminAuthGuard from "@/components/AdminAuthGuard";
import SecurityTracker from "@/components/SecurityTracker";

export const metadata: Metadata = {
  title: "SBL Admin — Control Center",
  description: "SkillBridge Ladder Admin CRM & Management Dashboard",
  icons: { icon: "/fevicon.png" },
};

import AdminBot from "@/components/AdminBot";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/fevicon.png" type="image/png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <SecurityTracker />
        <AdminAuthGuard>
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
            <main
              style={{
                flex: 1,
                marginLeft: "260px",
                padding: "32px",
                minHeight: "100vh",
              }}
            >
              {children}
            </main>
          </div>
          <AdminBot />
        </AdminAuthGuard>
      </body>
    </html>
  );
}
