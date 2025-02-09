'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import ProgressBar from '@/components/ProgressBar';
import Link from 'next/link';
import { useMeasurementsStore } from '@/store';

const steps = [
  "Introduction",
  "Scan Face",
  "Design",
  "Review",
];

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);

  const { setMeasurements } = useMeasurementsStore();
  const { resetMeasurements } = useMeasurementsStore();
  const { measurements } = useMeasurementsStore();

  const [error, setError] = useState<string | null>(null);

  // Request access to the user's webcam.
  useEffect(() => {
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing the camera:", err);
        setError("Error accessing the camera. Please allow camera access and try again.");
      }
    }
    initCamera();
  }, []);

  const startScan = async () => {
    setScanning(true);
    resetMeasurements();
    setError(null);
    try {
      // Capture a frame from the video stream.
      if (!videoRef.current) {
        setError("Video not available.");
        setScanning(false);
        return;
      }
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError("Could not get canvas context.");
        setScanning(false);
        return;
      }
      // Note: Even though the video is mirrored in the preview (CSS),
      // drawing the video to canvas uses the actual image data (unmirrored).
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL('image/jpeg');

      // Send the image to the Flask API.
      const response = await fetch('http://127.0.0.1:5000/api/measure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: imageDataUrl })
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMeasurements({
          eyeWidth: data.eye_width_mm,
          bridgeWidth: data.bridge_width_mm,
          sideLength: data.b_size_mm
        });
      }
    } catch (err: any) {
      setError("An error occurred: " + err.message);
    }
    setScanning(false);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold mb-4">Face Scan</h1>
      
      {/* Video Preview Container with Oval Overlay */}
      <div className="relative mb-4">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-80 h-60 border-2 border-gray-300 rounded"
          // Mirror the preview so that your movements feel natural.
          style={{ transform: 'scaleX(-1)' }}
        />
        {/* Overlay Oval */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="border-4 border-dashed border-white rounded-full"
            style={{
              width: '25%',   // Horizontally smaller
              height: '49%',  // Vertically longer
            }}
          />
        </div>
      </div>

      <p className="mb-8 text-center max-w-xl">
        Please position your face within the oval overlay (as seen above) and then click the button below to begin the scan.
      </p>

      {scanning ? (
        <p className="mb-8">Scanning... please wait.</p>
      ) : measurements ? (
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Measurement Results</h2>
          <ul>
            <li>Eye Width: {measurements.eyeWidth} mm</li>
            <li>Bridge Width: {measurements.eyeWidth} mm</li>
            <li>B Size (Vertical): {measurements.sideLength} mm</li>
          </ul>
        </div>
      ) : error ? (
        <p className="mb-8 text-red-500">{error}</p>
      ) : (
        <p className="mb-8">Click the button below to start scanning.</p>
      )}

      <div className="flex gap-4">
        <Button onClick={startScan} disabled={scanning}>
          {scanning ? "Scanning..." : "Start Scan"}
        </Button>
        {measurements != null && (
          <Link href="/design">
            <Button>Next: Design</Button>
          </Link>
        )}
      </div>

      <div className="mt-8">
        <ProgressBar index={2} steps={steps} />
      </div>
    </main>
  );
}
