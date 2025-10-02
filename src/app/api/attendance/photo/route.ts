// app/api/upload-photo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToGoogleDrive } from "@/lib/google-drive";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { photo, fileName } = await request.json();

    if (!photo) {
      return NextResponse.json(
        { error: "Photo data is required" },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Upload ke Google Drive
    const driveResult = await uploadToGoogleDrive(
      imageBuffer,
      fileName || `attendance-${session.user.username}-${Date.now()}.jpg`,
      "image/jpeg"
    );

    // Return metadata untuk disimpan di database
    return NextResponse.json({
      success: true,
      photoMetadata: {
        fileId: driveResult.fileId,
        url: driveResult.webViewLink,
        fileSize: imageBuffer.length,
      },
    });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return NextResponse.json(
      { error: "Gagal mengupload foto ke Google Drive" },
      { status: 500 }
    );
  }
}
