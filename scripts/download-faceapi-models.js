// scripts/download-faceapi-models.js
const fs = require("fs");
const path = require("path");
const https = require("https");

const modelsDir = path.join(__dirname, "..", "public", "models");

// URL model face-api.js (dari repo resminya)
const baseUrl =
  "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/";

const files = [
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
];

function downloadFile(fileUrl, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(fileUrl, (response) => {
        if (response.statusCode !== 200) {
          return reject(`Failed to get '${fileUrl}' (${response.statusCode})`);
        }
        response.pipe(file);
      })
      .on("error", (err) => {
        fs.unlink(dest, () => reject(err));
      });

    file.on("finish", () => {
      file.close(resolve);
    });
  });
}

async function main() {
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  for (const file of files) {
    const url = baseUrl + file;
    const dest = path.join(modelsDir, file);

    console.log(`⬇️ Downloading ${file}...`);
    await downloadFile(url, dest);
    console.log(`✅ Saved: ${dest}`);
  }

  console.log("🎉 All face-api.js models downloaded!");
}

main().catch((err) => console.error("❌ Error:", err));
