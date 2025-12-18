"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { signOut, getCurrentUser, isAuthenticated } from "@/lib/auth";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import './attendance.css';

interface Record {
  id: number;
  user_id: number | null;
  timestamp: string | null;
  device_ip: string | null;
  synced_to_zoho: boolean;
  synced_at: string | null;
  zoho_sync_error: string | null;
  check_type: string | null;
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
  const [editFormData, setEditFormData] = useState<Partial<Record>>({});
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
      .order("timestamp", { ascending: false })
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
        (record.user_id?.toString().includes(query) ?? false) ||
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

  // ---------------- Export to CSV ----------------
  function handleExportToCSV() {
    if (displayedRecords.length === 0) {
      toast.error("No records to export");
      return;
    }

    // Define CSV headers
    const headers = [
      "ID",
      "User ID",
      "Timestamp",
      "Device IP",
      "Check Type",
      "Synthetic",
      "Paired With",
      "Synced to Zoho",
      "Synced At",
      "Zoho Sync Error"
    ];

    // Convert records to CSV rows
    const csvRows = displayedRecords.map(record => [
      record.id,
      record.user_id ?? "",
      record.timestamp ? new Date(record.timestamp).toISOString() : "",
      record.device_ip ?? "",
      record.check_type ?? "",
      record.synthetic ? "true" : "false",
      record.paired_with ?? "",
      record.synced_to_zoho ? "true" : "false",
      record.synced_at ? new Date(record.synced_at).toISOString() : "",
      record.zoho_sync_error ?? ""
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...csvRows.map(row => 
        row.map(cell => {
          const cellStr = String(cell);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(",")
      )
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_records_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${displayedRecords.length} records to CSV`);
  }

  // ---------------- Form Submit (Update All Attributes Except ID) ----------------
  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingRecord) return;

    // Validate check_type if provided (must be 0 or 1)
    if (editFormData.check_type !== null && editFormData.check_type !== undefined && editFormData.check_type !== "") {
      const checkTypeNum = parseInt(editFormData.check_type as string);
      if (isNaN(checkTypeNum) || (checkTypeNum !== 0 && checkTypeNum !== 1)) {
        toast.error("Check Type must be 0 or 1");
        return;
      }
    }

    // Prepare update data (exclude ID, allow null values)
    const updateData = {
      user_id: editFormData.user_id || null,
      timestamp: editFormData.timestamp || null,
      device_ip: editFormData.device_ip || null,
      check_type: editFormData.check_type || null,
      synthetic: editFormData.synthetic ?? false,
      paired_with: editFormData.paired_with || null,
      synced_to_zoho: editFormData.synced_to_zoho ?? false,
    };

    const { error: updateError } = await supabase
      .from("attendance")
      .update(updateData)
      .eq("id", editingRecord.id);

    if (updateError) {
      toast.error(`Update failed: ${updateError.message}`);
      return;
    }

    const updatedRecord: Record = {
      ...editingRecord,
      ...updateData,
    };

    setRecords((prev) =>
      prev.map((r) => (r.id === editingRecord.id ? updatedRecord : r))
    );

    toast.success("Record updated successfully");
    handleCancelEdit();
  }

  // ---------------- Edit (All Rows, All Attributes Except ID) ----------------
  function handleRecordEdit(record: Record, e: React.MouseEvent) {
    e.stopPropagation();

    setEditingRecord(record);
    setEditFormData({
      user_id: record.user_id || undefined,
      timestamp: record.timestamp ? new Date(record.timestamp).toISOString().slice(0, 16) : "",
      device_ip: record.device_ip || "",
      check_type: record.check_type || "",
      synthetic: record.synthetic,
      paired_with: record.paired_with || undefined,
      synced_to_zoho: record.synced_to_zoho,
    });
  }

  // ---------------- Cancel Edit ----------------
  function handleCancelEdit() {
    setEditingRecord(null);
    setEditFormData({});
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

  if (!currentUser) {
    return null;
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="app-container">
        <div className="content-wrapper">
          <div className="flex-layout">
            {editingRecord && (
              <div className="form-section">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h4>Edit Record</h4>
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
                      <label>User ID (Optional)</label>
                      <input
                        type="number"
                        value={editFormData.user_id ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, user_id: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Leave empty for null"
                        style={{ borderColor: "#3b82f6", borderWidth: "2px" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Timestamp (Optional)</label>
                      <input
                        type="datetime-local"
                        value={editFormData.timestamp ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, timestamp: e.target.value || null })}
                        style={{ borderColor: "#3b82f6", borderWidth: "2px" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Device IP (Optional)</label>
                      <input
                        type="text"
                        value={editFormData.device_ip ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, device_ip: e.target.value || null })}
                        placeholder="Leave empty for null"
                        style={{ borderColor: "#3b82f6", borderWidth: "2px" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Check Type (Optional - 0 or 1)</label>
                      <input
                        type="number"
                        value={editFormData.check_type ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, check_type: e.target.value || null })}
                        min="0"
                        max="1"
                        placeholder="Leave empty for null"
                        style={{ borderColor: "#3b82f6", borderWidth: "2px" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Synthetic (Optional)</label>
                      <select
                        value={editFormData.synthetic ? "yes" : "no"}
                        onChange={(e) => setEditFormData({ ...editFormData, synthetic: e.target.value === "yes" })}
                        style={{ borderColor: "#3b82f6", borderWidth: "2px" }}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Paired With (Optional)</label>
                      <input
                        type="number"
                        value={editFormData.paired_with ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, paired_with: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Leave empty for null"
                        style={{ borderColor: "#3b82f6", borderWidth: "2px" }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Synced to Zoho (Optional)</label>
                      <select
                        value={editFormData.synced_to_zoho ? "yes" : "no"}
                        onChange={(e) => setEditFormData({ ...editFormData, synced_to_zoho: e.target.value === "yes" })}
                        style={{ borderColor: "#3b82f6", borderWidth: "2px" }}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>

                    <div style={{ padding: "12px", backgroundColor: "#fef3c7", borderRadius: "6px", marginBottom: "16px", fontSize: "13px", color: "#92400e" }}>
                      <strong>Note:</strong> All fields except ID are optional and can be null. Check Type must be 0 or 1 if provided.
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

            <div className="table-section" style={{ flex: editingRecord ? "1" : "1" }}>
              <div className="card">
                <div className="card-header flex-between">
                  <div>
                    <h5>Records List</h5>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", marginTop: "4px" }}>
                      Showing {displayedRecords.length} of {records.length} loaded records
                    </p>
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
                    
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <button 
                        className="btn-primary" 
                        onClick={handleExportToCSV}
                        style={{
                          padding: "12px 18px",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          whiteSpace: "nowrap",
                          margin: 0
                        }}
                      >
                        <span>📥</span>
                        <span>Export to CSV</span>
                      </button>
                      
                      {selectedIds.length > 0 && (
                        <button className="btn-delete with-badge" onClick={handleDeleteSelected}>
                          <span>🗑️ Delete Selected</span>
                          <span className="delete-badge">{selectedIds.length}</span>
                        </button>
                      )}
                    </div>
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
                          <td>{record.user_id ?? '-'}</td>
                          <td>{record.timestamp ? new Date(record.timestamp).toLocaleString() : '-'}</td>
                          <td>{record.device_ip ?? '-'}</td>
                          <td>{record.check_type ?? '-'}</td>
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
                          <td>{record.paired_with ?? '-'}</td>
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