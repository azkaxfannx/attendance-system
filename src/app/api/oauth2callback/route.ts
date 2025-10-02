import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/api/oauth2callback"
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const { tokens } = await oauth2Client.getToken(code);

    // Token ini yang akan dipakai untuk upload
    return NextResponse.json({
      success: true,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token, // ← INI YANG PENTING
      expiry_date: tokens.expiry_date,
    });
  } catch (error) {
    console.error("Error getting tokens:", error);
    return NextResponse.json(
      { error: "Failed to get tokens" },
      { status: 500 }
    );
  }
}
