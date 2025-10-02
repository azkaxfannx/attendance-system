"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";
import * as XLSX from "xlsx";

interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface Attendance {
  id: string;
  timestamp: string;
  status: string;
  user: {
    fullName: string;
    username: string;
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [startDate, setStartDate] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      if (session.user.role !== "ADMIN") {
        router.push("/dashboard");
      } else {
        fetchUsers();
        fetchAttendances();
      }
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchAttendances = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedUser) params.append("userId", selectedUser);
      params.append("startDate", new Date(startDate).toISOString());
      params.append("endDate", new Date(endDate + "T23:59:59").toISOString());

      const response = await fetch(`/api/attendance?${params}`);
      const data = await response.json();
      setAttendances(data);
    } catch (error) {
      console.error("Error fetching attendances:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (attendances.length === 0) {
      alert("Tidak ada data untuk diunduh");
      return;
    }

    const data = attendances.map((att) => ({
      Nama: att.user.fullName,
      Username: att.user.username,
      Tanggal: format(new Date(att.timestamp), "dd/MM/yyyy", { locale: id }),
      Waktu: format(new Date(att.timestamp), "HH:mm:ss"),
      Status:
        att.status === "PRESENT"
          ? "Hadir"
          : att.status === "LATE"
          ? "Terlambat"
          : "Tidak Hadir",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Absensi");

    const fileName = selectedUser
      ? `laporan-absensi-${
          users.find((u) => u.id === selectedUser)?.fullName
        }-${format(new Date(), "ddMMyyyy")}.xlsx`
      : `laporan-absensi-semua-${format(new Date(), "ddMMyyyy")}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  const downloadPDF = async () => {
    if (attendances.length === 0) {
      alert("Tidak ada data untuk diunduh");
      return;
    }

    const { jsPDF } = await import("jspdf");
    await import("jspdf-autotable");

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Laporan Absensi", 14, 20);

    doc.setFontSize(11);
    doc.text(
      `Periode: ${format(new Date(startDate), "dd/MM/yyyy")} - ${format(
        new Date(endDate),
        "dd/MM/yyyy"
      )}`,
      14,
      30
    );

    if (selectedUser) {
      const user = users.find((u) => u.id === selectedUser);
      doc.text(`Karyawan: ${user?.fullName}`, 14, 37);
    }

    const tableData = attendances.map((att) => [
      att.user.fullName,
      format(new Date(att.timestamp), "dd/MM/yyyy", { locale: id }),
      format(new Date(att.timestamp), "HH:mm:ss"),
      att.status === "PRESENT"
        ? "Hadir"
        : att.status === "LATE"
        ? "Terlambat"
        : "Tidak Hadir",
    ]);

    (doc as any).autoTable({
      startY: selectedUser ? 42 : 37,
      head: [["Nama", "Tanggal", "Waktu", "Status"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
    });

    const fileName = selectedUser
      ? `laporan-absensi-${
          users.find((u) => u.id === selectedUser)?.fullName
        }-${format(new Date(), "ddMMyyyy")}.pdf`
      : `laporan-absensi-semua-${format(new Date(), "ddMMyyyy")}.pdf`;

    doc.save(fileName);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-medium">Memuat panel admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <nav className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-lg font-semibold text-white">
                  Panel Admin
                </h1>
                <p className="text-xs text-slate-400 hidden md:block">
                  Kelola absensi karyawan
                </p>
              </div>
              <h1 className="text-base font-semibold text-white sm:hidden">
                Admin
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/dashboard")}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <span className="hidden sm:inline">Dashboard</span>
                <svg
                  className="w-5 h-5 sm:hidden"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </button>
              <button
                onClick={() => router.push("/api/auth/signout")}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <span className="hidden sm:inline">Keluar</span>
                <svg
                  className="w-5 h-5 sm:hidden"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Filter Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              Filter Data Absensi
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Karyawan
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Semua Karyawan</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tanggal Akhir
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchAttendances}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span>{loading ? "Memuat..." : "Filter"}</span>
              </button>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              onClick={downloadExcel}
              disabled={attendances.length === 0}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Download Excel</span>
            </button>
            <button
              onClick={downloadPDF}
              disabled={attendances.length === 0}
              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg disabled:bg-slate-700 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                Data Absensi
              </h2>
              <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-medium border border-blue-500/20">
                {attendances.length} record
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400 font-medium">Memuat data...</p>
              </div>
            ) : attendances.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-slate-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                </div>
                <p className="text-slate-400 font-medium">
                  Tidak ada data absensi
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  Gunakan filter untuk mencari data
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Nama
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                          Username
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Tanggal
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                          Waktu
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {attendances.map((attendance) => (
                        <tr
                          key={attendance.id}
                          className="hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">
                              {attendance.user.fullName}
                            </div>
                            <div className="text-xs text-slate-500 sm:hidden">
                              @{attendance.user.username}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap hidden sm:table-cell">
                            <div className="text-sm text-slate-400">
                              @{attendance.user.username}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-white">
                              {format(
                                new Date(attendance.timestamp),
                                "dd/MM/yyyy",
                                { locale: id }
                              )}
                            </div>
                            <div className="text-xs text-slate-500 md:hidden">
                              {format(
                                new Date(attendance.timestamp),
                                "HH:mm:ss"
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                            <div className="text-sm text-slate-400">
                              {format(
                                new Date(attendance.timestamp),
                                "HH:mm:ss"
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                                attendance.status === "PRESENT"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : attendance.status === "LATE"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}
                            >
                              {attendance.status === "PRESENT"
                                ? "Hadir"
                                : attendance.status === "LATE"
                                ? "Terlambat"
                                : "Tidak Hadir"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
