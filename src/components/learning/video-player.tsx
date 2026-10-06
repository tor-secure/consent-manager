"use client";

type VideoLesson = {
  provider: string;
  url: string | null;
  title: string;
  minutes: number;
};

export function VideoPlayer({ video }: { video: VideoLesson }) {
  const playable = Boolean(video.url) && video.provider !== "placeholder";
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[#0f172a] text-white" aria-label="Module video">
      <div className="flex aspect-video flex-col items-center justify-center gap-3 px-6 text-center">
        {playable && video.provider === "mp4" ? (
          <video className="h-full w-full" controls src={video.url ?? undefined}>
            <track kind="captions" />
          </video>
        ) : playable && (video.provider === "youtube" || video.provider === "vimeo" || video.provider === "embed") ? (
          <iframe className="h-full w-full" src={video.url ?? undefined} title={video.title} allow="fullscreen" />
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Video player placeholder</p>
            <h2 className="text-xl font-semibold">{video.title}</h2>
            <p>Duration: {video.minutes} minutes</p>
            <p>Status: Video coming soon</p>
            <button type="button" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900" disabled>
              Video unavailable
            </button>
          </>
        )}
      </div>
    </section>
  );
}
