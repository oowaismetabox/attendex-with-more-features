"use client";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signOut, getCurrentUser, isAuthenticated } from "@/lib/auth";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import './styles.css';

interface People {
  user_id: number;
  emp_code: string;
}

export default function Home() {
  const router = useRouter();
  const [people, setPeople] = useState<People[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<People[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [form, setForm] = useState<People>({
    user_id: 0,
    emp_code: "",
  });
  const [editUserId, setEditUserId] = useState<number | null>(null);

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      setCurrentUser(getCurrentUser());
    }
  }, [router]);

  // ---------------- Fetch People ----------------
  async function fetchPeople() {
    const { data, error } = await supabase.from("metapeople").select("*").order("user_id", { ascending: true });
    if (error) toast.error(`Failed to fetch: ${error.message}`);
    else setPeople(data || []);
  }

  useEffect(() => { fetchPeople(); }, []);

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

  // ---------------- Form Submit (Add / Update) ----------------
  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();

    // Validate form fields
    if (!form.user_id || form.user_id === 0) {
      toast.error("User ID is required");
      return;
    }

    if (!form.emp_code || form.emp_code.trim() === "") {
      toast.error("Employee Code is required");
      return;
    }

    if (editUserId !== null) {
      // ---------------- Update ----------------
      const { error } = await supabase
        .from("metapeople")
        .update({
          user_id: form.user_id,
          emp_code: form.emp_code,
        })
        .eq("user_id", editUserId);

      if (error) toast.error(`Update failed: ${error.message}`);
      else toast.success("Person updated successfully");

      setEditUserId(null);
    } else {
      // ---------------- Insert ----------------
      const { error } = await supabase
        .from("metapeople")
        .insert({
          user_id: form.user_id,
          emp_code: form.emp_code,
        });

      if (error) toast.error(`Insert failed: ${error.message}`);
      else toast.success("Person added successfully");
    }

    resetForm();
    fetchPeople();
  }

  function resetForm() {
    setForm({ user_id: 0, emp_code: "" });
  }

  // ---------------- Edit ----------------
  function handleStudentEdit(person: People, e: React.MouseEvent) {
    e.stopPropagation(); // Prevent row selection when clicking edit
    setForm(person);
    setEditUserId(person.user_id);
  }

  // ---------------- Delete Individual ----------------
  async function handleStudentDelete(user_id: number) {
    const confirm = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (confirm.isConfirmed) {
      const { error } = await supabase.from("metapeople").delete().eq("user_id", user_id);
      if (error) toast.error(`Delete failed: ${error.message}`);
      else toast.success("Person deleted successfully");

      fetchPeople();
    }
  }

  // ---------------- Delete Selected ----------------
  async function handleDeleteSelected() {
    if (selectedIds.length === 0) {
      toast.error("No rows selected");
      return;
    }

    const confirm = await Swal.fire({
      title: `Delete ${selectedIds.length} selected record(s)?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    });

    if (confirm.isConfirmed) {
      const { error } = await supabase.from("metapeople").delete().in("user_id", selectedIds);
      if (error) toast.error(`Delete failed: ${error.message}`);
      else toast.success(`Deleted ${selectedIds.length} record(s)`);

      setSelectedIds([]);
      fetchPeople();
    }
  }

  // ---------------- Row Selection (Toggle) ----------------
  function handleRowClick(userId: number) {
    setSelectedIds((prev) => 
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  // ---------------- Select All ----------------
  function handleSelectAll() {
    if (selectedIds.length === filteredPeople.length) setSelectedIds([]);
    else setSelectedIds(filteredPeople.map((p) => p.user_id));
  }

  // Don't render until authentication is checked
  if (!currentUser) {
    return null;
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="app-container">
        <div className="content-wrapper">
          <div className="flex-layout">
            {/* Left side form */}
            <div className="form-section">
              <div className="card">
                <div className="card-header">
                  <div>
                    <h4>Meta-black Management</h4>
                    <p style={{ fontSize: "12px", color: "#718096", marginTop: "4px" }}>
                      Logged in as: {currentUser.email}
                    </p>
                  </div>
                  <button
                    className="btn-delete"
                    onClick={handleSignOut}
                    style={{ marginLeft: "auto" }}
                  >
                    Sign Out
                  </button>
                  <button
                    className="btn-back"
                    onClick={() => router.push("/dashboard")}
                    style={{ marginLeft: "auto" }}
                  >
                    Go Back
                  </button>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label>user_id</label>
                    <input
                      type="number"
                      value={form.user_id || ""}
                      onChange={(e) =>
                        setForm({ ...form, user_id: Number(e.target.value) })
                      }
                      disabled={editUserId !== null}
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
                    {editUserId !== null ? "Update" : "Add"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right side table */}
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
                    {selectedIds.length > 0 && (
                      <button
                        className="btn-delete"
                        onClick={handleDeleteSelected}
                      >
                        Delete Selected ({selectedIds.length})
                      </button>
                    )}
                  </div>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            checked={
                              filteredPeople.length > 0 &&
                              selectedIds.length === filteredPeople.length
                            }
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th>user_id</th>
                        <th>emp_code</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPeople.map((singleperson) => (
                        <tr 
                          key={singleperson.user_id}
                          onClick={() => handleRowClick(singleperson.user_id)}
                          style={{ 
                            cursor: 'pointer',
                            backgroundColor: selectedIds.includes(singleperson.user_id) ? '#f0f9ff' : 'transparent'
                          }}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(singleperson.user_id)}
                              onChange={() => handleRowClick(singleperson.user_id)}
                            />
                          </td>
                          <td>{singleperson.user_id}</td>
                          <td>{singleperson.emp_code}</td>
                          <td>
                            <button
                              className="btn-edit"
                              onClick={(e) => handleStudentEdit(singleperson, e)}
                            >
                              Edit
                            </button>
                          </td>
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