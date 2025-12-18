"use client"
import { signOut, getCurrentUser, isAuthenticated } from "@/lib/auth";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { useState, useEffect, Suspense, lazy } from 'react';
import './home.css';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logo from '@/public/image/logo.svg';

const AttendancePage = lazy(() => import('@/app/attendance/page'));
const UsermapPage = lazy(() => import('@/app/usermap/page'));

export default function Home() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState('attendance');
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pageLoaded, setPageLoaded] = useState(false);
  // Check authentication and load last opened page (only on client side)
  useEffect(() => {
  if (!isAuthenticated()) {
    router.push("/login");
    return;
  }

  setIsClient(true);
  setCurrentUser(getCurrentUser());
  
  // Always start on attendance page (hardcoded)
  setCurrentPage('attendance');
  localStorage.setItem('currentPage', 'attendance');
  setPageLoaded(true);
}, [router]);
  // Save the clicked page
  const handlePageChange = (page: string) => {
    console.log('Changing page to:', page); // Debug log
    setCurrentPage(page);
    localStorage.setItem('currentPage', page);
  };

  // Sign out and redirect to sign-in
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
      localStorage.removeItem('currentPage'); // Clear saved page on logout
      setTimeout(() => router.push("/login"), 1000);
    }
  }

  // Don't render until client is ready and authenticated
  if (!isClient || !currentUser) {
    return null;
  }

  return (
    <div className="layoutContainer">
      <Toaster position="top-center" />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logoSection">
          <Image src={logo} alt="Logo" fill style={{ objectFit: 'contain' }} />
        </div>

        <div className="divider"></div>

        <nav className="navMenu">
          <button
            onClick={() => handlePageChange('attendance')}
            className={`navItem ${currentPage === 'attendance' ? 'active' : ''}`}
          >
            <span className="icon">📋</span>
            <span className="label">Attendance Log</span>
          </button>

          <button
            onClick={() => handlePageChange('usermap')}
            className={`navItem ${currentPage === 'usermap' ? 'active' : ''}`}
          >
            <span className="icon">👤</span>
            <span className="label">User Map</span>
          </button>
        </nav>

        <div className="divider"></div>

        <div className="userSection">
          <p className="userEmail">{currentUser.email}</p>
          <button className="signOutBtn" onClick={handleSignOut}>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="mainContent">
        <div className="pageContainer">
          <Suspense fallback={<div className="loadingState">Loading...</div>}>
            {currentPage === 'attendance' && <AttendancePage />}
            {currentPage === 'usermap' && <UsermapPage />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}