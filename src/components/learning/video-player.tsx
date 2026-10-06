"use client";

type VideoLesson = {
  provider: string;
  url: string | null;
  title: string;
  minutes: number;
};

export function VideoPlayer({ video }: { video: VideoLesson }) {
  const playable = Boolean(video.url) && video.provider !== "placeholder";
  const embedded = playable && (video.provider === "youtube" || video.provider === "vimeo" || video.provider === "embed");
  return (
    <section className="overflow-hidden rounded-xl border border-[#d5e3e0] bg-[#0f172a] text-white" aria-label="Module video">
      {playable && video.provider === "mp4" ? (
        <video className="aspect-video w-full bg-black" controls src={video.url ?? undefined}>
          <track kind="captions" />
        </video>
      ) : embedded ? (
        <div className="relative">
          <iframe
            className="block aspect-video w-full bg-black"
            src={video.url ?? undefined}
            title={video.title}
            allow="autoplay; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
          {video.url?.includes("drive.google.com") ? (
            <div aria-hidden="true" className="absolute right-0 top-0 h-12 w-12 rounded-bl-lg bg-black" onContextMenu={(event) => event.preventDefault()} />
          ) : null}
        </div>
      ) : (
        <div className="flex aspect-video flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Video player placeholder</p>
          <h2 className="text-xl font-semibold">{video.title}</h2>
          <p>Duration: {video.minutes} minutes</p>
          <p>Status: Video coming soon</p>
        </div>
      )}
    </section>
  );
}
