import './globals.css'  // Import at the top level
import "bootstrap/dist/css/bootstrap.min.css";
import type { Metadata } from "next";
// import "./attendance/attendance1.css";
// import "./superuser/attendance.css";
export const metadata: Metadata = {
  title: "Attendex",
};

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en">
//       <body>{children}</body>
//     </html>
//   );
// }
// app/layout.tsx

import './globals.css'
import { PostHogProvider } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  )
}