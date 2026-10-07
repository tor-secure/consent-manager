"use client";

import { useEffect, useRef, useState } from "react";

type VideoLesson = {
  provider: string;
  url: string | null;
  title: string;
  minutes: number;
};

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function fileSrc(video: VideoLesson) {
  if (!video.url || video.provider !== "mp4") return null;
  return video.url;
}

export function VideoPlayer({ video }: { video: VideoLesson }) {
  const src = fileSrc(video);
  if (src) return <FilePlayer src={src} title={video.title} />;
  return <EmbedPlayer video={video} />;
}

function FilePlayer({ src, title }: { src: string; title: string }) {
  const frameRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function togglePlay() {
    const media = mediaRef.current;
    if (!media || failed) return;
    if (media.paused) {
      try {
        await media.play();
      } catch {
        setFailed(true);
      }
      return;
    }
    media.pause();
  }

  async function toggleFullscreen() {
    const frame = frameRef.current;
    if (!frame) return;
    if (document.fullscreenElement === frame) {
      await document.exitFullscreen();
      return;
    }
    await frame.requestFullscreen();
  }

  function seek(value: number) {
    const media = mediaRef.current;
    if (media) media.currentTime = value;
    setCurrent(value);
  }

  const length = duration || 0;

  return (
    <section
      ref={frameRef}
      className={`relative h-full w-full overflow-hidden bg-black text-white ${fullscreen ? "flex items-center justify-center" : ""}`}
      aria-label="Module video"
    >
      <video
        ref={mediaRef}
        className="h-full w-full bg-black object-contain"
        src={src}
        title={title}
        preload="metadata"
        playsInline
        onClick={togglePlay}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      />
      {failed ? (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-200">This video could not be played.</p>
      ) : null}
      {!failed && !playing ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute left-1/2 top-[42%] z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/70 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
        >
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13l11-6.5-11-6.5Z" />
          </svg>
        </button>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center gap-2 bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-3 pt-10">
        <button
          type="button"
          onClick={togglePlay}
          disabled={failed}
          aria-label={playing ? "Pause" : "Play"}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] disabled:opacity-40"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M7 5h3.5v14H7V5Zm6.5 0H17v14h-3.5V5Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          )}
        </button>
        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-white">{formatClock(current)}</span>
        <input
          type="range"
          min={0}
          max={length}
          step={0.1}
          value={Math.min(current, length)}
          aria-label="Video progress"
          aria-valuemin={0}
          aria-valuemax={Math.floor(length)}
          aria-valuenow={Math.floor(current)}
          aria-valuetext={`${formatClock(current)} of ${formatClock(length)}`}
          disabled={failed || length === 0}
          onChange={(event) => seek(Number(event.target.value))}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[#00C4A7] disabled:cursor-default"
        />
        <span className="w-12 shrink-0 text-xs tabular-nums text-white">{formatClock(length)}</span>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {fullscreen ? (
              <path d="M9 9H5V5M15 9h4V5M9 15H5v4M15 15h4v4" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
          <span className="hidden sm:inline">{fullscreen ? "Exit" : "Full screen"}</span>
        </button>
      </div>
    </section>
  );
}

function EmbedPlayer({ video }: { video: VideoLesson }) {
  const frameRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const playable = Boolean(video.url) && video.provider !== "placeholder";
  const embedded = playable && (video.provider === "youtube" || video.provider === "vimeo" || video.provider === "embed");

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    const frame = frameRef.current;
    if (!frame) return;
    if (!started) setStarted(true);
    if (document.fullscreenElement === frame) {
      await document.exitFullscreen();
      return;
    }
    await frame.requestFullscreen();
  }

  return (
    <section
      ref={frameRef}
      className={`relative h-full w-full overflow-hidden bg-black text-white ${fullscreen ? "flex items-center justify-center" : ""}`}
      aria-label="Module video"
    >
      {playable && !started ? (
        <button
          type="button"
          className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 bg-black px-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
          onClick={() => setStarted(true)}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          </span>
          <span className="text-sm font-semibold">{video.title}</span>
        </button>
      ) : embedded && started ? (
        <iframe
          className="h-full w-full bg-black"
          src={video.url ?? undefined}
          title={video.title}
          allow="autoplay; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Video player placeholder</p>
          <h2 className="text-xl font-semibold">{video.title}</h2>
          <p>Duration: {video.minutes} minutes</p>
          <p>Status: Video coming soon</p>
        </div>
      )}
      {playable ? (
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          className="absolute bottom-3 right-3 z-10 inline-flex h-9 items-center gap-2 rounded-lg bg-black/75 px-3 text-xs font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]"
        >
          {fullscreen ? "Exit full screen" : "Full screen"}
        </button>
      ) : null}
    </section>
  );
}
