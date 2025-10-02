import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { faceData } = await request.json(); // ← HAPUS photo dari sini

    // Validasi: wajah harus terdeteksi
    if (!faceData) {
      return NextResponse.json(
        { error: "Wajah tidak terdeteksi" },
        { status: 400 }
      );
    }

    // Validasi: face descriptor harus ada
    if (!faceData.descriptor || !Array.isArray(faceData.descriptor)) {
      return NextResponse.json(
        { error: "Data wajah tidak valid" },
        { status: 400 }
      );
    }

    console.log("Face detection successful for user:", session.user.username);
    console.log("Descriptor length:", faceData.descriptor.length);

    // Cek apakah sudah absen hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { error: "Anda sudah melakukan absensi hari ini" },
        { status: 400 }
      );
    }

    // Tentukan status berdasarkan waktu
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    let status: Status = Status.PRESENT;

    // Jika lewat dari jam 9:00, dianggap terlambat
    if (hour > 9 || (hour === 9 && minute > 0)) {
      status = Status.LATE;
    }

    // Create attendance record - PERBAIKI BAGIAN INI
    const attendanceData: any = {
      userId: session.user.id,
      status,
    };

    // Jika ada photoMetadata, tambahkan relation
    if (faceData.photoMetadata) {
      attendanceData.photo = {
        create: {
          googleDriveFileId: faceData.photoMetadata.fileId,
          googleDriveUrl: faceData.photoMetadata.url,
          mimeType: "image/jpeg",
          fileSize: faceData.photoMetadata.fileSize,
        },
      };
    }

    const attendance = await prisma.attendance.create({
      data: attendanceData,
      include: {
        user: {
          select: { username: true, fullName: true },
        },
        photo: true,
      },
    });

    console.log("Attendance created:", {
      id: attendance.id,
      user: attendance.user.fullName,
      status: attendance.status,
      timestamp: attendance.timestamp,
      hasPhoto: !!attendance.photo,
    });

    return NextResponse.json({
      success: true,
      message: "Absensi berhasil dicatat",
      attendance: {
        id: attendance.id,
        timestamp: attendance.timestamp,
        status: attendance.status,
        user: attendance.user,
        hasPhoto: !!attendance.photo,
      },
    });
  } catch (error) {
    console.error("Error creating attendance:", error);

    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};

    // Jika bukan admin, hanya bisa lihat absensi sendiri
    if (session.user.role !== "ADMIN") {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    // Filter by date range
    if (startDate && endDate) {
      where.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      // Default: bulan berjalan jika tidak ada filter
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      where.timestamp = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            username: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });

    return NextResponse.json(attendances);
  } catch (error) {
    console.error("Error fetching attendances:", error);

    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
