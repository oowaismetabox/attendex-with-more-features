"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signOut, getCurrentUser, isAuthenticated } from "@/lib/auth";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
// import './attendance.css';
    
interface Record {
  id: number;
  user_id: number;
  timestamp: string;
  device_ip: string;
  synced_to_zoho: boolean;
  synced_at: string | null;
  zoho_sync_error: string | null;
  check_type: number; // Changed to number (0 or 1)
  synthetic: boolean;
  paired_with: number | null;
}

const RECORDS_PER_PAGE = 50;

// Helper function to display check type
const getCheckTypeLabel = (type: number) => {
  return type === 0 ? "Check In" : type === 1 ? "Check Out" : "Unknown";
};

export default function SyntheticRecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<Record[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<Record[]>([]);
  const [displayedRecords, setDisplayedRecords] = useState<Record[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state for all editable fields
  const [editUserId, setEditUserId] = useState<number>(0);
  const [editTimestamp, setEditTimestamp] = useState("");
  const [editDeviceIp, setEditDeviceIp] = useState("");
  const [editCheckType, setEditCheckType] = useState<number>(0);
  const [editSynthetic, setEditSynthetic] = useState(false);
  const [editSyncedToZoho, setEditSyncedToZoho] = useState(false);
  const [editSyncedAt, setEditSyncedAt] = useState("");
  const [editZohoSyncError, setEditZohoSyncError] = useState("");
  const [editPairedWith, setEditPairedWith] = useState<number | null>(null);

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
}, [router]);

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

    // Check if there are more records
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
      const checkTypeLabel = getCheckTypeLabel(record.check_type).toLowerCase();
      const deviceIp = typeof record.device_ip === 'string' ? record.device_ip.toLowerCase() : '';

      return (
        record.id.toString().includes(query) ||
        record.user_id.toString().includes(query) ||
        deviceIp.includes(query) ||
        checkTypeLabel.includes(query) ||
        record.check_type.toString().includes(query)
      );
    });
    setFilteredRecords(filtered);
  }, [searchQuery, records]);

  // ---------------- Paginate Filtered Records ----------------
  useEffect(() => {
    // If searching, show all filtered results, otherwise respect pagination
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

  // ---------------- Form Submit (Update All Fields) ----------------
  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingRecord) return;

    if (!editTimestamp || editTimestamp.trim() === "") {
      toast.error("Timestamp is required");
      return;
    }

    if (!editUserId || editUserId <= 0) {
      toast.error("Valid User ID is required");
      return;
    }

    if (!editDeviceIp || editDeviceIp.trim() === "") {
      toast.error("Device IP is required");
      return;
    }

    if (editCheckType === null || editCheckType === undefined || (editCheckType !== 0 && editCheckType !== 1)) {
      toast.error("Check Type must be 0 (Check In) or 1 (Check Out)");
      return;
    }

    // Prepare update object
    const updateData: any = {
      user_id: editUserId,
      timestamp: editTimestamp,
      device_ip: editDeviceIp,
      check_type: editCheckType,
      synthetic: editSynthetic,
      synced_to_zoho: editSyncedToZoho,
      synced_at: editSyncedAt || null,
      zoho_sync_error: editZohoSyncError || null,
      paired_with: editPairedWith,
    };

    // Update the record
    const { error: updateError } = await supabase
      .from("attendance")
      .update(updateData)
      .eq("id", editingRecord.id);

    if (updateError) {
      toast.error(`Update failed: ${updateError.message}`);
      return;
    }

    toast.success("Record updated successfully");
    handleCancelEdit();
    // Refresh records from beginning
    setCurrentPage(1);
    fetchRecords(1, false);
  }

  // ---------------- Edit (all rows allowed) ----------------
  function handleRecordEdit(record: Record, e: React.MouseEvent) {
    e.stopPropagation();

    setEditingRecord(record);
    
    // Set all form fields
    setEditUserId(record.user_id);
    setEditDeviceIp(record.device_ip);
    setEditCheckType(record.check_type);
    setEditSynthetic(record.synthetic);
    setEditSyncedToZoho(record.synced_to_zoho);
    setEditZohoSyncError(record.zoho_sync_error || "");
    setEditPairedWith(record.paired_with);
    
    // Convert timestamp to datetime-local format
    const date = new Date(record.timestamp);
    const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEditTimestamp(localDateTime);

    // Convert synced_at to datetime-local format if exists
    if (record.synced_at) {
      const syncedDate = new Date(record.synced_at);
      const syncedLocalDateTime = new Date(syncedDate.getTime() - syncedDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setEditSyncedAt(syncedLocalDateTime);
    } else {
      setEditSyncedAt("");
    }
  }

  // ---------------- Cancel Edit ----------------
  function handleCancelEdit() {
    setEditingRecord(null);
    setEditUserId(0);
    setEditTimestamp("");
    setEditDeviceIp("");
    setEditCheckType(0);
    setEditSynthetic(false);
    setEditSyncedToZoho(false);
    setEditSyncedAt("");
    setEditZohoSyncError("");
    setEditPairedWith(null);
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
      setCurrentPage(1);
      fetchRecords(1, false);
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
            {/* Left side form - Only shown when editing */}
            {editingRecord && (
              <div className="form-section">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h4>Edit Record</h4>
                      <p style={{ fontSize: "12px", color: "#718096", marginTop: "4px" }}>
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
                      <label>User ID *</label>
                      <input
                        type="number"
                        value={editUserId}
                        onChange={(e) => setEditUserId(Number(e.target.value))}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Timestamp *</label>
                      <input
                        type="datetime-local"
                        value={editTimestamp}
                        onChange={(e) => setEditTimestamp(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Device IP *</label>
                      <input
                        type="text"
                        value={editDeviceIp}
                        onChange={(e) => setEditDeviceIp(e.target.value)}
                        placeholder="e.g., 192.168.1.1"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Check Type *</label>
                      <select
                        value={editCheckType}
                        onChange={(e) => setEditCheckType(Number(e.target.value))}
                        required
                      >
                        <option value={0}>0 - Check In</option>
                        <option value={1}>1 - Check Out</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          checked={editSynthetic}
                          onChange={(e) => setEditSynthetic(e.target.checked)}
                          style={{ width: "auto", margin: 0 }}
                        />
                        Synthetic Record
                      </label>
                    </div>

                    <div className="form-group">
                      <label>Paired With (ID)</label>
                      <input
                        type="number"
                        value={editPairedWith ?? ""}
                        onChange={(e) => setEditPairedWith(e.target.value ? Number(e.target.value) : null)}
                        placeholder="Enter record ID or leave empty"
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          checked={editSyncedToZoho}
                          onChange={(e) => setEditSyncedToZoho(e.target.checked)}
                          style={{ width: "auto", margin: 0 }}
                        />
                        Synced to Zoho
                      </label>
                    </div>

                    <div className="form-group">
                      <label>Synced At</label>
                      <input
                        type="datetime-local"
                        value={editSyncedAt}
                        onChange={(e) => setEditSyncedAt(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Zoho Sync Error</label>
                      <textarea
                        value={editZohoSyncError}
                        onChange={(e) => setEditZohoSyncError(e.target.value)}
                        rows={3}
                        placeholder="Error message (if any)"
                        style={{ resize: "vertical", fontFamily: "inherit" }}
                      />
                    </div>

                    <div style={{ padding: "12px", backgroundColor: "#dbeafe", borderRadius: "6px", marginBottom: "16px", fontSize: "13px", color: "#1e40af" }}>
                      <strong>Note:</strong> All fields marked with * are required.
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn-primary"
                        onClick={handleFormSubmit}
                        style={{ flex: 1 }}
                      >
                        Update Record
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
                    <p style={{ fontSize: "12px", color: "#718096", marginTop: "4px" }}>
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
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
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
                          <td>
                            <span style={{ fontWeight: "600", color: "#2d5f4d" }}>
                              {record.check_type} - {getCheckTypeLabel(record.check_type)}
                            </span>
                          </td>
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