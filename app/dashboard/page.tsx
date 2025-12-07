// "use client";

// import { useRouter } from "next/navigation";

// export default function Page() {
//   const router = useRouter();

//   return (
//     <div >
//       <button
//         onClick={() => router.push("/usermap")}
        
//       >
//         User Mappings
//       </button>

//       <button
//         onClick={() => router.push("/attendance")}
//       >
//         Attendance Logs
//       </button>
//       <button
//         onClick={() => router.push("/admin_login")}
//       >
//         SUPERMAN
//       </button>
//       <button
//        onClick={() => router.push("/login")}>
//                       Sign Out
//                     </button>
//     </div>
//   );
// }


// "use client";
// import { useRouter } from "next/navigation";
// import "./dashboard.css";

// export default function Page() {
//   const router = useRouter();

//   return (
//     <div className="dashboard-container">
//       {/* Header */}
//       <header className="header">
//         <div className="logo-section">
//           <div className="logo-badge blackbox">
//             <span>B</span>
//           </div>
//           <span className="logo-text">BlackBox</span>
//           <div className="logo-badge metabox">
//             <span>M</span>
//           </div>
//           <span className="logo-text">MetaBox</span>
//         </div>
//         <div className="header-title">Attendance Dashboard</div>
//       </header>

//       {/* Main Content */}
//       <main className="main-content">
//         {/* Hero Section */}
//         <section className="hero-section">
//           <div className="hero-image">
//             <img
//                 src="/image/dashboard.jpg"
//                 alt="Team collaboration illustration"
//                 />
//           </div>
          
//           <div className="hero-content">
//             <div className="platform-badge">Unified HR Platform</div>
//             <h1 className="hero-title">
//               Effortless Workforce <br />
//               <span className="title-highlight">Attendance</span> <br />
//               <span className="title-highlight">Management</span>
//             </h1>
//             <p className="hero-description">
//               Unified HR and attendance tools designed for modern businesses.
//               Streamline employee tracking, optimize workforce planning, and gain
//               real-time insights.
//             </p>
//             <div className="features-list">
//               <div className="feature-item">
//                 <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                 </svg>
//                 <span>Real-time tracking</span>
//               </div>
//               <div className="feature-item">
//                 <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                 </svg>
//                 <span>Automated reports</span>
//               </div>
//               <div className="feature-item">
//                 <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
//                   <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
//                 </svg>
//                 <span>Cloud sync</span>
//               </div>
//             </div>
//           </div>
//         </section>

//         {/* Cards Section */}
//         <section className="cards-section">
//           <div className="card" onClick={() => router.push("/usermap")}>
//             <div className="card-icon user-icon">
//               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
//                 <circle cx="9" cy="7" r="4" />
//                 <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
//                 <path d="M16 3.13a4 4 0 0 1 0 7.75" />
//               </svg>
//             </div>
//             <h2 className="card-title">User Mapping</h2>
//             <p className="card-subtitle">Manage employee linking and profiles</p>
//             <p className="card-description">
//               Link employees across systems, manage profiles, and maintain accurate records for seamless workforce management.
//             </p>
//             <button className="card-button">
//               Get started →
//             </button>
//           </div>

//           <div className="card" onClick={() => router.push("/attendance")}>
//             <div className="card-icon attendance-icon">
//               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
//                 <line x1="16" y1="2" x2="16" y2="6" />
//                 <line x1="8" y1="2" x2="8" y2="6" />
//                 <line x1="3" y1="10" x2="21" y2="10" />
//               </svg>
//             </div>
//             <h2 className="card-title">Attendance Logs</h2>
//             <p className="card-subtitle">View real-time attendance records</p>
//             <p className="card-description">
//               Track check-ins, check-outs, and work hours with comprehensive logs and analytics for data-driven decisions.
//             </p>
//             <button className="card-button">
//               View logs →
//             </button>
//           </div>
//         </section>
//       </main>
//     </div>
//   );
// }

































"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, getCurrentUser, isAuthenticated } from "@/lib/auth";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import "./dashboard.css";

export default function Page() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      setCurrentUser(getCurrentUser());
    }
  }, [router]);

  // ---------------- Sign Out ----------------
  async function handleSignOut() {
    const confirm = await Swal.fire({
      title: "Sign Out?",
      text: "Are you sure you want to sign out?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, sign out",
      confirmButtonColor: "#dc2626",
    });

    if (confirm.isConfirmed) {
      signOut();
      toast.success("Signed out successfully");
      setTimeout(() => router.push("/login"), 1000);
    }
  }

  // Don't render until authentication is checked
  if (!currentUser) {
    return null;
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="dashboard-container">
        {/* Header */}
        <header className="header">
          <div className="logo-section">
            <div className="logo-badge blackbox">
              <span>B</span>
            </div>
            <span className="logo-text">BlackBox</span>
            <div className="logo-badge metabox">
              <span>M</span>
            </div>
            <span className="logo-text">MetaBox</span>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="user-email">{currentUser.email}</span>
            </div>
            <button className="btn-signout" onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          {/* Hero Section */}
          <section className="hero-section">
            <div className="hero-image">
              <img
                src="/image/dashboard.jpg"
                alt="Team collaboration illustration"
              />
            </div>
            
            <div className="hero-content">
              <div className="platform-badge">Unified HR Platform</div>
              <h1 className="hero-title">
                Effortless Workforce <br />
                <span className="title-highlight">Attendance</span> <br />
                <span className="title-highlight">Management</span>
              </h1>
              <p className="hero-description">
                Unified HR and attendance tools designed for modern businesses.
                Streamline employee tracking, optimize workforce planning, and gain
                real-time insights.
              </p>
              <div className="features-list">
                <div className="feature-item">
                  <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Real-time tracking</span>
                </div>
                <div className="feature-item">
                  <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Automated reports</span>
                </div>
                <div className="feature-item">
                  <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Cloud sync</span>
                </div>
              </div>
            </div>
          </section>

          {/* Cards Section */}
          <section className="cards-section">
            <div className="card-wrapper">
              <div className="card" onClick={() => router.push("/usermap")}>
                <div className="card-icon user-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h2 className="card-title">User Mapping</h2>
                <p className="card-subtitle">Manage employee linking and profiles</p>
                <p className="card-description">
                  Link employees across systems, manage profiles, and maintain accurate records for seamless workforce management.
                </p>
                <button className="card-button">
                  Get started →
                </button>
              </div>

              <div className="card" onClick={() => router.push("/attendance")}>
                <div className="card-icon attendance-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h2 className="card-title">Attendance Logs</h2>
                <p className="card-subtitle">View real-time attendance records</p>
                <p className="card-description">
                  Track check-ins, check-outs, and work hours with comprehensive logs and analytics for data-driven decisions.
                </p>
                <button className="card-button">
                  View logs →
                </button>
              </div>

              {/* Superman Admin Button */}
              <div className="card card-admin" onClick={() => router.push("/admin_login")}>
                <div className="card-icon superman-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h2 className="card-title">SUPERMAN</h2>
                <p className="card-subtitle">Advanced admin controls</p>
                <p className="card-description">
                  Access advanced administrative features and system-wide management tools.
                </p>
                <button className="card-button">
                  Enter →
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}