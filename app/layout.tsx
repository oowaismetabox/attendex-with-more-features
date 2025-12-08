import './globals.css'  // Import at the top level
import "bootstrap/dist/css/bootstrap.min.css";
import type { Metadata } from "next";
import "./attendance/attendance1.css";
import "./superuser/attendance.css";
export const metadata: Metadata = {
  title: "Next App with Supabase",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
