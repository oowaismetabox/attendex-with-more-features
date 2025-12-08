"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signOut, getCurrentUser, isAuthenticated } from "@/lib/auth";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
// import './attendance1.css';
//  window.location.reload();


interface Record {
  id: number;
  user_id: number;
  timestamp: string;
  device_ip: string;
  synced_to_zoho: boolean;
  synced_at: string | null;
  zoho_sync_error: string | null;
  check_type: string;
  synthetic: boolean;
  paired_with: number | null;
}

const RECORDS_PER_PAGE = 50;

export default function SyntheticRecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<Record[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<Record[]>([]);
  const [displayedRecords, setDisplayedRecords] = useState<Record[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [editTimestamp, setEditTimestamp] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

useEffect(() => {
  if (!isAuthenticated()) {
    router.push("/login");
  } else {
    setCurrentUser(getCurrentUser());

    const hasReloaded = sessionStorage.getItem("has-reloaded");
    if (!hasReloaded) {
      sessionStorage.setItem("has-reloaded", "true");
      window.location.reload();
    }
  }
}, [router]);
useEffect(() => {
  return () => {
    sessionStorage.removeItem("has-reloaded");
  };
}, []);
  // ---------------- Fetch Records with Pagination ----------------
  async function fetchRecords(page: number = 1, append: boolean = false) {
    setIsLoading(true);
    const from = (page - 1) * RECORDS_PER_PAGE;
    const to = from + RECORDS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from("attendance")
      .select("*", { count: 'exact' })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      toast.error(`Failed to fetch: ${error.message}`);
      setIsLoading(false);
      return;
    }

    if (append) {
      setRecords((prev) => [...prev, ...(data || [])]);
    } else {
      setRecords(data || []);
    }

    const totalRecords = count || 0;
    setHasMore(totalRecords > page * RECORDS_PER_PAGE);
    setIsLoading(false);
  }

  useEffect(() => {
    fetchRecords(1, false);
  }, []);

  // ---------------- Load More Records ----------------
  function handleLoadMore() {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchRecords(nextPage, true);
  }

  // ---------------- Search Filter ----------------
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = records.filter((record) => {
      const checkType = typeof record.check_type === 'string' ? record.check_type.toLowerCase() : '';
      const deviceIp = typeof record.device_ip === 'string' ? record.device_ip.toLowerCase() : '';

      return (
        record.id.toString().includes(query) ||
        record.user_id.toString().includes(query) ||
        deviceIp.includes(query) ||
        checkType.includes(query)
      );
    });
    setFilteredRecords(filtered);
  }, [searchQuery, records]);

  // ---------------- Paginate Filtered Records ----------------
  useEffect(() => {
    if (searchQuery) {
      setDisplayedRecords(filteredRecords);
    } else {
      setDisplayedRecords(filteredRecords);
    }
  }, [filteredRecords, searchQuery]);

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

  // ---------------- Form Submit (Update Timestamp Only) ----------------
  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingRecord) return;

    if (!editTimestamp || editTimestamp.trim() === "") {
      toast.error("Timestamp is required");
      return;
    }

    // Update only timestamp and set synthetic to false, paired_with to null
    const { error: updateError } = await supabase
      .from("attendance")
      .update({
        timestamp: editTimestamp,
        synthetic: false,
        paired_with: null
      })
      .eq("id", editingRecord.id);

    if (updateError) {
      toast.error(`Update failed: ${updateError.message}`);
      return;
    }

    // Update local state instead of reloading
    const updatedRecord: Record = {
      ...editingRecord,
      timestamp: editTimestamp,
      synthetic: false,
      paired_with: null
    };

    // Update the record in the records array
    setRecords((prev) =>
      prev.map((r) => (r.id === editingRecord.id ? updatedRecord : r))
    );

    toast.success("Record updated successfully");
    handleCancelEdit();
  }

  // ---------------- Edit (Only Synthetic Records) ----------------
  function handleRecordEdit(record: Record, e: React.MouseEvent) {
    e.stopPropagation();

    if (!record.synthetic) {
      toast.error("Only synthetic records can be edited");
      return;
    }

    setEditingRecord(record);

    // Convert timestamp to datetime-local format
    const date = new Date(record.timestamp);
    const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditTimestamp(localDateTime);
  }

  // ---------------- Cancel Edit ----------------
  function handleCancelEdit() {
    setEditingRecord(null);
    setEditTimestamp("");
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
        .from("attendance")
        .delete()
        .in("id", selectedIds);

      if (error) toast.error(`Delete failed: ${error.message}`);
      else toast.success(`Deleted ${selectedIds.length} record(s)`);

      setSelectedIds([]);
      // Update local state to remove deleted records
      setRecords((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
    }
  }

  // ---------------- Row Selection (Toggle) ----------------
  function handleRowClick(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  // ---------------- Select All ----------------
  function handleSelectAll() {
    if (selectedIds.length === displayedRecords.length) setSelectedIds([]);
    else setSelectedIds(displayedRecords.map((r) => r.id));
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
            {/* Left side form - Only shown when editing synthetic records */}
            {editingRecord && (
              <div className="form-section">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h4>Edit Synthetic Record</h4>
                      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", marginTop: "4px" }}>
                        Editing record ID: {editingRecord.id}
                      </p>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="form-group">
                      <label>ID (Read-only)</label>
                      <input
                        type="number"
                        value={editingRecord.id ?? ""}
                        disabled
                        style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>User ID (Read-only)</label>
                      <input
                        type="number"
                        value={editingRecord.user_id ?? ""}
                        disabled
                        style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Timestamp (Editable) *</label>
                      <input
                        type="datetime-local"
                        value={editTimestamp}
                        onChange={(e) => setEditTimestamp(e.target.value)}
                        required
                        style={{ borderColor: "#3b82f6", borderWidth: "2px" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Device IP (Read-only)</label>
                      <input
                        type="text"
                        value={editingRecord.device_ip ?? ""}
                        disabled
                        style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Check Type (Read-only)</label>
                      <input
                        type="text"
                        value={editingRecord.check_type ?? ""}
                        disabled
                        style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Synthetic (Read-only)</label>
                      <input
                        type="text"
                        value="Yes"
                        disabled
                        style={{ backgroundColor: "#d1fae5", cursor: "not-allowed" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Paired With (Read-only)</label>
                      <input
                        type="text"
                        value={editingRecord.paired_with ?? "—"}
                        disabled
                        style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
                      />
                    </div>

                    <div style={{ padding: "12px", backgroundColor: "#fef3c7", borderRadius: "6px", marginBottom: "16px", fontSize: "13px", color: "#92400e" }}>
                      <strong>Note:</strong> Updating the timestamp will automatically set synthetic to false and clear the paired record reference.
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn-primary"
                        onClick={handleFormSubmit}
                        style={{ flex: 1 }}
                      >
                        Update Timestamp
                      </button>
                      <button
                        className="btn-delete"
                        onClick={handleCancelEdit}
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Right side table */}
         
            <div className="table-section" style={{ flex: editingRecord ? "1" : "1" }}>
              <div className="card">
                <div className="card-header flex-between">
                  <div>
                    <h5>Records List</h5>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", marginTop: "4px" }}>
                      Logged in as: {currentUser.email} | Showing {displayedRecords.length} of {records.length} loaded records
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button className="btn-back" onClick={() => router.push("/dashboard")}>
                      Go Back
                    </button>
                    <button className="btn-delete" onClick={handleSignOut}>
                      Sign Out
                    </button>
                  </div>
                </div>

                <div className="card-header flex-between" style={{ paddingTop: 0 }}>
                  <div className="search-actions" style={{ width: "100%", justifyContent: "space-between" }}>
                    <div className="search-container">
                      <input
                        type="text"
                        placeholder="Search by ID, User ID, Device IP, or Check Type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <span className="search-icon">🔍</span>
                    </div>
                    {selectedIds.length > 0 && (
                      <button className="btn-delete with-badge" onClick={handleDeleteSelected}>
                        <span>🗑️ Delete Selected</span>
                        <span className="delete-badge">{selectedIds.length}</span>
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
                            checked={displayedRecords.length > 0 && selectedIds.length === displayedRecords.length}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th>ID</th>
                        <th>User ID</th>
                        <th>Timestamp</th>
                        <th>Device IP</th>
                        <th>Check Type</th>
                        <th>Synthetic</th>
                        <th>Synced</th>
                        <th>Paired</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedRecords.map((record) => (
                        <tr
                          key={record.id}
                          onClick={() => handleRowClick(record.id)}
                          style={{
                            cursor: 'pointer',
                            backgroundColor: selectedIds.includes(record.id) ? '#f0f9ff' : editingRecord?.id === record.id ? '#fef3c7' : 'transparent'
                          }}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(record.id)}
                              onChange={() => handleRowClick(record.id)}
                            />
                          </td>
                          <td>{record.id}</td>
                          <td>{record.user_id}</td>
                          <td>{new Date(record.timestamp).toLocaleString()}</td>
                          <td>{record.device_ip}</td>
                          <td>{record.check_type}</td>
                          <td>
                            <span style={{ color: record.synthetic ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                              {record.synthetic ? '✓' : '✗'}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: record.synced_to_zoho ? '#10b981' : '#6b7280' }}>
                              {record.synced_to_zoho ? '✓' : '✗'}
                            </span>
                          </td>
                          <td>{record.paired_with || '-'}</td>
                          <td>
                            <button
                              className="btn-edit"
                              onClick={(e) => handleRecordEdit(record, e)}
                              disabled={!record.synthetic}
                              style={{
                                opacity: record.synthetic ? 1 : 0.5,
                                cursor: record.synthetic ? 'pointer' : 'not-allowed'
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {displayedRecords.length === 0 && (
                    <div className="no-records">No records found</div>
                  )}
                </div>

                {/* Load More Button */}
                {!searchQuery && hasMore && (
                  <div style={{ padding: "16px", textAlign: "center", borderTop: "1px solid #e5e7eb" }}>
                    <button
                      className="btn-primary"
                      onClick={handleLoadMore}
                      disabled={isLoading}
                      style={{
                        minWidth: "200px",
                        opacity: isLoading ? 0.6 : 1,
                        cursor: isLoading ? "not-allowed" : "pointer"
                      }}
                    >
                      {isLoading ? "Loading..." : `Load More Records (${RECORDS_PER_PAGE})`}
                    </button>
                  </div>
                )}

                {!searchQuery && !hasMore && records.length > 0 && (
                  <div style={{ padding: "16px", textAlign: "center", borderTop: "1px solid #e5e7eb", color: "#718096", fontSize: "14px" }}>
                    All records loaded
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


// "use client";

// import { useEffect, useState, FormEvent } from "react";
// import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabase";
// import { signOut, getCurrentUser, isAuthenticated } from "@/lib/auth";
// import toast, { Toaster } from "react-hot-toast";
// import Swal from "sweetalert2";
// import "sweetalert2/dist/sweetalert2.min.css";
// import "./attendance1.css";

// interface Record {
//   id: number;
//   user_id: number;
//   timestamp: string;
//   device_ip: string;
//   synced_to_zoho: boolean;
//   synced_at: string | null;
//   zoho_sync_error: string | null;
//   check_type: string;
//   synthetic: boolean;
//   paired_with: number | null;
// }

// const RECORDS_PER_PAGE = 50;

// export default function SyntheticRecordsPage() {
//   const router = useRouter();
//   const [records, setRecords] = useState<Record[]>([]);
//   const [filteredRecords, setFilteredRecords] = useState<Record[]>([]);
//   const [displayedRecords, setDisplayedRecords] = useState<Record[]>([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedIds, setSelectedIds] = useState<number[]>([]);
//   const [currentUser, setCurrentUser] = useState<any>(null);
//   const [editingRecord, setEditingRecord] = useState<Record | null>(null);
//   const [editTimestamp, setEditTimestamp] = useState("");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [hasMore, setHasMore] = useState(true);
//   const [isLoading, setIsLoading] = useState(false);

//   useEffect(() => {
//     if (!isAuthenticated()) {
//       router.push("/login");
//     } else {
//       setCurrentUser(getCurrentUser());
//     }
//   }, [router]);

//   async function fetchRecords(page: number = 1, append: boolean = false) {
//     setIsLoading(true);
//     const from = (page - 1) * RECORDS_PER_PAGE;
//     const to = from + RECORDS_PER_PAGE - 1;

//     const { data, error, count } = await supabase
//       .from("attendance")
//       .select("*", { count: "exact" })
//       .order("id", { ascending: true })
//       .range(from, to);

//     if (error) {
//       toast.error(`Failed to fetch: ${error.message}`);
//       setIsLoading(false);
//       return;
//     }

//     if (append) {
//       setRecords((prev) => [...prev, ...(data || [])]);
//     } else {
//       setRecords(data || []);
//     }

//     const totalRecords = count || 0;
//     setHasMore(totalRecords > page * RECORDS_PER_PAGE);
//     setIsLoading(false);
//   }

//   useEffect(() => {
//     fetchRecords(1, false);
//   }, []);

//   function handleLoadMore() {
//     const nextPage = currentPage + 1;
//     setCurrentPage(nextPage);
//     fetchRecords(nextPage, true);
//   }

//   useEffect(() => {
//     const query = searchQuery.toLowerCase();
//     const filtered = records.filter((record) => {
//       const checkType =
//         typeof record.check_type === "string"
//           ? record.check_type.toLowerCase()
//           : "";
//       const deviceIp =
//         typeof record.device_ip === "string"
//           ? record.device_ip.toLowerCase()
//           : "";

//       return (
//         record.id.toString().includes(query) ||
//         record.user_id.toString().includes(query) ||
//         deviceIp.includes(query) ||
//         checkType.includes(query)
//       );
//     });
//     setFilteredRecords(filtered);
//   }, [searchQuery, records]);

//   useEffect(() => {
//     setDisplayedRecords(filteredRecords);
//   }, [filteredRecords, searchQuery]);

//   async function handleSignOut() {
//     const confirm = await Swal.fire({
//       title: "Sign Out?",
//       text: "Are you sure you want to sign out?",
//       icon: "question",
//       showCancelButton: true,
//       confirmButtonText: "Yes, sign out",
//       confirmButtonColor: "#dc2626",
//     });

//     if (confirm.isConfirmed) {
//       signOut();
//       toast.success("Signed out successfully");
//       setTimeout(() => router.push("/login"), 1000);
//     }
//   }

//   async function handleFormSubmit(e: FormEvent) {
//     e.preventDefault();
//     if (!editingRecord) return;

//     if (!editTimestamp || editTimestamp.trim() === "") {
//       toast.error("Timestamp is required");
//       return;
//     }

//     const { error: updateError } = await supabase
//       .from("attendance")
//       .update({
//         timestamp: editTimestamp,
//         synthetic: false,
//         paired_with: null,
//       })
//       .eq("id", editingRecord.id);

//     if (updateError) {
//       toast.error(`Update failed: ${updateError.message}`);
//       return;
//     }

//     const updatedRecord: Record = {
//       ...editingRecord,
//       timestamp: editTimestamp,
//       synthetic: false,
//       paired_with: null,
//     };

//     setRecords((prev) =>
//       prev.map((r) => (r.id === editingRecord.id ? updatedRecord : r))
//     );

//     toast.success("Record updated successfully");
//     handleCancelEdit();
//   }

//   function handleRecordEdit(record: Record, e: React.MouseEvent) {
//     e.stopPropagation();

//     if (!record.synthetic) {
//       toast.error("Only synthetic records can be edited");
//       return;
//     }

//     setEditingRecord(record);

//     const date = new Date(record.timestamp);
//     const localDateTime = new Date(
//       date.getTime() - date.getTimezoneOffset() * 60000
//     )
//       .toISOString()
//       .slice(0, 16);
//     setEditTimestamp(localDateTime);
//   }

//   function handleCancelEdit() {
//     setEditingRecord(null);
//     setEditTimestamp("");
//   }

//   async function handleDeleteSelected() {
//     if (selectedIds.length === 0) {
//       toast.error("No rows selected");
//       return;
//     }

//     const confirm = await Swal.fire({
//       title: `Delete ${selectedIds.length} selected record(s)?`,
//       text: "This action cannot be undone.",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, delete",
//     });

//     if (confirm.isConfirmed) {
//       const { error } = await supabase
//         .from("attendance")
//         .delete()
//         .in("id", selectedIds);

//       if (error) toast.error(`Delete failed: ${error.message}`);
//       else toast.success(`Deleted ${selectedIds.length} record(s)`);

//       setSelectedIds([]);
//       setRecords((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
//     }
//   }

//   function handleRowClick(id: number) {
//     setSelectedIds((prev) =>
//       prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
//     );
//   }

//   function handleSelectAll() {
//     if (selectedIds.length === displayedRecords.length) setSelectedIds([]);
//     else setSelectedIds(displayedRecords.map((r) => r.id));
//   }

//   if (!currentUser) {
//     return null;
//   }

//   return (
//     <>
//       <Toaster position="top-center" />
//       <div className="app-container">
//         <div className="content-wrapper">
//           <div className="flex-layout">
//             {editingRecord && (
//               <div className="form-section">
//                 <div className="card">
//                   <div className="card-header">
//                     <div>
//                       <h4>Edit Synthetic Record</h4>
//                       <p>Editing record ID: {editingRecord.id}</p>
//                     </div>
//                   </div>

//                   <div className="card-body">
//                     <div className="form-group">
//                       <label>ID (Read-only)</label>
//                       <input type="number" value={editingRecord.id ?? ""} disabled />
//                     </div>

//                     <div className="form-group">
//                       <label>User ID (Read-only)</label>
//                       <input type="number" value={editingRecord.user_id ?? ""} disabled />
//                     </div>

//                     <div className="form-group">
//                       <label>Timestamp (Editable) *</label>
//                       <input
//                         type="datetime-local"
//                         value={editTimestamp}
//                         onChange={(e) => setEditTimestamp(e.target.value)}
//                         required
//                       />
//                     </div>

//                     <div className="form-group">
//                       <label>Device IP (Read-only)</label>
//                       <input type="text" value={editingRecord.device_ip ?? ""} disabled />
//                     </div>

//                     <div className="form-group">
//                       <label>Check Type (Read-only)</label>
//                       <input type="text" value={editingRecord.check_type ?? ""} disabled />
//                     </div>

//                     <div className="form-group">
//                       <label>Synthetic (Read-only)</label>
//                       <input type="text" value="Yes" disabled />
//                     </div>

//                     <div className="form-group">
//                       <label>Paired With (Read-only)</label>
//                       <input type="text" value={editingRecord.paired_with ?? "—"} disabled />
//                     </div>

//                     <div className="edit-note">
//                       <strong>Note:</strong> Updating the timestamp will automatically
//                       mark this record as non-synthetic.
//                     </div>

//                     <div className="edit-actions">
//                       <button className="btn-primary" onClick={handleFormSubmit}>
//                         Update Timestamp
//                       </button>
//                       <button className="btn-delete" onClick={handleCancelEdit}>
//                         Cancel
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* TABLE SECTION */}
//             <div className="table-section">
//               <div className="card">
//                 <div className="card-header flex-between">
//                   <div>
//                     <h5>Records List</h5>
//                     <p>
//                       Logged in as: {currentUser.email} | Showing{" "}
//                       {displayedRecords.length} of {records.length} records
//                     </p>
//                   </div>
//                   <div className="header-actions">
//                     <button className="btn-back" onClick={() => router.push("/dashboard")}>
//                       Go Back
//                     </button>
//                     <button className="btn-delete" onClick={handleSignOut}>
//                       Sign Out
//                     </button>
//                   </div>
//                 </div>

//                 <div className="card-header flex-between">
//                   <div className="search-actions">
//                     <div className="search-container">
//                       <input
//                         type="text"
//                         placeholder="Search by ID, User ID, Device IP, or Check Type..."
//                         value={searchQuery}
//                         onChange={(e) => setSearchQuery(e.target.value)}
//                       />
//                       <span className="search-icon">🔍</span>
//                     </div>

//                     {selectedIds.length > 0 && (
//                       <button className="btn-delete with-badge" onClick={handleDeleteSelected}>
//                         <span>🗑️ Delete Selected</span>
//                         <span className="delete-badge">{selectedIds.length}</span>
//                       </button>
//                     )}
//                   </div>
//                 </div>

//                 <div className="table-wrapper">
//                   <table>
//                     <thead>
//                       <tr>
//                         <th>
//                           <input
//                             type="checkbox"
//                             checked={
//                               displayedRecords.length > 0 &&
//                               selectedIds.length === displayedRecords.length
//                             }
//                             onChange={handleSelectAll}
//                           />
//                         </th>
//                         <th>ID</th>
//                         <th>User ID</th>
//                         <th>Timestamp</th>
//                         <th>Device IP</th>
//                         <th>Check Type</th>
//                         <th>Synthetic</th>
//                         <th>Synced</th>
//                         <th>Paired</th>
//                         <th>Action</th>
//                       </tr>
//                     </thead>

//                     <tbody>
//                       {displayedRecords.map((record) => (
//                         <tr
//                           key={record.id}
//                           onClick={() => handleRowClick(record.id)}
//                           className={
//                             selectedIds.includes(record.id)
//                               ? "row-selected"
//                               : editingRecord?.id === record.id
//                               ? "row-editing"
//                               : ""
//                           }
//                         >
//                           <td onClick={(e) => e.stopPropagation()}>
//                             <input
//                               type="checkbox"
//                               checked={selectedIds.includes(record.id)}
//                               onChange={() => handleRowClick(record.id)}
//                             />
//                           </td>

//                           <td>{record.id}</td>
//                           <td>{record.user_id}</td>
//                           <td>{new Date(record.timestamp).toLocaleString()}</td>
//                           <td>{record.device_ip}</td>
//                           <td>{record.check_type}</td>

//                           <td>
//                             <span className={record.synthetic ? "yes" : "no"}>
//                               {record.synthetic ? "✓" : "✗"}
//                             </span>
//                           </td>

//                           <td>
//                             <span className={record.synced_to_zoho ? "yes" : "no"}>
//                               {record.synced_to_zoho ? "✓" : "✗"}
//                             </span>
//                           </td>

//                           <td>{record.paired_with || "-"}</td>

//                           <td>
//                             <button
//                               className="btn-edit"
//                               onClick={(e) => handleRecordEdit(record, e)}
//                               disabled={!record.synthetic}
//                             >
//                               Edit
//                             </button>
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>

//                   {displayedRecords.length === 0 && (
//                     <div className="no-records">No records found</div>
//                   )}
//                 </div>

//                 {!searchQuery && hasMore && (
//                   <div className="load-more-container">
//                     <button
//                       className="btn-primary"
//                       onClick={handleLoadMore}
//                       disabled={isLoading}
//                     >
//                       {isLoading ? "Loading..." : `Load More Records (${RECORDS_PER_PAGE})`}
//                     </button>
//                   </div>
//                 )}

//                 {!searchQuery && !hasMore && records.length > 0 && (
//                   <div className="all-loaded">All records loaded</div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }
