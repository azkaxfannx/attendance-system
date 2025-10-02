"use client";

import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

interface FaceDetectorProps {
  onFaceDetected: (faceData: any) => void;
  onNoFaceDetected: () => void;
}

export default function FaceDetector({
  onFaceDetected,
  onNoFaceDetected,
}: FaceDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string>("");
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const faceDetectedRef = useRef(false); // ← TAMBAHKAN INI

  useEffect(() => {
    loadModels();
    return () => {
      stopDetection();
    };
  }, []);

  const loadModels = async () => {
    try {
      const MODEL_URL = "/models";

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      setModelsLoaded(true);
    } catch (err) {
      console.error("Error loading models:", err);
      setError("Gagal memuat model deteksi wajah");
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user",
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError(
        "Tidak dapat mengakses kamera. Pastikan Anda memberikan izin kamera."
      );
    }
  };

  const startDetection = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    setIsDetecting(true);
    faceDetectedRef.current = false; // ← RESET STATE
    await startVideo();

    videoRef.current.addEventListener("play", () => {
      if (!videoRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const displaySize = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };

      faceapi.matchDimensions(canvas, displaySize);

      detectionIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        try {
          const detections = await faceapi
            .detectAllFaces(
              videoRef.current,
              new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceLandmarks()
            .withFaceDescriptors();

          const resizedDetections = faceapi.resizeResults(
            detections,
            displaySize
          );

          // Clear canvas
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }

          // Draw detections
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

          // Check if face detected
          if (detections.length > 0) {
            // CEK SUDAH PERNAH DETEKSI ATAU BELUM
            if (!faceDetectedRef.current) {
              faceDetectedRef.current = true; // MARK SUDAH DETEKSI

              // Wajah terdeteksi - ambil descriptor pertama
              const faceDescriptor = detections[0].descriptor;

              // Pastikan descriptor ada dan valid
              if (faceDescriptor && faceDescriptor.length > 0) {
                console.log(
                  "Face detected, descriptor length:",
                  faceDescriptor.length
                );

                // Kirim data yang sederhana dan valid
                onFaceDetected({
                  descriptor: Array.from(faceDescriptor),
                  timestamp: new Date().toISOString(),
                });

                // HENTIKAN DETEKSI SETELAH BERHASIL
                stopDetection();
              }
            }
          } else {
            // Tidak ada wajah
            onNoFaceDetected();
          }
        } catch (detectionError) {
          console.error("Error during face detection:", detectionError);
          onNoFaceDetected();
        }
      }, 1000);
    });
  };

  const stopDetection = () => {
    setIsDetecting(false);

    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {!modelsLoaded && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Memuat model deteksi wajah...</p>
        </div>
      )}

      <div className="relative bg-gray-900 rounded-2xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded-2xl"
          style={{ display: isDetecting ? "block" : "none" }}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ display: isDetecting ? "block" : "none" }}
        />

        {!isDetecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 rounded-2xl">
            <div className="text-center text-white">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📷</span>
              </div>
              <p className="text-lg font-medium">Kamera siap</p>
              <p className="text-gray-400 text-sm mt-1">
                Klik mulai untuk membuka kamera
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {!isDetecting ? (
          <button
            onClick={startDetection}
            disabled={!modelsLoaded}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
          >
            {modelsLoaded ? "🎥 Mulai Kamera" : "⏳ Memuat..."}
          </button>
        ) : (
          <button
            onClick={stopDetection}
            className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-red-600 hover:to-pink-600 transition-all duration-200 transform hover:-translate-y-0.5"
          >
            ⏹️ Hentikan Kamera
          </button>
        )}
      </div>

      {isDetecting && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-blue-800">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <p className="text-sm font-medium">Sedang mendeteksi wajah...</p>
          </div>
          <p className="text-blue-600 text-xs mt-1">
            Pastikan wajah Anda terlihat jelas di dalam frame kamera
          </p>
        </div>
      )}
    </div>
  );
}
