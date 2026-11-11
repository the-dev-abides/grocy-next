import { cn } from 'cn';
import { CameraOff, Volume2, VolumeX } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { FeedbackKind } from './feedback';
import type { ScannerStatus } from './scanner';
import type { ScanBanner } from './use-scan-feedback';

// The small label with the active decoder and the thread, as ADR 0009
// decided. A bug report names the decoder from this label.
function decoderLabel(status: ScannerStatus): string {
  if (status.decoder === null) {
    return status.camera === 'on' ? 'Decoder loads' : '';
  }
  const decoder = status.decoder === 'native' ? 'Native' : 'ZXing';
  const thread = status.thread === 'worker' ? 'worker' : 'main thread';
  const time =
    status.lastDecodeMs === null ? '' : ` · ${String(status.lastDecodeMs)} ms`;
  return `${decoder} · ${thread}${time}`;
}

// The message when the camera is not on: the start, a refused permission
// with a retry button, or an error with a retry button.
function CameraMessage({
  onRetry,
  status,
}: Readonly<{ onRetry: () => void; status: ScannerStatus }>) {
  if (status.camera === 'starting') {
    return <p className="text-white/80">The camera starts.</p>;
  }
  if (status.camera === 'off') {
    return null;
  }
  return (
    <>
      <CameraOff className="size-8 text-white/70" />
      <p>
        {status.camera === 'denied'
          ? 'The camera permission was refused. Allow the camera for this site, then retry. The code field still works.'
          : 'The camera did not start.'}
      </p>
      {status.camera === 'error' && (
        <p className="font-mono text-xs text-white/70">{status.message}</p>
      )}
      <Button variant="secondary" onClick={onRetry}>
        Retry
      </Button>
    </>
  );
}

// The banner with the outcome of the last scan.
function Banner({ banner }: Readonly<{ banner: ScanBanner }>) {
  return (
    <div
      role="status"
      className={cn(
        `
          absolute inset-x-3 top-3 z-10 flex items-start gap-2 rounded-lg px-3
          py-2 text-white shadow-lg
        `,
        banner.kind === 'unknown' ? 'bg-red-600' : 'bg-green-600',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{banner.title}</p>
        <p className="truncate text-xs opacity-90">{banner.detail}</p>
      </div>
      {banner.pill !== undefined && (
        <span className="rounded-full bg-white/25 px-2 text-xs font-medium">
          {banner.pill}
        </span>
      )}
    </div>
  );
}

// The frame colour of the last scan: red for an unknown code, green for a
// known product and a repeat.
function FlashFrame({ flash }: Readonly<{ flash: FeedbackKind | null }>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        `
          pointer-events-none absolute inset-0 ring-10 transition-opacity
          duration-300 ring-inset
        `,
        flash === null ? 'opacity-0' : 'opacity-100',
        flash === 'unknown' ? 'ring-red-500' : 'ring-green-500',
      )}
    />
  );
}

// The bottom line of the camera view: the decoder label on the left, the
// speaker icon on the right.
function CameraFooter({
  isAudioUnlocked,
  status,
}: Readonly<{ isAudioUnlocked: boolean; status: ScannerStatus }>) {
  const label = decoderLabel(status);
  return (
    <>
      <div
        className="
          pointer-events-none absolute bottom-1.5 left-2 flex items-center gap-2
          font-mono text-[11px] text-white/80
        "
      >
        {label !== '' && (
          <span className="rounded-sm bg-black/50 px-1.5 py-0.5">{label}</span>
        )}
        {status.message !== null && status.camera === 'on' && (
          <span className="rounded-sm bg-red-700/80 px-1.5 py-0.5">
            {status.message}
          </span>
        )}
      </div>
      <div
        className="
          pointer-events-none absolute right-2 bottom-1.5 text-white/80
        "
      >
        {isAudioUnlocked ? (
          <Volume2 className="size-4" aria-label="Sound is on" />
        ) : (
          <VolumeX className="size-4" aria-label="Tap once for sound" />
        )}
      </div>
    </>
  );
}

// The camera view: the video, the frame colour of the last scan, the scan
// frame guide, the message when the camera is not on, the banner, the
// decoder label, and the speaker icon.
export function CameraView({
  attachVideo,
  banner,
  className,
  flash,
  isAudioUnlocked,
  onRetry,
  status,
}: Readonly<{
  attachVideo: (video: HTMLVideoElement | null) => void;
  banner: null | ScanBanner;
  className?: string;
  flash: FeedbackKind | null;
  isAudioUnlocked: boolean;
  onRetry: () => void;
  status: ScannerStatus;
}>) {
  return (
    <div
      className={cn('relative overflow-hidden bg-black text-white', className)}
    >
      <video
        ref={attachVideo}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 size-full object-cover"
      />
      <FlashFrame flash={flash} />
      {status.camera === 'on' && (
        <div
          aria-hidden="true"
          className="
            pointer-events-none absolute inset-x-[12%] top-1/2 h-28
            -translate-y-1/2 rounded-lg border-2 border-white/60
          "
        />
      )}
      {status.camera !== 'on' && (
        <div
          className="
            absolute inset-0 flex flex-col items-center justify-center gap-3 p-4
            text-center
          "
        >
          <CameraMessage status={status} onRetry={onRetry} />
        </div>
      )}
      {banner !== null && <Banner banner={banner} />}
      <CameraFooter isAudioUnlocked={isAudioUnlocked} status={status} />
    </div>
  );
}
