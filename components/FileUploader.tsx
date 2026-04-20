
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ShareToolbar } from './ShareToolbar';
import { ImageEditorModal } from './ImageEditorModal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { CameraIcon, ComputerDesktopIcon } from './icons';

interface OnFileUploadPayload {
  file: File;
  dataUrl: string;
}

interface FileUploaderProps {
  onFileUpload: (payload: OnFileUploadPayload) => void;
  label: string;
  currentFileUrl?: string | null;
}

const MAX_FILE_SIZE_MB = 0.5; // Target 500 KB for fast processing
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Add pdfjsLib to window scope
declare const pdfjsLib: any;

async function convertPdfToImage(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1); // Get the first page
    const viewport = page.getViewport({ scale: 1.5 }); // Reduced scale for smaller initial image
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
        canvasContext: context,
        viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    return canvas.toDataURL('image/jpeg', 0.9); // 90% quality JPEG
}


async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get canvas context'));

        const MAX_DIMENSION = 1920;
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        const attemptCompression = () => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                if (blob.size <= MAX_FILE_SIZE_BYTES || quality <= 0.1) {
                  console.log(`Compressed from ${(file.size / 1024).toFixed(2)} KB to ${(blob.size / 1024).toFixed(2)} KB`);
                  resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' }));
                } else {
                  quality -= 0.1;
                  attemptCompression();
                }
              } else reject(new Error('Canvas toBlob failed'));
            }, 'image/jpeg', quality
          );
        };
        attemptCompression();
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

function dataURLtoFile(dataurl: string, filename: string): File {
    let arr = dataurl.split(','), mimeMatch = arr[0].match(/:(.*?);/), mime = mimeMatch ? mimeMatch[1] : 'image/jpeg',
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}


export const FileUploader: React.FC<FileUploaderProps> = ({ onFileUpload, label }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<{ dataUrl: string; fileName: string; mimeType: string } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!file) return;

    // Check file type for drag-and-drop, as 'accept' only works for file input dialog
    const acceptedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!acceptedTypes.includes(file.type)) {
        setError(`Invalid file type. Please upload a JPEG, PNG, or PDF.`);
        return;
    }

    setError(null);
    setIsProcessing(true);
    setFilePreview(null);

    try {
        let imageFile: File;

        // Step 1: Ensure we have an image file, converting PDF if necessary.
        if (file.type === 'application/pdf') {
            console.log("Converting PDF to image...");
            const dataUrl = await convertPdfToImage(file);
            const blob = await (await fetch(dataUrl)).blob();
            imageFile = new File([blob], file.name.replace(/\.pdf$/i, ".jpg"), { type: 'image/jpeg' });
        } else {
            imageFile = file;
        }
        
        // Step 2: Compress the image file if it's over the size limit.
        let finalFile = imageFile;
        if (imageFile.size > MAX_FILE_SIZE_BYTES) {
            console.log(`Image is too large (${(imageFile.size / 1024 / 1024).toFixed(2)} MB), compressing...`);
            finalFile = await compressImage(imageFile);
        }

        // Step 3: Process the final, potentially compressed, file.
        const reader = new FileReader();
        reader.onload = () => {
            const resultDataUrl = reader.result as string;
            setFilePreview({
                fileName: finalFile.name,
                mimeType: finalFile.type,
                dataUrl: resultDataUrl,
            });
            onFileUpload({ file: finalFile, dataUrl: resultDataUrl });
            setIsProcessing(false);
        };
        reader.onerror = () => {
            setError('Failed to read file.');
            setIsProcessing(false);
        };
        reader.readAsDataURL(finalFile);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'File processing failed. Please try again.';
      setError(`Error: ${errorMessage}`);
      setIsProcessing(false);
    }
  }, [onFileUpload]);


  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
     // Reset file input to allow uploading the same file again
    if(event.target) {
        event.target.value = '';
    }
  }, [processFile]);

  const handleCameraCapture = async (dataUrl: string) => {
      // Create a file object from the camera capture
      const filename = `scan_${Date.now()}.jpg`;
      const file = dataURLtoFile(dataUrl, filename);
      await processFile(file);
  };
  
  const handleScreenCapture = async () => {
        try {
            // 1. Request screen share stream
            // @ts-ignore - TS might complain about getDisplayMedia if lib not configured
            const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: { cursor: "never" } as any,
                audio: false
            });

            // 2. Play stream in hidden video element to grab frame
            const video = document.createElement('video');
            video.srcObject = stream;
            video.onloadedmetadata = async () => {
                await video.play();
                
                // 3. Draw current frame to canvas
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const context = canvas.getContext('2d');
                if (context) {
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
                    
                    // 4. Stop all tracks to release screen share
                    stream.getTracks().forEach(track => track.stop());

                    // 5. Open Editor immediately so user can crop the region
                    setFilePreview({
                        fileName: `screen_snip_${Date.now()}.jpg`,
                        mimeType: 'image/jpeg',
                        dataUrl: dataUrl
                    });
                    setIsEditorOpen(true);
                }
            };
        } catch (err) {
            console.error("Screen capture cancelled or failed:", err);
            // User likely cancelled the browser prompt
        }
  };


  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  }, [processFile]);

  const triggerFileInput = () => { fileInputRef.current?.click(); };
  const openModal = () => { if (filePreview) setShowPreviewModal(true); };
  const closeModal = useCallback(() => { setShowPreviewModal(false); }, []);

  useEffect(() => {
    if (!showPreviewModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPreviewModal, closeModal]);

  return (
    <div className="w-full">
      <div 
        className={`mt-1 flex flex-col justify-center items-center text-center p-6 border-2 border-border-default border-dashed rounded-md transition-colors ${isDraggingOver ? 'border-primary bg-primary/10' : 'hover:border-primary'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3 w-full">
            <div className="cursor-pointer text-center" onClick={triggerFileInput}>
                <span className="text-primary font-semibold hover:underline">Click to upload</span>
                <span className="text-text-primary"> or drag and drop</span>
                <span className="block text-xs text-text-secondary mt-1">Image or PDF (max ~{MAX_FILE_SIZE_MB * 1000}KB)</span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-text-secondary w-full">
                <div className="flex-1 h-px bg-border-default"></div>
                <span>OR USE TOOLS</span>
                <div className="flex-1 h-px bg-border-default"></div>
            </div>

            <div className="flex gap-2 flex-wrap justify-center">
                <button 
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-soft hover:bg-border-default text-text-primary rounded-full transition-colors border border-border-default shadow-sm"
                >
                    <CameraIcon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">Scan with Camera</span>
                </button>
                 <button 
                    type="button"
                    onClick={handleScreenCapture}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-soft hover:bg-border-default text-text-primary rounded-full transition-colors border border-border-default shadow-sm"
                    title="Capture a region of your screen"
                >
                    <ComputerDesktopIcon className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">Snip from Screen</span>
                </button>
            </div>
        </div>
        <input ref={fileInputRef} id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/jpeg,image/png,application/pdf" />
      </div>

      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-text-secondary mt-2">
            <div className="flex items-center justify-center space-x-1.5">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
            </div>
            <span>Processing file...</span>
        </div>
      )}
      {error && <p className="text-danger text-xs mt-1">{error}</p>}
      
      {filePreview && (
        <div className="mt-4 flex items-center gap-4">
          <div 
            className="border border-border-default rounded-md p-2 mt-1 inline-block cursor-pointer hover:shadow-lg transition-shadow"
            onClick={openModal}
            title="Click to view full preview"
          >
             <img src={filePreview.dataUrl} alt="Preview" className="h-20 w-auto object-cover rounded" />
          </div>
          <button 
            type="button" 
            onClick={() => setIsEditorOpen(true)}
            className="px-3 py-1.5 text-sm font-semibold bg-surface-soft text-text-primary rounded-md hover:bg-border-default transition-colors"
          >
            Edit
          </button>
        </div>
      )}

      {showPreviewModal && filePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-surface p-4 rounded-lg shadow-2xl relative max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border-default pb-2 mb-4">
              <h3 className="text-lg font-semibold text-text-primary">{filePreview.fileName}</h3>
              <button onClick={closeModal} className="text-text-secondary hover:text-text-primary text-4xl font-light leading-none transition-colors">&times;</button>
            </div>
            <div className="flex-1 overflow-auto">
              <img src={filePreview.dataUrl} alt="Full preview" className="max-w-full max-h-full mx-auto" />
            </div>
             <ShareToolbar file={{
              dataUrl: filePreview.dataUrl,
              fileName: filePreview.fileName,
              mimeType: filePreview.mimeType,
            }} />
          </div>
        </div>
      )}
      
      {isEditorOpen && filePreview && (
        <ImageEditorModal
            imageSrc={filePreview.dataUrl}
            onClose={() => setIsEditorOpen(false)}
            onSave={(newDataUrl) => {
                const newFile = dataURLtoFile(newDataUrl, filePreview.fileName.replace(/\.[^/.]+$/, ".jpg"));
                setFilePreview({
                    fileName: newFile.name,
                    mimeType: newFile.type,
                    dataUrl: newDataUrl,
                });
                onFileUpload({ file: newFile, dataUrl: newDataUrl });
                setIsEditorOpen(false);
            }}
        />
      )}

      {isCameraOpen && (
          <CameraCaptureModal 
            onCapture={handleCameraCapture}
            onClose={() => setIsCameraOpen(false)}
          />
      )}
    </div>
  );
};
