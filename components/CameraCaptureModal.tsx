
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { XMarkIcon, CameraIcon, ArrowPathIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon } from './icons';

interface CameraCaptureModalProps {
    onCapture: (dataUrl: string) => void;
    onClose: () => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null); 
    
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [activeDeviceId, setActiveDeviceId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isSwitching, setIsSwitching] = useState(false);

    // Capabilities
    const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number, max: number, step: number } | null>(null);
    const [zoomLevel, setZoomLevel] = useState<number>(1);

    // 1. Get available video devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                // Request initial permission to enumerate labels.
                const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
                initialStream.getTracks().forEach(track => track.stop());
                
                const allDevices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
                setDevices(videoDevices);
                
                // Prioritize back/environment camera
                const backCamera = videoDevices.find(device => 
                    device.label.toLowerCase().includes('back') || 
                    device.label.toLowerCase().includes('environment')
                );
                
                if (backCamera) {
                    setActiveDeviceId(backCamera.deviceId);
                } else if (videoDevices.length > 0) {
                    setActiveDeviceId(videoDevices[0].deviceId);
                } else {
                    setActiveDeviceId('default'); 
                }
            } catch (err) {
                console.error("Error enumerating devices:", err);
                setError("Camera access denied. Please allow camera permissions.");
            }
        };

        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            getDevices();
        } else {
            setError("Camera API not supported in this browser.");
        }
    }, []);

    // 2. Start video stream with intelligent constraints
    useEffect(() => {
        if (!activeDeviceId) return;

        const startStream = async () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            setError(null);
            setZoomCapabilities(null);
            setZoomLevel(1);

            try {
                // INTELLIGENT ORIENTATION ADJUSTMENT
                // Detect if screen is portrait (mobile) or landscape (desktop)
                const isPortrait = window.innerHeight > window.innerWidth;
                
                // Request resolution that matches orientation to fill width nicely
                const idealWidth = isPortrait ? 1080 : 1920;
                const idealHeight = isPortrait ? 1920 : 1080;

                let newStream: MediaStream;

                try {
                    // Attempt 1: High Res + Orientation + Exact Device
                    newStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            deviceId: { exact: activeDeviceId },
                            width: { ideal: idealWidth }, 
                            height: { ideal: idealHeight },
                            // @ts-ignore - 'focusMode' is not yet in standard TS types but supported by browsers
                            focusMode: 'continuous' 
                        }
                    });
                } catch (err1) {
                    console.warn("High-res constraint failed, trying basic...", err1);
                    try {
                        // Attempt 2: Basic ID
                        newStream = await navigator.mediaDevices.getUserMedia({
                            video: { deviceId: { exact: activeDeviceId } }
                        });
                    } catch (err2) {
                        // Attempt 3: Fallback environment
                        newStream = await navigator.mediaDevices.getUserMedia({
                            video: { facingMode: 'environment' }
                        });
                    }
                }
                
                streamRef.current = newStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = newStream;
                }

                // INTELLIGENT CAPABILITIES DETECTION
                const track = newStream.getVideoTracks()[0];
                const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
                
                // Auto-enable continuous focus if supported (crucial for documents)
                if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                    track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as any).catch(() => {});
                }

                // Detect Zoom capabilities
                if (capabilities.zoom) {
                    setZoomCapabilities({
                        min: capabilities.zoom.min,
                        max: capabilities.zoom.max,
                        step: capabilities.zoom.step
                    });
                    // Default to 1x zoom
                    setZoomLevel(capabilities.zoom.min || 1);
                }

            } catch (err) {
                console.error("Camera error:", err);
                setError("Failed to start video stream.");
            }
        };

        startStream();

    }, [activeDeviceId]);

    // 3. Cleanup
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleSwitchCamera = () => {
        if (devices.length < 2) return;
        setIsSwitching(true);
        const currentIndex = devices.findIndex(d => d.deviceId === activeDeviceId);
        const nextIndex = (currentIndex + 1) % devices.length;
        setActiveDeviceId(devices[nextIndex].deviceId);
        setTimeout(() => setIsSwitching(false), 500);
    };

    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseFloat(e.target.value);
        setZoomLevel(newZoom);
        
        if (streamRef.current) {
            const track = streamRef.current.getVideoTracks()[0];
            track.applyConstraints({ advanced: [{ zoom: newZoom }] } as any).catch(err => console.error(err));
        }
    }

    const handleCapture = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                // Capture at full native resolution
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                onCapture(dataUrl);
                onClose();
            }
        }
    }, [onCapture, onClose]);

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 left-0 right-0 z-20 text-white backdrop-blur-sm">
                <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                    <XMarkIcon className="h-6 w-6" />
                </button>
                <span className="font-semibold">Scan Document</span>
                {devices.length > 1 ? (
                    <button 
                        onClick={handleSwitchCamera} 
                        className={`p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all ${isSwitching ? 'rotate-180' : ''}`}
                    >
                        <ArrowPathIcon className="h-6 w-6" />
                    </button>
                ) : <div className="w-10"></div>}
            </div>

            {/* Video Viewport */}
            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden group">
                {error ? (
                    <div className="text-white text-center p-6 max-w-sm">
                        <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center mx-auto mb-4">
                            <CameraIcon className="h-6 w-6 text-danger" />
                        </div>
                        <p className="mb-2 font-bold">Camera Error</p>
                        <p className="text-sm text-gray-300">{error}</p>
                        <button onClick={onClose} className="mt-6 px-4 py-2 bg-white/10 rounded-full text-sm font-medium hover:bg-white/20 transition-colors">Close</button>
                    </div>
                ) : (
                    <>
                        {/* Video Element: object-cover ensures it fills the screen width intelligently */}
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover"
                        />
                        
                        {/* Intelligent Zoom Controls */}
                        {zoomCapabilities && (
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3/4 max-w-xs z-30 flex items-center gap-3 bg-black/40 p-2 rounded-full backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100">
                                <MagnifyingGlassMinusIcon className="h-4 w-4 text-white" />
                                <input 
                                    type="range" 
                                    min={zoomCapabilities.min} 
                                    max={zoomCapabilities.max} 
                                    step={zoomCapabilities.step} 
                                    value={zoomLevel} 
                                    onChange={handleZoomChange}
                                    className="flex-1 h-1 bg-white/50 rounded-lg appearance-none cursor-pointer accent-white"
                                />
                                <MagnifyingGlassPlusIcon className="h-4 w-4 text-white" />
                            </div>
                        )}
                    </>
                )}
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Document Guide Overlay */}
                {!error && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-[85%] aspect-[3/4] sm:aspect-[4/3] border-2 border-white/50 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-lg"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-lg"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-lg"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-lg"></div>
                            <p className="absolute -bottom-10 left-0 right-0 text-center text-white text-sm font-medium drop-shadow-md">Align document within frame</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls */}
            {!error && (
                <div className="p-8 bg-black/80 flex justify-center items-center gap-8 backdrop-blur-md z-20">
                    <button 
                        onClick={handleCapture}
                        className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/30 active:scale-95 transition-all shadow-lg"
                        aria-label="Capture Photo"
                    >
                        <div className="w-16 h-16 bg-white rounded-full"></div>
                    </button>
                </div>
            )}
        </div>
    );
};
