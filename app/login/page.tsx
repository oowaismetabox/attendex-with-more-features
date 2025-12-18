"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import "./login.css";

interface SignInResponse {
  success: boolean;
  message?: string;
  admin?: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const res: SignInResponse = await signIn(email, password);

      if (!res.success) {
        setErrorMsg(res.message || "Login failed");
        toast.error(res.message || "Login failed");
        setLoading(false);
        return;
      }

      // toast.success("Signed in successfully");

      // Redirect based on admin status from Supabase
      setTimeout(() => {
        if (res.admin === true) {
          router.push("/admin_dashboard");
        } else {
          router.push("/dashboard");
        }
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      setErrorMsg(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h2>Welcome Back</h2>
            <p>Sign in to Attendex</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-container">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {errorMsg && <p style={{ color: "red", marginTop: "12px", textAlign: "center" }}>{errorMsg}</p>}

            <p className="signup-link">
              Don't have an account?{" "}
              <Link href="/signup">Sign up</Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}