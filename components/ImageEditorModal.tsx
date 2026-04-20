
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { XMarkIcon, ArrowPathIcon, ArrowsPointingOutIcon, ArrowsPointingInIcon, CropIcon, HandRaisedIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowUturnLeftIcon, CheckCircleIcon } from './icons';

// TypeScript declaration for Cropper.js from CDN
declare var Cropper: any;

interface ImageEditorModalProps {
  imageSrc: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imageSrc, onSave, onClose }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // New state for enhanced features
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [dragMode, setDragMode] = useState<'crop' | 'move'>('move');
  const [isCropBoxActive, setIsCropBoxActive] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [grayscale, setGrayscale] = useState(false);
  const [sepia, setSepia] = useState(false);
  const [panState, setPanState] = useState({
    h: { value: 0, min: 0, max: 0, visible: false },
    v: { value: 0, min: 0, max: 0, visible: false },
  });

  const updatePanSliders = useCallback(() => {
    if (!cropperRef.current) return;
    const cropper = cropperRef.current;
    const imageData = cropper.getImageData();
    const containerData = cropper.getContainerData();

    const hVisible = imageData.width > containerData.width;
    const vVisible = imageData.height > containerData.height;

    setPanState({
      h: {
        visible: hVisible,
        min: hVisible ? containerData.width - imageData.width : 0,
        max: 0,
        value: imageData.left,
      },
      v: {
        visible: vVisible,
        min: vVisible ? containerData.height - imageData.height : 0,
        max: 0,
        value: imageData.top,
      },
    });
  }, []);

  useEffect(() => {
    if (imageRef.current) {
      const cropper = new Cropper(imageRef.current, {
        viewMode: 0, // No restrictions, allows free panning and zoom even when image is smaller than container.
        dragMode: 'move', // Default to pan
        autoCrop: false, // Do not show crop box on init
        restore: false,
        modal: false,
        guides: true,
        highlight: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        zoomOnWheel: true,
        wheelZoomRatio: 0.3,
        scalable: true,
        ready: () => updatePanSliders(),
        crop: () => updatePanSliders(),
        zoom: () => updatePanSliders(),
        cropstart: (event: CustomEvent) => {
          // Only set the crop box as active if the action is 'crop' (drawing a new box).
          // This prevents panning ('move') from incorrectly showing the apply/cancel buttons.
          if (event.detail.action === 'crop') {
            setIsCropBoxActive(true);
          }
        },
      });
      cropperRef.current = cropper;
    }

    return () => {
      if (cropperRef.current) {
        cropperRef.current.destroy();
      }
    };
  }, [imageSrc, updatePanSliders]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleRotate = () => {
    cropperRef.current?.rotate(90);
  };
  
  const handleZoomIn = () => {
    cropperRef.current?.zoom(0.4);
  };
  
  const handleZoomOut = () => {
    cropperRef.current?.zoom(-0.4);
  };
  
  const handleResetView = () => {
    cropperRef.current?.reset();
  };

  const setDragModeAndFocus = (mode: 'crop' | 'move') => {
    setDragMode(mode);
    cropperRef.current?.setDragMode(mode);
  };
  
  const handleHorizontalPan = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!cropperRef.current) return;
    const top = cropperRef.current.getImageData().top;
    cropperRef.current.moveTo(Number(e.target.value), top);
  };

  const handleVerticalPan = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!cropperRef.current) return;
    const left = cropperRef.current.getImageData().left;
    cropperRef.current.moveTo(left, Number(e.target.value));
  };

  const handleApplyCrop = useCallback(() => {
    if (!cropperRef.current) return;
    const dataUrl = cropperRef.current.getCroppedCanvas().toDataURL();
    cropperRef.current.replace(dataUrl);
    setIsCropBoxActive(false);
    // Also reset cropper's internal drag mode to prevent accidentally drawing another crop box.
    cropperRef.current.setDragMode('move'); 
    setDragMode('move');
  }, []);

  const handleCancelCrop = useCallback(() => {
      if (!cropperRef.current) return;
      cropperRef.current.clear();
      setIsCropBoxActive(false);
      setDragMode('move');
      cropperRef.current.setDragMode('move');
  }, []);


  const handleResetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setGrayscale(false);
    setSepia(false);
  };

  const handleSave = () => {
    if (!cropperRef.current) return;
    
    setIsProcessing(true);
    setTimeout(() => {
        try {
            // FIX: Replaced the faulty save logic which called a non-existent `getCanvas()` method. The new logic uses
            // `getCroppedCanvas()` (which handles both cropped and uncropped states) and then creates a separate canvas
            // to reliably apply visual filters before generating the final image. This resolves the error and fixes a latent bug.
            const sourceCanvas = cropperRef.current.getCroppedCanvas({
                maxWidth: 4096, maxHeight: 4096,
                imageSmoothingEnabled: true, imageSmoothingQuality: 'high',
            });

            if (!sourceCanvas) {
                throw new Error("Could not get source canvas from cropper.");
            }
            
            const filters: string[] = [];
            if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
            if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
            if (grayscale) filters.push('grayscale(100%)');
            if (sepia) filters.push('sepia(100%)');

            let finalCanvas = sourceCanvas;

            if (filters.length > 0) {
                const destCanvas = document.createElement('canvas');
                destCanvas.width = sourceCanvas.width;
                destCanvas.height = sourceCanvas.height;
                const destCtx = destCanvas.getContext('2d');

                if (!destCtx) {
                    throw new Error("Could not get destination canvas context.");
                }
                
                destCtx.filter = filters.join(' ');
                destCtx.drawImage(sourceCanvas, 0, 0);
                finalCanvas = destCanvas;
            }
            
            const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.95);
            onSave(dataUrl);

        } catch (error) {
            console.error("Error during save:", error);
            alert("An error occurred while saving the image.");
        } finally {
            setIsProcessing(false);
        }
    }, 10);
  };
  
  const cropperStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale ? 100 : 0}%) sepia(${sepia ? 100 : 0}%)`
  };
  
  const iconButtonClass = "p-2 rounded-full text-text-secondary hover:bg-surface-soft hover:text-text-primary transition-colors";
  const controlButtonClass = "flex items-center gap-2 px-3 py-1.5 text-sm font-semibold bg-surface text-text-primary rounded-md hover:bg-border-default transition-colors";
  const activeControlButtonClass = "!bg-primary/20 !text-primary";

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[70] transition-all duration-300 ${isFullScreen ? 'p-0' : 'p-4'}`}>
      <div className={`bg-surface shadow-2xl flex flex-col ${isFullScreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl max-h-[90vh] rounded-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex-shrink-0 flex justify-between items-center border-b border-border-default p-2 pl-4">
          <h3 className="text-xl font-semibold text-text-primary">Edit Image</h3>
          <div className="flex items-center gap-2">
             <button onClick={() => setIsFullScreen(!isFullScreen)} className={iconButtonClass} title={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"}>
                {isFullScreen ? <ArrowsPointingInIcon className="h-6 w-6" /> : <ArrowsPointingOutIcon className="h-6 w-6" />}
             </button>
             <button onClick={onClose} className={iconButtonClass} title="Close">
                <XMarkIcon className="h-6 w-6" />
             </button>
          </div>
        </div>
        <div className="flex-1 p-4 min-h-0 overflow-hidden">
            <div className="w-full h-full bg-black/50 relative group">
                <div className="w-full h-full" style={cropperStyle}>
                    <img ref={imageRef} src={imageSrc} style={{ display: 'block', maxWidth: '100%', maxHeight: '100%' }} alt="Image editor canvas"/>
                </div>
                {panState.h.visible && (
                    <input
                      type="range"
                      min={panState.h.min}
                      max={panState.h.max}
                      value={panState.h.value}
                      onChange={handleHorizontalPan}
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] h-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-primary z-20 opacity-30 group-hover:opacity-100 transition-opacity"
                      aria-label="Horizontal scroll"
                    />
                )}
                {panState.v.visible && (
                    <input
                      type="range"
                      min={panState.v.min}
                      max={panState.v.max}
                      value={panState.v.value}
                      onChange={handleVerticalPan}
                      className="absolute top-1/2 right-1 -translate-y-1/2 h-[calc(100%-2rem)] w-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-primary z-20 opacity-30 group-hover:opacity-100 transition-opacity"
                      style={{ writingMode: 'vertical-lr', WebkitAppearance: 'slider-vertical' }}
                      aria-label="Vertical scroll"
                    />
                )}
            </div>
        </div>
        <div className="flex-shrink-0 bg-surface-soft p-3 border-t border-border-default space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                    <label htmlFor="brightness" className="text-sm font-medium text-text-secondary flex-shrink-0">Brightness</label>
                    <input id="brightness" type="range" min="50" max="150" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full h-2 bg-border-default rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
                <div className="flex items-center gap-2">
                     <label htmlFor="contrast" className="text-sm font-medium text-text-secondary flex-shrink-0">Contrast</label>
                    <input id="contrast" type="range" min="50" max="150" value={contrast} onChange={e => setContrast(Number(e.target.value))} className="w-full h-2 bg-border-default rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>
            </div>
            <div className="flex justify-between items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 p-1 bg-surface rounded-lg">
                        <button
                            onClick={() => setDragModeAndFocus('move')}
                            className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors font-semibold ${dragMode === 'move' && !isCropBoxActive ? 'bg-primary text-white' : 'bg-transparent text-text-primary hover:bg-surface-soft'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            disabled={isCropBoxActive}
                            title="Pan Tool (M)"
                        >
                            <HandRaisedIcon className="h-5 w-5" /> Pan
                        </button>
                        <button
                            onClick={() => setDragModeAndFocus('crop')}
                            className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors font-semibold ${dragMode === 'crop' && !isCropBoxActive ? 'bg-primary text-white' : 'bg-transparent text-text-primary hover:bg-surface-soft'} disabled:opacity-50 disabled:cursor-not-allowed`}
                            disabled={isCropBoxActive}
                            title="Crop Tool (C)"
                        >
                            <CropIcon className="h-5 w-5" /> Crop
                        </button>
                    </div>

                    {isCropBoxActive && (
                        <>
                            <div className="border-l border-border-default h-6 mx-1"></div>
                            <div className="flex items-center gap-2 p-1 bg-surface rounded-lg">
                                <button onClick={handleApplyCrop} className="flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors font-semibold bg-success/20 text-success hover:bg-success/30" title="Apply Crop">
                                    <CheckCircleIcon className="h-5 w-5" /> Apply
                                </button>
                                <button onClick={handleCancelCrop} className="flex items-center gap-1.5 px-3 py-1 text-sm rounded-md transition-colors font-semibold bg-danger/20 text-danger hover:bg-danger/30" title="Cancel Crop">
                                    <XMarkIcon className="h-5 w-5" /> Cancel
                                </button>
                            </div>
                        </>
                    )}
                    
                    <p className="text-xs text-text-secondary hidden md:block">
                        {isCropBoxActive
                            ? 'Adjust boundaries, then apply or cancel.'
                            : 'To crop, select Crop then drag on the image.'}
                    </p>

                    <div className="border-l border-border-default h-6 mx-1"></div>
                    <button onClick={handleRotate} className={iconButtonClass} title="Rotate 90 degrees">
                        <ArrowPathIcon className="h-5 w-5" />
                    </button>
                     <button onClick={handleResetView} className={iconButtonClass} title="Reset View">
                        <ArrowUturnLeftIcon className="h-5 w-5" />
                    </button>
                    <div className="flex items-center bg-surface p-0.5 rounded-md">
                        <button onClick={handleZoomOut} className={iconButtonClass} title="Zoom Out (-)">
                            <MagnifyingGlassMinusIcon className="h-5 w-5" />
                        </button>
                        <button onClick={handleZoomIn} className={iconButtonClass} title="Zoom In (+)">
                            <MagnifyingGlassPlusIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <button onClick={() => setGrayscale(!grayscale)} className={`${controlButtonClass} ${grayscale ? activeControlButtonClass : ''}`}>Grayscale</button>
                    <button onClick={() => setSepia(!sepia)} className={`${controlButtonClass} ${sepia ? activeControlButtonClass : ''}`}>Sepia</button>
                    <button onClick={handleResetFilters} className={`${controlButtonClass} !text-amber-500 hover:!bg-amber-500/10`}>Reset Filters</button>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-surface text-text-primary rounded-md hover:bg-border-default transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={isProcessing} className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50">
                        {isProcessing ? 'Saving...' : 'Save & Close'}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
