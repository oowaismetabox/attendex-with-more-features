// "use client";

// import { useState, FormEvent } from "react";
// import { useRouter } from "next/navigation";
// import toast, { Toaster } from "react-hot-toast";
// import { signIn } from "@/lib/auth";
// import './admin.css';

// const ADMIN_PASSWORD = "METABOX123";

// export default function LoginPage() {
//   const router = useRouter();
//   const [password, setPassword] = useState("");
//   const [isLoading, setIsLoading] = useState(false);

//   // ---------------- Handle Login ----------------
//   async function handleLogin(e: FormEvent) {
//     e.preventDefault();
    
//     if (!password || password.trim() === "") {
//       toast.error("Password is required");
//       return;
//     }

//     setIsLoading(true);

//     // Simulate a small delay for better UX
//     setTimeout(() => {
//       if (password === ADMIN_PASSWORD) {
//         // Store authentication in localStorage
//         const user = {
//           email: "admin@metabox.com",
//           role: "admin",
//           loginTime: new Date().toISOString()
//         };
        
//     ;
//         toast.success("Login successful!");
        
//         setTimeout(() => {
//           router.push("/superuser");
//         }, 500);
//       } else {
//         toast.error("Incorrect password");
//         setIsLoading(false);
//       }
//     }, 500);
//   }

//   return (
//     <>
//       <Toaster position="top-center" />
//       <div className="login-container">
//         <div className="login-wrapper">
//           <div className="login-card">
//             <div className="login-header">
//               <div className="logo-section">
//                 <div className="logo-badge blackbox">
//                   <span>B</span>
//                 </div>
//                 <div className="logo-badge metabox">
//                   <span>M</span>
//                 </div>
//               </div>
//               <h2>Admin Login</h2>
//               <p>Enter your password to access the attendance dashboard</p>
//             </div>

//             <form onSubmit={handleLogin} className="login-form">
//               <div className="form-group">
//                 <label htmlFor="password">Password</label>
//                 <input
//                   id="password"
//                   type="password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   placeholder="Enter admin password"
//                   autoFocus
//                   disabled={isLoading}
//                 />
//               </div>

//               <button 
//                 type="submit" 
//                 className="btn-login"
//                 disabled={isLoading}
//               >
//                 {isLoading ? "Logging in..." : "Login"}
//               </button>
//               <button className="btn-login" style={{ marginTop: "10px", color: "#ff0000ff"   }} onClick={() => router.push("/dashboard")}>
//                       Go Back
//               </button>
//             </form>

//             <div className="login-footer">
//               <p>MetaBox Attendance Management System</p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { signIn } from "@/lib/auth";
import './admin.css';

const ADMIN_PASSWORD = "METABOX123";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ---------------- Handle Login ----------------
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    
    if (!password || password.trim() === "") {
      toast.error("Password is required");
      return;
    }

    setIsLoading(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        // Store authentication in localStorage
        const user = {
          email: "admin@metabox.com",
          role: "admin",
          loginTime: new Date().toISOString()
        };
        
    ;
        toast.success("Login successful!");
        
        setTimeout(() => {
          router.push(`/superuser?timestamp=${Date.now()}`);
        }, 500);
      } else {
        toast.error("Incorrect password");
        setIsLoading(false);
      }
    }, 500);
  }

  return (
    <>
      <Toaster position="top-center" />
      <button 
        className="btn-back" 
        onClick={() => router.push("/dashboard")}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          padding: "8px 16px",
          backgroundColor: "#f0f0f0",
          border: "1px solid #ddd",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "500",
          color: "#333",
          transition: "all 0.3s ease"
        }}
      >
        ← Go Back
      </button>
      
      <div className="login-container">
        <div className="login-wrapper">
          <div className="login-card">
            <div className="login-header">
              <div className="logo-section">
                <div className="logo-badge blackbox">
                  <span>B</span>
                </div>
                <div className="logo-badge metabox">
                  <span>M</span>
                </div>
              </div>
              <h2>Admin Login</h2>
              <p>Enter your password to access the attendance dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoFocus
                  disabled={isLoading}
                />
              </div>

              <button 
                type="submit" 
                className="btn-login"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </button>
            </form>

            <div className="login-footer">
              <p>MetaBox Attendance Management System</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}