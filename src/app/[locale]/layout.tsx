import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "../globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  const title = isEn 
    ? "SnapNest - The Universal Video Downloader" 
    : "سناب نست - محمل الفيديوهات الشامل";
    
  const desc = isEn
    ? "SnapNest is an advanced video downloader supporting YouTube, Facebook, TikTok, Instagram, and Twitter/X. Download high quality HD/MP4 videos or convert them to MP3 audio easily."
    : "سناب نست هو أداة تحميل فيديوهات متقدمة تدعم يوتيوب، فيسبوك، تيك توك، انستغرام، وتويتر/إكس. قم بتنزيل الفيديوهات بجودة عالية HD/MP4 أو حولها إلى ملفات صوتية MP3 بكل سهولة.";

  const keywords = isEn ? [
    "SnapNest", "video downloader", "download video online", "free video downloader",
    "youtube video downloader", "download youtube video", "youtube to mp3", "yt to mp4",
    "facebook video downloader", "download facebook video", "fb video downloader",
    "instagram video downloader", "instagram reels downloader", "download from insta", "ig downloader",
    "tiktok video downloader no watermark", "download tiktok video", "tiktok downloader without watermark",
    "twitter video downloader", "download video from x", "x video downloader",
    "youtube playlist downloader", "download whole youtube playlist", "download playlist to mp3",
    "playlist to wav", "youtube to wav converter", "mp3 format downloader"
  ] : [
    "SnapNest", "سناب نست", "تحميل فيديو", "تنزيل فيديوهات", "تنزيل مقاطع", "محمل فيديوهات",
    "تنزيل يوتيوب", "تحميل من اليوتيوب", "يوتيوب mp4", "محول يوتيوب الى mp3", "تنزيل اغاني يوتيوب",
    "تحميل فيديوهات فيسبوك", "تنزيل من فيسبوك", "فيس بوك تحميل فيديو",
    "تحميل ريلز انستغرام", "تنزيل فيديو انستجرام", "حفظ مقاطع انستقرام", "تحميل فيديو من insta", "تنزيل ستوري انستا",
    "تيك توك بدون علامة مائية", "تحميل تيك توك", "تنزيل من تيكتوك", "حفظ مقاطع تيك توك",
    "تحميل فيديوهات تويتر", "تنزيل فيديو من إكس", "حفظ فيديوهات تويتر",
    "تنزيل قائمة تشغيل يوتيوب", "تحميل بلي ليست", "تنزيل بلاي ليست يوتيوب",
    "تنزيل قائمة تشغيل", "تحميل جميع فيديوهات القناة", "محول اغاني جودة عالية wav",
    "تنزيل mp3", "تنزيل wav", "تنزيل صوت عالي الدقة", "تحميل playlist", "تحميل فيديوهات دفعة واحدة"
  ];

  return {
    title: {
      default: title,
      template: isEn ? "%s | SnapNest" : "%s | سناب نست",
    },
    description: desc,
    keywords,
    authors: [{ name: isEn ? "SnapNest" : "سناب نست" }],
    creator: "SnapNest",
    metadataBase: new URL("https://nouralddin.wtf"),
    alternates: {
      languages: {
        'en': '/en',
        'ar': '/ar',
      },
    },
    openGraph: {
      title,
      description: desc,
      url: `https://nouralddin.wtf/${locale}`,
      siteName: isEn ? "SnapNest Video Downloader" : "سناب نست لتحميل الفيديوهات",
      locale: isEn ? "en_US" : "ar_AR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isEn = locale === "en";
  return (
    <html
      lang={isEn ? "en" : "ar"}
      dir={isEn ? "ltr" : "rtl"}
      className={`${cairo.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
