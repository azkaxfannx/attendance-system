import { NextRequest, NextResponse } from "next/server";
import { uploadToGoogleDrive } from "@/lib/google-drive";

export async function POST(request: NextRequest) {
  try {
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

    console.log("Uploading photo to Google Drive...", {
      fileName: fileName,
      bufferSize: imageBuffer.length,
    });

    // Upload ke Google Drive
    const driveResult = await uploadToGoogleDrive(
      imageBuffer,
      fileName || `attendance-${Date.now()}.jpg`
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
  } catch (error: any) {
    console.error("Error uploading photo:", error);

    // Berikan error message yang lebih spesifik
    let errorMessage = "Gagal mengupload foto ke Google Drive";
    if (error.message?.includes("invalid_grant")) {
      errorMessage = "Token akses tidak valid. Perlu setup ulang OAuth.";
    } else if (error.message?.includes("quota")) {
      errorMessage = "Quota Google Drive habis.";
    }

    return NextResponse.json(
      { error: errorMessage, details: error.message },
      { status: 500 }
    );
  }
}
