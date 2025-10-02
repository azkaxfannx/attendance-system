import { google } from "googleapis";

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/oauth2callback"
);

// Set credentials
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

export async function uploadToGoogleDrive(
  imageBuffer: Buffer,
  fileName: string,
  mimeType: string = "image/jpeg"
) {
  try {
    // Refresh access token jika perlu
    const { credentials } = await oauth2Client.refreshAccessToken();
    console.log("Token refreshed, expiry:", credentials.expiry_date);

    const requestBody: any = {
      name: fileName,
      mimeType: mimeType,
    };

    // Jika ada folder ID, tambahkan parents
    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
      requestBody.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
    }

    const response = await drive.files.create({
      requestBody,
      media: {
        mimeType: mimeType,
        body: require("stream").Readable.from(imageBuffer),
      },
      fields: "id, webViewLink, webContentLink",
    });

    console.log("File uploaded successfully to personal drive:", {
      fileId: response.data.id,
      url: response.data.webViewLink,
    });

    return {
      fileId: response.data.id!,
      webViewLink: response.data.webViewLink!,
      webContentLink: response.data.webContentLink!,
    };
  } catch (error) {
    console.error("Error uploading to personal Google Drive:", error);
    throw error;
  }
}
