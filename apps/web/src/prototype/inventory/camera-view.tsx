// PROTOTYPE. Throwaway. The camera view of the Purchase prototype, bound to
// the Inventory session. Copied, not shared. Every
// variant places and sizes it in its own way.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Camera, CameraOff, Volume2, VolumeX } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import type { Force } from '../purchase/decoder';
import { useSession } from './session';

export function CameraView({
  force, autoStart, className, children, feedbackPlacement = 'top',
}: {
  force: Force;
  autoStart: boolean;
  className?: string;
  children?: ReactNode;
  feedbackPlacement?: 'top' | 'below-chips' | 'bottom';
}) {
  const [state, session] = useSession(force);
  const video = useRef<HTMLVideoElement>(null);
  const [wanted, setWanted] = useState(autoStart);
  const { scanner, feedback: toast, flash, audio } = state;

  useEffect(() => {
    if (!wanted || !video.current) return;
    session.attachCamera(video.current);
    return () => session.detachCamera();
  }, [wanted, session]);

  const label = scanner.decoder
    ? `${scanner.decoder === 'native' ? 'Native' : 'ZXing'} · ${scanner.thread === 'worker' ? 'worker' : 'main thread'}${scanner.lastDecodeMs !== null ? ` · ${scanner.lastDecodeMs} ms` : ''}`
    : scanner.camera === 'on' ? 'Decoder loads' : '';

  return (
    <div className={cn('relative overflow-hidden bg-black text-white', className)}>
      <video ref={video} playsInline muted autoPlay className="absolute inset-0 size-full object-cover" />

      {/* The flash: a thick green or red frame for 0.7 s. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-300',
          flash === 'unknown' ? 'ring-[10px] ring-red-500 ring-inset opacity-100' : flash ? 'ring-[10px] ring-green-500 ring-inset opacity-100' : 'opacity-0',
        )}
      />

      {/* The scan frame: a thin corner guide. */}
      {scanner.camera === 'on' && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] top-1/2 h-28 -translate-y-1/2 rounded-lg border-2 border-white/60" />
      )}

      {scanner.camera !== 'on' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
          {scanner.camera === 'off' && !wanted && (
            <Button size="lg" onClick={() => setWanted(true)}><Camera data-icon="inline-start" /> Start the camera</Button>
          )}
          {scanner.camera === 'starting' && <p className="text-white/80">The camera starts.</p>}
          {scanner.camera === 'denied' && (
            <>
              <CameraOff className="size-8 text-white/70" />
              <p>The camera permission was refused. Allow the camera for this site and reload.</p>
            </>
          )}
          {scanner.camera === 'error' && (
            <>
              <CameraOff className="size-8 text-white/70" />
              <p>The camera did not start.</p>
              <p className="font-mono text-xs text-white/70">{scanner.message}</p>
            </>
          )}
        </div>
      )}

      {/* The on-screen feedback. */}
      {toast && (
        <div
          role="status"
          className={cn(
            'absolute inset-x-3 z-10 flex items-start gap-2 rounded-lg px-3 py-2 shadow-lg',
            feedbackPlacement === 'top' ? 'top-3' : feedbackPlacement === 'below-chips' ? 'top-14' : 'bottom-3',
            toast.kind === 'unknown' ? 'bg-red-600 text-white' : 'bg-green-600 text-white',
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{toast.title}</p>
            <p className="truncate text-xs opacity-90">{toast.detail}</p>
          </div>
          {toast.kind === 'repeat' && <span className="rounded-full bg-white/25 px-2 text-xs font-medium">+1</span>}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-1.5 left-2 flex items-center gap-2 font-mono text-[11px] text-white/80">
        {label && <span className="rounded bg-black/50 px-1.5 py-0.5">{label}</span>}
        {scanner.message && scanner.camera === 'on' && <span className="rounded bg-red-700/80 px-1.5 py-0.5">{scanner.message}</span>}
      </div>
      <div className="pointer-events-none absolute right-2 bottom-1.5 flex items-center gap-1 text-white/80">
        {audio ? <Volume2 className="size-4" /> : <VolumeX className="size-4" aria-label="Tap once for sound" />}
      </div>

      {children}
    </div>
  );
}
