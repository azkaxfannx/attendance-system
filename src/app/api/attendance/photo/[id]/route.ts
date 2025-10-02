// app/api/attendance/photo/[id]/route.ts - VERSI BASE64
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const attendancePhoto = await prisma.attendancePhoto.findUnique({
      where: { attendanceId: id },
    });

    if (!attendancePhoto) {
      return NextResponse.json(
        { error: "Foto tidak ditemukan" },
        { status: 404 }
      );
    }

    // Convert to base64
    const base64Image = Buffer.from(attendancePhoto.photo).toString("base64");

    // Return HTML page that displays the image
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Foto Absensi - ${id}</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              background: #1e293b; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 100vh;
            }
            img { 
              max-width: 90%; 
              max-height: 90vh; 
              border-radius: 12px; 
              box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }
          </style>
        </head>
        <body>
          <img src="data:${attendancePhoto.mimeType};base64,${base64Image}" 
               alt="Foto Absensi ${id}" />
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error fetching photo:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
