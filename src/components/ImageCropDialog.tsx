import { useCallback, useEffect, useRef, useState } from 'react';
import { Move, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropDialogProps {
  isOpen: boolean;
  imageSrc: string;
  fileName: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
  aspectRatio?: number;
  outputWidth?: number;
}

const DEFAULT_ASPECT_RATIO = 1;
const DEFAULT_OUTPUT_WIDTH = 1200;

export function ImageCropDialog({
  isOpen,
  imageSrc,
  fileName,
  onCancel,
  onConfirm,
  aspectRatio = DEFAULT_ASPECT_RATIO,
  outputWidth = DEFAULT_OUTPUT_WIDTH,
}: ImageCropDialogProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 320, height: 320 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isExporting, setIsExporting] = useState(false);

  const resetState = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImageSize(null);
    setIsExporting(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
      return;
    }

    const observerTarget = previewRef.current;
    if (!observerTarget || typeof ResizeObserver === 'undefined') return;

    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = new ResizeObserver(() => {
      const rect = observerTarget.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setPreviewSize({ width: rect.width, height: rect.height });
      }
    });
    resizeObserverRef.current.observe(observerTarget);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [isOpen, resetState, aspectRatio]);

  useEffect(() => {
    if (!isOpen || !imageSize) return;

    const baseScale = Math.max(previewSize.width / imageSize.width, previewSize.height / imageSize.height);
    const renderWidth = imageSize.width * baseScale * zoom;
    const renderHeight = imageSize.height * baseScale * zoom;
    const limitX = Math.max(0, (renderWidth - previewSize.width) / 2);
    const limitY = Math.max(0, (renderHeight - previewSize.height) / 2);

    setOffset(current => ({
      x: Math.min(limitX, Math.max(-limitX, current.x)),
      y: Math.min(limitY, Math.max(-limitY, current.y)),
    }));
  }, [imageSize, isOpen, previewSize.height, previewSize.width, zoom]);

  const clampOffset = useCallback((nextOffset: { x: number; y: number }, nextZoom = zoom) => {
    if (!imageSize) return nextOffset;

    const baseScale = Math.max(previewSize.width / imageSize.width, previewSize.height / imageSize.height);
    const renderWidth = imageSize.width * baseScale * nextZoom;
    const renderHeight = imageSize.height * baseScale * nextZoom;
    const limitX = Math.max(0, (renderWidth - previewSize.width) / 2);
    const limitY = Math.max(0, (renderHeight - previewSize.height) / 2);

    return {
      x: Math.min(limitX, Math.max(-limitX, nextOffset.x)),
      y: Math.min(limitY, Math.max(-limitY, nextOffset.y)),
    };
  }, [imageSize, previewSize.height, previewSize.width, zoom]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageSize) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;
    setOffset(clampOffset({
      x: dragStateRef.current.originX + deltaX,
      y: dragStateRef.current.originY + deltaY,
    }));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const exportCroppedImage = async (): Promise<File> => {
    if (!imageRef.current || !imageSize) {
      throw new Error('Gambar belum siap');
    }

    const exportHeight = Math.round(outputWidth / aspectRatio);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get canvas context');
    }

    canvas.width = outputWidth;
    canvas.height = exportHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const baseScale = Math.max(outputWidth / imageSize.width, exportHeight / imageSize.height);
    const scaleRatio = outputWidth / previewSize.width;
    const renderWidth = imageSize.width * baseScale * zoom;
    const renderHeight = imageSize.height * baseScale * zoom;
    const drawX = ((outputWidth - renderWidth) / 2) + (offset.x * scaleRatio);
    const drawY = ((exportHeight - renderHeight) / 2) + (offset.y * scaleRatio);

    ctx.drawImage(imageRef.current, drawX, drawY, renderWidth, renderHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error('Gagal membuat gambar hasil crop'));
          return;
        }
        resolve(result);
      }, 'image/jpeg', 0.9);
    });

    const baseName = fileName.replace(/\.[^.]+$/, '') || 'profile-photo';
    return new File([blob], `${baseName}-cropped.jpg`, { type: 'image/jpeg' });
  };

  const handleConfirm = async () => {
    try {
      setIsExporting(true);
      const file = await exportCroppedImage();
      onConfirm(file);
    } catch (error) {
      console.error('Crop export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const outputHeight = Math.round(outputWidth / aspectRatio);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-[#334155] bg-[#0F172A] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1E293B] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Atur Foto Profil</h2>
            <p className="text-sm text-[#94A3B8]">Geser dan zoom bagian foto yang ingin dipakai.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-4">
            <div
              ref={previewRef}
              className="relative mx-auto w-full max-w-[320px] overflow-hidden rounded-2xl border border-[#334155] bg-[#111827]"
              style={{ aspectRatio: '1 / 1' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {imageSrc && (
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={e => {
                    const target = e.currentTarget;
                    setImageSize({ width: target.naturalWidth, height: target.naturalHeight });
                  }}
                  className={`absolute left-1/2 top-1/2 max-w-none select-none ${imageSize ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
                  style={imageSize ? (() => {
                    const baseScale = Math.max(previewSize.width / imageSize.width, previewSize.height / imageSize.height);
                    const renderWidth = imageSize.width * baseScale * zoom;
                    const renderHeight = imageSize.height * baseScale * zoom;
                    return {
                      width: `${renderWidth}px`,
                      height: `${renderHeight}px`,
                      transform: `translate(${offset.x - renderWidth / 2}px, ${offset.y - renderHeight / 2}px)`,
                    };
                  })() : { transform: 'translate(-50%, -50%)' }}
                  draggable={false}
                />
              )}
              <div className="pointer-events-none absolute inset-0 border-2 border-white/20" />
              <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/20" />
              <div className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/20" />
              <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/20" />
              <div className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/20" />
              {!imageSize && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-[#94A3B8]">
                  Memuat foto...
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#1E293B] bg-[#111827] p-4 text-sm text-[#94A3B8]">
              <div className="flex items-center gap-2 text-[#F8FAFC]">
                <Move className="h-4 w-4" />
                <span>Drag untuk memindahkan fokus foto</span>
              </div>
              <p className="mt-2">Hasil akhir akan otomatis dipotong ke rasio 1:1 dan diperkecil agar siap upload.</p>
              <p className="mt-1 truncate">{fileName}</p>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-[#1E293B] bg-[#111827] p-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-[#F8FAFC]">
                <span>Zoom</span>
                <span className="text-[#94A3B8]">{zoom.toFixed(2)}x</span>
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-[#94A3B8]" />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="w-full accent-[#60A5FA]"
                />
                <ZoomIn className="h-4 w-4 text-[#94A3B8]" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#334155] px-3 py-2 text-sm text-[#F8FAFC] hover:bg-[#1E293B]"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Crop
            </button>

            <div className="rounded-lg border border-[#334155] bg-[#0F172A] p-3 text-xs text-[#94A3B8]">
              Output: {outputWidth} x {outputHeight}px JPEG
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-lg border border-[#334155] px-4 py-2.5 text-sm font-medium text-[#F8FAFC] hover:bg-[#1E293B]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={isExporting || !imageSize}
                className="flex-1 rounded-lg bg-[#1E40AF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1E3A8A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting ? 'Mempersiapkan...' : 'Pakai Foto'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}