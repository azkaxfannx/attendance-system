"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FaceDetector from "../../components/FaceDetector";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { id } from "date-fns/locale";

interface Attendance {
  id: string;
  timestamp: string;
  status: string;
  user: {
    fullName: string;
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showCamera, setShowCamera] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [cameraMessageType, setCameraMessageType] = useState<
    "success" | "error" | "warning"
  >("success");
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchAttendances();
    }
  }, [status, router, selectedMonth]);

  const fetchAttendances = async () => {
    try {
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);

      const response = await fetch(
        `/api/attendance?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
      );
      const data = await response.json();
      setAttendances(data);
    } catch (error) {
      console.error("Error fetching attendances:", error);
    }
  };

  const handleFaceDetected = async (faceData: any) => {
    if (faceDetected) return;

    setFaceDetected(true);
    setLoading(true);
    setCameraMessage("");

    try {
      console.log("Sending face data to server:", faceData);

      // Siapkan data untuk dikirim
      const requestData: any = {
        faceData: {
          descriptor: faceData.descriptor,
          timestamp: faceData.timestamp,
        },
      };

      // Jika ada foto, tambahkan ke request
      if (faceData.photo) {
        requestData.photo = faceData.photo;
      }

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (response.ok) {
        setCameraMessage("Absensi berhasil dicatat!");
        setCameraMessageType("success");
        fetchAttendances();

        setTimeout(() => {
          setShowCamera(false);
        }, 2000); // Beri delay 2 detik agar user bisa baca pesan sukses
      } else {
        setCameraMessage(data.error || "Gagal mencatat absensi");
        setCameraMessageType("error");

        setTimeout(() => {
          setShowCamera(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Attendance error:", error);
      setCameraMessage("Terjadi kesalahan jaringan saat mencatat absensi");
      setCameraMessageType("error");

      setTimeout(() => {
        setShowCamera(false);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleNoFaceDetected = () => {
    if (!faceDetected && showCamera && !cameraMessage) {
      setCameraMessage(
        "Wajah tidak terdeteksi. Posisikan wajah Anda di depan kamera."
      );
      setCameraMessageType("warning");

      // Khusus untuk "wajah tidak terdeteksi": TIDAK auto close
      // Biarkan user mencoba lagi tanpa kamera tertutup otomatis
    }
  };

  const downloadReport = () => {
    if (attendances.length === 0) {
      setCameraMessage("Tidak ada data untuk diunduh");
      setCameraMessageType("warning");
      // Untuk download report warning: tidak perlu close camera karena kamera mungkin tidak terbuka
      return;
    }

    const headers = ["Tanggal", "Waktu", "Status"];
    const rows = attendances.map((att) => [
      format(new Date(att.timestamp), "dd/MM/yyyy", { locale: id }),
      format(new Date(att.timestamp), "HH:mm:ss"),
      att.status === "PRESENT"
        ? "Hadir"
        : att.status === "LATE"
        ? "Terlambat"
        : "Tidak Hadir",
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n"
    );

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-absensi-${format(selectedMonth, "MMMM-yyyy", {
      locale: id,
    })}.csv`;
    a.click();
  };

  const viewPhoto = (attendanceId: string) => {
    // Buka di tab baru
    window.open(`/api/attendance/photo/${attendanceId}`, "_blank");
  };

  // Reset semua state ketika kamera ditutup
  const handleCloseCamera = () => {
    setShowCamera(false);
    setCameraMessage("");
    setFaceDetected(false);
    setLoading(false);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-medium">Memuat dashboard...</p>
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
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-lg font-semibold text-white">
                  Dashboard Absensi
                </h1>
                <p className="text-xs text-slate-400 hidden md:block">
                  {session?.user.fullName}
                </p>
              </div>
              <h1 className="text-base font-semibold text-white sm:hidden">
                Absensi
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {session?.user.role === "ADMIN" && (
                <button
                  onClick={() => router.push("/admin")}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <span className="hidden sm:inline">Panel Admin</span>
                  <span className="sm:hidden">Admin</span>
                </button>
              )}
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
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Column - Attendance Section */}
          <div className="space-y-4 sm:space-y-6">
            {/* Camera Card */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-800">
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  Absensi Hari Ini
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {format(new Date(), "EEEE, dd MMMM yyyy", { locale: id })}
                </p>
              </div>

              <div className="p-4 sm:p-6">
                {!showCamera ? (
                  <div className="space-y-4">
                    {/* Alert Message di luar kamera (setelah kamera close) */}
                    {cameraMessage && (
                      <div
                        className={`p-4 rounded-xl border animate-fade-in ${
                          cameraMessageType === "success"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : cameraMessageType === "error"
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        }`}
                      >
                        <p className="text-sm font-medium text-center">
                          {cameraMessage}
                        </p>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setShowCamera(true);
                        setCameraMessage("");
                        setFaceDetected(false);
                      }}
                      disabled={loading}
                      className="w-full py-4 sm:py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="text-base sm:text-lg">
                        Mulai Absensi
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Alert Message INSIDE Camera Card */}
                    {cameraMessage && (
                      <div
                        className={`p-4 rounded-xl border animate-fade-in ${
                          cameraMessageType === "success"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : cameraMessageType === "error"
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        }`}
                      >
                        <p className="text-sm font-medium text-center">
                          {cameraMessage}
                        </p>
                      </div>
                    )}

                    <div className="relative rounded-xl overflow-hidden bg-slate-950">
                      <FaceDetector
                        onFaceDetected={handleFaceDetected}
                        onNoFaceDetected={handleNoFaceDetected}
                      />
                    </div>

                    {loading && (
                      <div className="text-center py-4">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-slate-400 text-sm font-medium">
                          Mencatat absensi...
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleCloseCamera}
                      className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors"
                    >
                      Batalkan
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions Card */}
            <div
              className={`bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-6 ${
                showCamera ? "hidden lg:block" : ""
              }`}
            >
              <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                Panduan Absensi
              </h3>
              <div className="space-y-3">
                {[
                  "Klik tombol 'Mulai Absensi'",
                  "Izinkan akses kamera pada browser",
                  "Posisikan wajah di depan kamera",
                  "Sistem akan otomatis mencatat absensi",
                ].map((text, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-slate-300 text-sm">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Attendance History */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-semibold text-white">
                  Riwayat Absensi
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={format(selectedMonth, "yyyy-MM")}
                    onChange={(e) => setSelectedMonth(new Date(e.target.value))}
                    className="px-3 py-2 bg-slate-800 text-white text-sm rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={downloadReport}
                    disabled={attendances.length === 0}
                    className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {attendances.length === 0 ? (
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-medium mb-1">
                    Belum ada data absensi
                  </p>
                  <p className="text-slate-500 text-sm">
                    Data akan muncul setelah Anda melakukan absensi
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Tanggal
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Waktu
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {attendances.map((att) => (
                          <tr
                            key={att.id}
                            className="hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                              {format(new Date(att.timestamp), "dd MMM yyyy", {
                                locale: id,
                              })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">
                              {format(new Date(att.timestamp), "HH:mm:ss")}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                                  att.status === "PRESENT"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : att.status === "LATE"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                                }`}
                              >
                                {att.status === "PRESENT"
                                  ? "Hadir"
                                  : att.status === "LATE"
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
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
