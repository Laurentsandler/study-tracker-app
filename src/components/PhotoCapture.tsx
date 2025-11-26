'use client';

import { useRef, useState, useCallback } from 'react';
import { Camera, SwitchCamera, X, Check, RotateCcw } from 'lucide-react';

interface PhotoCaptureProps {
  onCapture: (imageBase64: string, mimeType: string) => void;
  onClose: () => void;
}

export default function PhotoCapture({ onCapture, onClose }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please ensure you have granted camera permissions.');
      setIsLoading(false);
    }
  }, [stream]);

  // Start camera on mount
  useState(() => {
    startCamera(facingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  });

  const switchCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    await startCamera(newFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const confirmPhoto = () => {
    if (!capturedImage) return;
    
    // Extract base64 data without the data URL prefix
    const base64Data = capturedImage.split(',')[1];
    onCapture(base64Data, 'image/jpeg');
    
    // Clean up
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
        <div className="text-white text-center max-w-md">
          <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-4">{error}</p>
          <button
            onClick={() => startCamera(facingMode)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg mr-2"
          >
            Try Again
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={handleClose}
          className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <span className="text-white font-medium">
          {capturedImage ? 'Preview' : 'Take Photo'}
        </span>
        <button
          onClick={switchCamera}
          className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          disabled={!!capturedImage}
        >
          <SwitchCamera className="w-6 h-6" />
        </button>
      </div>

      {/* Camera/Preview */}
      <div className="flex-1 relative">
        {isLoading && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
          </div>
        )}
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${capturedImage ? 'hidden' : ''}`}
        />
        
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent">
        {capturedImage ? (
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={retakePhoto}
              className="flex flex-col items-center gap-2 text-white"
            >
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                <RotateCcw className="w-6 h-6" />
              </div>
              <span className="text-sm">Retake</span>
            </button>
            <button
              onClick={confirmPhoto}
              className="flex flex-col items-center gap-2 text-white"
            >
              <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors">
                <Check className="w-6 h-6" />
              </div>
              <span className="text-sm">Use Photo</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <button
              onClick={capturePhoto}
              disabled={isLoading}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <div className="w-16 h-16 rounded-full border-4 border-gray-800" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
