"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Platform = {
  id: string;
  name: string;
};

type MediaFormat = {
  formatId: string;
  ext: string;
  qualityLabel: string;
  sizeLabel: string | null;
  audioBitrate: number | null;
  isMuxed: boolean;
};

type MediaInfo = {
  title: string;
  thumbnail: string | null;
  durationSeconds: number | null;
  videoFormats: MediaFormat[];
  audioFormats: MediaFormat[];
};

type PlaylistItem = {
  id: string;
  title: string;
  durationSeconds: number | null;
  url: string;
};

type PlaylistInfo = {
  title: string;
  entries: PlaylistItem[];
};

type InfoApiResponse = {
  platform: Platform;
  type?: "video" | "playlist";
  media?: MediaInfo;
  playlist?: PlaylistInfo;
  message?: string;
};

const translations = {
  en: {
    title: "SnapNest Downloader",
    heading: "Download social videos in the quality you want.",
    subtitle: "Paste one public URL from supported platforms, choose video quality or switch to audio-only.",
    downloadsSuffix: "downloads",
    videoUrl: "Video URL",
    audioOnly: "Audio only",
    check: "Check",
    checking: "Checking...",
    selectedMedia: "Selected Media",
    noMedia: "No media loaded yet. Analyze a URL to preview and download.",
    audioOptions: "Audio quality options",
    videoOptions: "Video quality options",
    option: "option",
    optionsTitleSuffix: "s",
    noFormat: "No matching format was found for this mode. Try toggling audio-only.",
    processing: "Processing on server...",
    transferring: "Downloading...",
    downloadAudio: "Download audio",
    downloadVideo: "Download video",
    disclaimer: "Download supports public media and content you are authorized to save.",
    unknownDuration: "Unknown duration",
    fetchError: "Could not fetch media information.",
    mediaReady: "Media ready. Choose quality and download.",
    analyzeError: "Unknown error while analyzing URL.",
    downloadFailed: "Download failed.",
    browserError: "ReadableStream not supported by browser.",
    downloadComplete: "Download complete.",
    downloadError: "Unknown error while downloading.",
    playlistFound: "Playlist found",
    playlistItems: "items",
    extractItem: "Extract",
    audioFormat: "Audio Format"
  },
  ar: {
    title: "محمل سناب نست",
    heading: "حمل فيديوهات التواصل الاجتماعي بالجودة التي تريدها.",
    subtitle: "قم بلصق رابط عام من المنصات المدعومة، اختر جودة الفيديو أو قم بالتبديل إلى الصوت فقط.",
    downloadsSuffix: "عملية تحميل",
    videoUrl: "رابط الفيديو",
    audioOnly: "صوت فقط",
    check: "فحص",
    checking: "جاري الفحص...",
    selectedMedia: "التنسيق المختار",
    noMedia: "لم يتم تحميل الوسائط بعد. قم بوضع الرابط في الأعلى لفحصه وعرض خيارات التحميل.",
    audioOptions: "خيارات دقة الصوت",
    videoOptions: "خيارات دقة الفيديو",
    option: "خيار",
    optionsTitleSuffix: "",
    noFormat: "لا يوجد تنسيق مطابق. جرب التبديل بوضع الصوت فقط.",
    processing: "جاري المعالجة...",
    transferring: "جاري التحميل...",
    downloadAudio: "تحميل الصوت",
    downloadVideo: "تحميل الفيديو",
    disclaimer: "التحميل يدعم الوسائط العامة والمحتوى الذي يُسمح لك بحفظه فقط.",
    unknownDuration: "مدة غير معروفة",
    fetchError: "تعذر جلب معلومات الوسائط.",
    mediaReady: "الوسائط جاهزة. اختر الجودة ثم قم بالتحميل.",
    analyzeError: "خطأ غير معروف أثناء فحص الرابط.",
    downloadFailed: "فشل التحميل.",
    browserError: "متصفحك لا يدعم التحميل المباشر.",
    downloadComplete: "اكتمل التحميل.",
    downloadError: "خطأ غير معروف أثناء التحميل.",
    playlistFound: "تم اكتشاف قائمة تشغيل",
    playlistItems: "مقطع",
    extractItem: "استخراج",
    audioFormat: "صيغة الصوت"
  }
};

const platformLabels = [
  "YouTube",
  "Facebook",
  "TikTok",
  "Instagram",
  "Twitter / X",
];

function formatDuration(seconds: number | null, t: typeof translations["ar"]): string {
  if (!seconds || Number.isNaN(seconds)) {
    return t.unknownDuration;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      if (i === maxRetries) {
        return response;
      }
    } catch (error) {
      if (i === maxRetries) {
        throw error;
      }
    }
    // Exponential backoff or flat wait before retrying explicitly
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error("Maximum retries exceeded");
}

export default function Home() {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const t = translations[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const [url, setUrl] = useState("");
  const [mp3Only, setMp3Only] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [downloadPhase, setDownloadPhase] = useState<
    "idle" | "processing" | "transferring"
  >("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string>("");
  const [audioFormat, setAudioFormat] = useState<"mp3" | "wav">("mp3");
  const [totalDownloads, setTotalDownloads] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.downloads === "number") {
          setTotalDownloads(data.downloads);
        }
      })
      .catch(() => { });
  }, []);

  const activeFormats = useMemo(() => {
    if (!media) {
      return [];
    }

    return mp3Only ? media.audioFormats : media.videoFormats;
  }, [media, mp3Only]);

  const selectedFormat = useMemo(
    () => activeFormats.find((f) => f.formatId === selectedFormatId) ?? null,
    [activeFormats, selectedFormatId],
  );

  const hasUrl = url.trim().length > 0;
  const canDownload =
    Boolean(media) &&
    downloadPhase === "idle" &&
    (mp3Only || selectedFormatId.length > 0 || activeFormats.length === 0);

  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasUrl || loadingInfo) {
      return;
    }

    setLoadingInfo(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithRetry("/api/media/info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
        }),
      });

      const payload = (await response.json()) as InfoApiResponse;

      if (!response.ok) {
        throw new Error(payload.message || t.analyzeError);
      }

      setPlatform(payload.platform);
      
      if (payload.type === "playlist" && payload.playlist) {
        setPlaylist(payload.playlist);
        setMedia(null);
        setSuccess(t.playlistFound);
      } else if (payload.media) {
        setMedia(payload.media);
        setPlaylist(null);
        setSuccess(t.mediaReady);
        const preferredFormat = mp3Only
          ? payload.media.audioFormats[0]?.formatId
          : payload.media.videoFormats[0]?.formatId;
        setSelectedFormatId(preferredFormat ?? "");
      } else {
        throw new Error(payload.message || t.fetchError);
      }
    } catch (requestError) {
      setPlatform(null);
      setMedia(null);
      setPlaylist(null);
      setSelectedFormatId("");
      setError(
        requestError instanceof Error
          ? requestError.message
          : t.analyzeError,
      );
    } finally {
      setLoadingInfo(false);
    }
  }

  async function handleExtractPlaylistItem(itemUrl: string) {
    setUrl(itemUrl);
    setPlaylist(null);
    setMedia(null);
    setLoadingInfo(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithRetry("/api/media/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: itemUrl }),
      });

      const payload = (await response.json()) as InfoApiResponse;

      if (!response.ok) {
        throw new Error(payload.message || t.analyzeError);
      }

      setPlatform(payload.platform);
      if (payload.media) {
        setMedia(payload.media);
        setSuccess(t.mediaReady);
        const preferredFormat = mp3Only
          ? payload.media.audioFormats[0]?.formatId
          : payload.media.videoFormats[0]?.formatId;
        setSelectedFormatId(preferredFormat ?? "");
      } else {
        throw new Error(payload.message || t.fetchError);
      }
    } catch (err) {
      setPlatform(null);
      setMedia(null);
      setSelectedFormatId("");
      setError(err instanceof Error ? err.message : t.analyzeError);
    } finally {
      setLoadingInfo(false);
    }
  }

  async function handleDownload() {
    if (!canDownload) {
      return;
    }

    setDownloadPhase("processing");
    setDownloadProgress(0);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithRetry("/api/media/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formatId: selectedFormatId || undefined,
          audioOnly: mp3Only,
          isMuxed: selectedFormat?.isMuxed ?? false,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message || t.downloadFailed);
      }

      setDownloadPhase("transferring");

      const contentLength = response.headers.get("Content-Length");
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

      const reader = response.body?.getReader();
      if (!reader) throw new Error(t.browserError);

      let receivedBytes = 0;
      const chunks: BlobPart[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          if (totalBytes > 0) {
            setDownloadProgress(Math.round((receivedBytes / totalBytes) * 100));
          }
        }
      }

      const blob = new Blob(chunks, {
        type:
          response.headers.get("Content-Type") || "application/octet-stream",
      });

      const contentDisposition = response.headers.get("Content-Disposition");
      const encodedName = contentDisposition?.match(
        /filename\*=UTF-8''([^;]+)/i,
      )?.[1];
      const fileName = encodedName
        ? decodeURIComponent(encodedName)
        : mp3Only
          ? "audio.mp3"
          : "video.mp4";

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      setSuccess(t.downloadComplete);
      setTotalDownloads((prev) => (prev !== null ? prev + 1 : null));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t.downloadError,
      );
    } finally {
      setDownloadPhase("idle");
      setDownloadProgress(0);
    }
  }

  return (
    <div className="relative isolate flex flex-1 justify-center px-4 py-8 sm:px-8 sm:py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-28 top-10 h-72 w-72 rounded-full bg-[#f3bb88]/45 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#7ac8bc]/45 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-52 w-52 rounded-full bg-[#89a9f4]/30 blur-3xl" />
      </div>

      <main className="w-full max-w-5xl rounded-3xl border border-border/90 bg-card/95 p-5 shadow-[0_24px_90px_rgba(55,31,10,0.16)] backdrop-blur-sm sm:p-8">
        <div className="flex w-full items-center justify-end mb-4">
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-slate-50"
          >
            {lang === "ar" ? "🇺🇸 English" : "🇸🇦 العربية"}
          </button>
        </div>

        <section className="mb-7">
          <p className="mb-2 inline-flex rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {t.title}
          </p>
          <h1 className="text-3xl leading-tight text-foreground sm:text-5xl">
            {t.heading}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/75 sm:text-base">
            {t.subtitle}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {platformLabels.map((item) => (
              <span
                key={item}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground/80"
              >
                {item}
              </span>
            ))}
            {totalDownloads !== null && (
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-3.5 w-3.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v7.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 11.586V4a1 1 0 011-1zM5 15a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {totalDownloads.toLocaleString()} {t.downloadsSuffix}
              </span>
            )}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            onSubmit={handleAnalyze}
            className="rounded-2xl border border-border bg-background/80 p-4 sm:p-5"
          >
            <label
              htmlFor="video-url"
              className="mb-2 block text-sm font-semibold text-foreground"
            >
              {t.videoUrl}
            </label>
            <input
              id="video-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`w-full rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none ring-accent/35 transition focus:ring ${lang === "ar" ? "text-left" : "text-left"}`}
              dir="ltr"
              required
            />

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={mp3Only}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setMp3Only(checked);
                    const defaultFormat = checked
                      ? media?.audioFormats[0]?.formatId
                      : media?.videoFormats[0]?.formatId;
                    setSelectedFormatId(defaultFormat ?? "");
                  }}
                  className="size-4"
                />
                {t.audioOnly}
              </label>
            </div>

            <button
              type="submit"
              disabled={loadingInfo}
              className="mt-5 inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingInfo ? t.checking : t.check}
            </button>
          </form>

          <div className="rounded-2xl border border-border bg-background/80 p-4 sm:p-5">
            <h2 className="text-xl text-foreground">{t.selectedMedia}</h2>

            {!media && (
              <p className="mt-3 text-sm text-foreground/70">
                {t.noMedia}
              </p>
            )}

            {media && (
              <div className="mt-4 space-y-3">
                {media.thumbnail && (
                  <div className="relative aspect-video overflow-hidden rounded-xl border border-border">
                    <Image
                      src={media.thumbnail}
                      alt={media.title}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className="object-cover"
                    />
                  </div>
                )}
                <h3 className="line-clamp-2 text-lg text-foreground">
                  {media.title}
                </h3>
                <div className="flex flex-wrap gap-2 text-xs text-foreground/80">
                  {platform && (
                    <span className="rounded-full border border-border bg-white px-2 py-1">
                      {platform.name}
                    </span>
                  )}
                  <span className="rounded-full border border-border bg-white px-2 py-1">
                    {formatDuration(media.durationSeconds, t)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {playlist && (
          <section className="mt-5 rounded-2xl border border-border bg-background/80 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xl text-foreground">
                {playlist.title || t.playlistFound}
              </h2>
              <span className="text-xs font-medium text-foreground/70">
                {playlist.entries.length} {t.playlistItems}
              </span>
            </div>
            
            <div className="mt-4 max-h-[500px] overflow-y-auto space-y-2">
              {playlist.entries.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-white p-3">
                  <div className="flex-1 overflow-hidden pr-2">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                    {item.durationSeconds && (
                       <p className="mt-1 text-xs text-foreground/60" dir="ltr">{formatDuration(item.durationSeconds, t)}</p>
                    )}
                  </div>
                  <button 
                     onClick={() => handleExtractPlaylistItem(item.url)}
                     className="whitespace-nowrap ml-3 md:ml-4 rounded-lg bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent hover:text-white"
                  >
                    {t.extractItem}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {media && (
          <section className="mt-5 rounded-2xl border border-border bg-background/80 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xl text-foreground">
                {mp3Only ? t.audioOptions : t.videoOptions}
              </h2>
              <span className="text-xs font-medium text-foreground/70">
                {activeFormats.length} {t.option}{activeFormats.length === 1 ? "" : (lang === "en" ? t.optionsTitleSuffix : "")}
              </span>
            </div>

            {activeFormats.length === 0 && (
              <p className="text-sm text-foreground/70">
                {t.noFormat}
              </p>
            )}

            {activeFormats.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {activeFormats.map((format) => {
                  const isSelected = selectedFormatId === format.formatId;

                  return (
                    <button
                      key={format.formatId}
                      type="button"
                      onClick={() => setSelectedFormatId(format.formatId)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${isSelected
                          ? "border-accent bg-accent/10"
                          : "border-border bg-white hover:border-accent/45"
                        }`}
                      dir="ltr"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {format.qualityLabel}
                      </p>
                      <p className="mt-1 text-xs text-foreground/75">
                        {format.ext.toUpperCase()}
                        {format.sizeLabel ? ` - ${format.sizeLabel}` : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row flex-wrap items-center gap-3">
              {mp3Only && (
                 <div className="flex items-center gap-2 rounded-xl bg-white px-4 border border-border h-12 w-full sm:w-auto">
                   <span className="text-sm text-foreground/70">{t.audioFormat}:</span>
                   <select 
                     value={audioFormat} 
                     onChange={(e) => setAudioFormat(e.target.value as "mp3" | "wav")}
                     className="text-sm font-semibold bg-transparent outline-none cursor-pointer flex-1"
                   >
                     <option value="mp3">MP3</option>
                     <option value="wav">WAV</option>
                   </select>
                 </div>
              )}
              <button
                type="button"
                onClick={handleDownload}
                disabled={!canDownload}
                className={`inline-flex h-12 min-w-[200px] items-center justify-center rounded-xl bg-accent-2 px-5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${lang === "en" ? "" : "text-left"}`}
                style={{ direction: "ltr" }}
              >
                <div className="flex w-full items-center justify-center gap-1.5" dir={lang === "ar" ? "rtl" : "ltr"}>
                  {downloadPhase === "processing"
                    ? t.processing
                    : downloadPhase === "transferring"
                      ? `${t.transferring} %${downloadProgress}`
                      : mp3Only
                        ? t.downloadAudio
                        : t.downloadVideo}
                </div>
              </button>
              <p className="text-xs text-foreground/65">
                {t.disclaimer}
              </p>
            </div>
          </section>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </p>
        )}
      </main>
    </div>
  );
}
