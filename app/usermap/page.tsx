"use client";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signOut, getCurrentUser, isAuthenticated } from "@/lib/auth";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import "./styles.css";

interface People {
  user_id: number;
  emp_code: string;
}

export default function Home() {
  const router = useRouter();
  const [people, setPeople] = useState<People[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<People[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [form, setForm] = useState<People>({
    user_id: 0,
    emp_code: "",
  });

  // ---------------- Authentication ----------------
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      setCurrentUser(getCurrentUser());

      const hasReloaded = sessionStorage.getItem("has-reloaded");
      if (!hasReloaded) {
        sessionStorage.setItem("has-reloaded", "true");
      }
    }
  }, [router]);

  useEffect(() => {
    return () => {
      sessionStorage.removeItem("has-reloaded");
    };
  }, [router]);

  // ---------------- Fetch People ----------------
  async function fetchPeople() {
    const { data, error } = await supabase
      .from("metapeople")
      .select("*")
      .order("user_id", { ascending: true });

    if (error) toast.error(`Failed to fetch: ${error.message}`);
    else setPeople(data || []);
  }

  useEffect(() => {
    fetchPeople();
  }, []);

  // ---------------- Search Filter ----------------
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    setFilteredPeople(
      people.filter((person) => {
        return (
          person.user_id.toString().includes(query) ||
          (person.emp_code?.toLowerCase() || "").includes(query)
        );
      })
    );
  }, [searchQuery, people]);

  // ---------------- Form Submit (Add Only) ----------------
  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();

    // Validate user_id (no zero, no negative)
    if (form.user_id <= 0) {
      toast.error("User ID must be greater than 0");
      return;
    }

    // Validate emp_code
    if (!form.emp_code || form.emp_code.trim() === "") {
      toast.error("Employee Code is required");
      return;
    }

    // ---------------- Insert ----------------
    const { error } = await supabase.from("metapeople").insert({
      user_id: form.user_id,
      emp_code: form.emp_code,
    });

    if (error) toast.error(`Insert failed: ${error.message}`);
    else toast.success("Person added successfully");

    resetForm();
    fetchPeople();
  }

  function resetForm() {
    setForm({ user_id: 0, emp_code: "" });
  }

  // ---------------- Prevent render until auth is ready ----------------
  if (!currentUser) {
    return null;
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="app-container">
        <div className="content-wrapper">
          <div className="flex-layout">
            {/* Left Form */}
            <div className="form-section">
              <div className="card">
                <div className="card-header">
                  <div>
                    <h4>User Mappings</h4>
                    <p style={{ fontSize: "12px", color: "#e8f4f0", marginTop: "4px" }}>
                      Metabox and Blackbox
                    </p>
                  </div>
                </div>

                <div className="card-body">
                  <div className="form-group">
                    <label>user_id</label>
                    <input
                      type="number"
                      min={1}
                      value={form.user_id || ""}
                      onChange={(e) =>
                        setForm({ ...form, user_id: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>emp_code</label>
                    <input
                      type="text"
                      value={form.emp_code || ""}
                      onChange={(e) =>
                        setForm({ ...form, emp_code: e.target.value })
                      }
                    />
                  </div>

                  <button className="btn-primary" onClick={handleFormSubmit}>
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Right Table */}
            <div className="table-section">
              <div className="card">
                <div className="card-header flex-between">
                  <h5>People List</h5>

                  <div className="search-actions">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>user_id</th>
                        <th>emp_code</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPeople.map((singleperson) => (
                        <tr key={singleperson.user_id}>
                          <td>{singleperson.user_id}</td>
                          <td>{singleperson.emp_code}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredPeople.length === 0 && (
                    <div className="no-records">No records found</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}