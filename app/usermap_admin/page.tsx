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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState<People>({
    user_id: 0,
    emp_code: "",
  });

  const [editUserId, setEditUserId] = useState<number | null>(null);

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

  // ---------------- Form Submit (Add / Update) ----------------
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
      const { error } = await supabase.from("metapeople").insert({
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
    e.stopPropagation();
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
      const { error } = await supabase
        .from("metapeople")
        .delete()
        .eq("user_id", user_id);

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
      const { error } = await supabase
        .from("metapeople")
        .delete()
        .in("user_id", selectedIds);

      if (error) toast.error(`Delete failed: ${error.message}`);
      else toast.success(`Deleted ${selectedIds.length} record(s)`);

      setSelectedIds([]);
      fetchPeople();
    }
  }

  // ---------------- Export to CSV ----------------
  function exportToCSV() {
    if (filteredPeople.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Create CSV content
    const headers = ["user_id", "emp_code"];
    const csvContent = [
      headers.join(","),
      ...filteredPeople.map((person) =>
        [person.user_id, person.emp_code].join(",")
      ),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `people_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV exported successfully");
  }

  // ---------------- File Upload Handler ----------------
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["csv", "xlsx", "xls"];

    if (!fileExtension || !validExtensions.includes(fileExtension)) {
      toast.error("Please upload a valid file (CSV, XLSX, or XLS)");
      return;
    }

    setIsUploading(true);

    try {
      let records: People[] = [];

      if (fileExtension === "csv") {
        records = await parseCSV(file);
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        records = await parseExcel(file);
      }

      if (records.length === 0) {
        toast.error("No valid records found in file");
        setIsUploading(false);
        return;
      }

      // Validate records
      const validRecords = records.filter(
        (r) => r.user_id > 0 && r.emp_code && r.emp_code.trim() !== ""
      );

      if (validRecords.length === 0) {
        toast.error("No valid records found. Ensure user_id > 0 and emp_code is not empty");
        setIsUploading(false);
        return;
      }

      // Insert records
      const { error } = await supabase.from("metapeople").insert(validRecords);

      if (error) {
        toast.error(`Upload failed: ${error.message}`);
      } else {
        toast.success(
          `Successfully imported ${validRecords.length} record(s)${
            validRecords.length < records.length
              ? ` (${records.length - validRecords.length} invalid records skipped)`
              : ""
          }`
        );
        fetchPeople();
      }
    } catch (error: any) {
      toast.error(`Error processing file: ${error.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset input
    }
  }

  // ---------------- CSV Parser ----------------
  async function parseCSV(file: File): Promise<People[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            resolve([]);
            return;
          }

          // Get headers (first line)
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          // Find column indices
          const userIdIndex = headers.findIndex(h => 
            h === 'user_id' || h === 'userid' || h === 'user id' || h === 'id'
          );
          const empCodeIndex = headers.findIndex(h => 
            h === 'emp_code' || h === 'empcode' || h === 'emp code' || h === 'employee_code' || h === 'employee code'
          );

          if (userIdIndex === -1 || empCodeIndex === -1) {
            reject(new Error('Required columns not found. Please ensure your CSV has "user_id" and "emp_code" columns.'));
            return;
          }

          // Parse data rows
          const records: People[] = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length > Math.max(userIdIndex, empCodeIndex)) {
              const userId = parseInt(values[userIdIndex]);
              const empCode = values[empCodeIndex];
              
              if (!isNaN(userId) && empCode) {
                records.push({
                  user_id: userId,
                  emp_code: empCode
                });
              }
            }
          }

          resolve(records);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read CSV file"));
      reader.readAsText(file);
    });
  }

  // ---------------- Excel Parser ----------------
  async function parseExcel(file: File): Promise<People[]> {
    try {
      // Dynamic import of xlsx
      const XLSX = await import('xlsx');
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet);

            if (jsonData.length === 0) {
              resolve([]);
              return;
            }

            const records: People[] = jsonData.map((row: any) => {
              // Try different possible column names
              const userId = parseInt(
                row.user_id || row.User_ID || row.userId || row.UserId || 
                row.ID || row.id || row['User ID'] || row['user id'] || 0
              );
              
              const empCode = String(
                row.emp_code || row.Emp_Code || row.empCode || row.EmpCode || 
                row['Emp Code'] || row['emp code'] || row.employee_code || 
                row['Employee Code'] || ""
              ).trim();

              return {
                user_id: userId,
                emp_code: empCode
              };
            }).filter(r => r.user_id > 0 && r.emp_code);

            resolve(records);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error("Failed to read Excel file"));
        reader.readAsArrayBuffer(file);
      });
    } catch (error) {
      toast.error("Excel library not available. Please install xlsx: npm install xlsx");
      return [];
    }
  }

  // ---------------- Row Selection ----------------
  function handleRowClick(userId: number) {
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  function handleSelectAll() {
    if (selectedIds.length === filteredPeople.length) setSelectedIds([]);
    else setSelectedIds(filteredPeople.map((p) => p.user_id));
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

                  {/* File Upload Section */}
                  <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" }}>
                    <label
                      htmlFor="file-upload"
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#333",
                      }}
                    >
                      Import from File
                    </label>
                    
                    {/* Hidden file input */}
                    <input
                      id="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      style={{ display: "none" }}
                    />
                    
                    {/* Custom styled button */}
                    <button
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={isUploading}
                      style={{
                        width: "100%",
                        padding: "10px",
                        background: isUploading 
                          ? "linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)"
                          : "linear-gradient(135deg, #5fb3a1 0%, #4a9d8e 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "16px",
                        cursor: isUploading ? "not-allowed" : "pointer",
                        marginTop: "5px",
                        transition: "all 0.3s ease",
                      }}
                      onMouseOver={(e) => {
                        if (!isUploading) {
                          e.currentTarget.style.background = "linear-gradient(135deg, #4a9d8e 0%, #3d8577 100%)";
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = "0 4px 8px rgba(95, 179, 161, 0.3)";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isUploading) {
                          e.currentTarget.style.background = "linear-gradient(135deg, #5fb3a1 0%, #4a9d8e 100%)";
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "none";
                        }
                      }}
                      onMouseDown={(e) => {
                        if (!isUploading) {
                          e.currentTarget.style.transform = "translateY(0)";
                        }
                      }}
                    >
                      {isUploading ? "Processing..." : "Choose File"}
                    </button>
                    
                    <p style={{ fontSize: "12px", color: "#6c757d", marginTop: "6px", lineHeight: "1.5" }}>
                      Supported: CSV, XLSX, XLS<br />
                      Required columns: <strong>user_id</strong>, <strong>emp_code</strong>
                    </p>
                  </div>
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

                    <button 
                      className="btn-export" 
                      onClick={exportToCSV}
                    >
                      Export CSV
                    </button>

                    {selectedIds.length > 0 && (
                      <button className="btn-delete" onClick={handleDeleteSelected}>
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
                            cursor: "pointer",
                            backgroundColor: selectedIds.includes(singleperson.user_id)
                              ? "#f0f9ff"
                              : "transparent",
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