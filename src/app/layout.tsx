import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
});

export const metadata: Metadata = {
  title: {
    default: "سناب نست - محمل الفيديوهات الشامل",
    template: "%s | سناب نست",
  },
  description:
    "سناب نست هو أداة تحميل فيديوهات متقدمة تدعم يوتيوب، فيسبوك، تيك توك، انستغرام، وتويتر/إكس. قم بتنزيل الفيديوهات بجودة عالية HD/MP4 أو حولها إلى ملفات صوتية MP3 بكل سهولة.",
  keywords: [
    // Brand
    "SnapNest",
    "سناب نست",
    
    // Generic Downloaders
    "تحميل فيديو",
    "تنزيل فيديوهات",
    "تنزيل مقاطع",
    "محمل فيديوهات",
    "video downloader",
    "download video online",
    "free video downloader",
    
    // YouTube
    "تنزيل يوتيوب",
    "تحميل من اليوتيوب",
    "يوتيوب mp4",
    "محول يوتيوب الى mp3",
    "تنزيل اغاني يوتيوب",
    "youtube video downloader",
    "download youtube video",
    "youtube to mp3",
    "yt to mp4",
    
    // Facebook
    "تحميل فيديوهات فيسبوك",
    "تنزيل من فيسبوك",
    "فيس بوك تحميل فيديو",
    "facebook video downloader",
    "download facebook video",
    "fb video downloader",
    
    // Instagram
    "تحميل ريلز انستغرام",
    "تنزيل فيديو انستجرام",
    "حفظ مقاطع انستقرام",
    "تحميل فيديو من insta",
    "تنزيل ستوري انستا",
    "instagram video downloader",
    "instagram reels downloader",
    "download from insta",
    "ig downloader",
    
    // TikTok
    "تيك توك بدون علامة مائية",
    "تحميل تيك توك",
    "تنزيل من تيكتوك",
    "حفظ مقاطع تيك توك",
    "tiktok video downloader no watermark",
    "download tiktok video",
    "tiktok downloader without watermark",
    
    // Twitter / X
    "تحميل فيديوهات تويتر",
    "تنزيل فيديو من إكس",
    "حفظ فيديوهات تويتر",
    "twitter video downloader",
    "download video from x",
    "x video downloader",
    
    // Playlists & Formats (Audio)
    "تنزيل قائمة تشغيل يوتيوب",
    "تحميل بلي ليست",
    "تنزيل بلاي ليست يوتيوب",
    "youtube playlist downloader",
    "download whole youtube playlist",
    "download playlist to mp3",
    "playlist to wav",
    "تنزيل قائمة تشغيل",
    "تحميل جميع فيديوهات القناة",
    "محول اغاني جودة عالية wav",
    "تنزيل mp3",
    "تنزيل wav",
    "youtube to wav converter",
    "mp3 format downloader",
    "تنزيل صوت عالي الدقة",
    "تحميل playlist",
    "تحميل فيديوهات دفعة واحدة",
  ],
  authors: [{ name: "سناب نست" }],
  creator: "SnapNest",
  metadataBase: new URL("https://nouralddin.wtf"),
  openGraph: {
    title: "سناب نست - الموقع الأصلي لتحميل الفيديوهات من جميع المنصات",
    description:
      "احفظ فيديوهاتك المفضلة بسرعة وأمان! دعم كامل ليوتيوب، فيسبوك، تيك توك، انستغرام وتويتر، مع خيارات التحميل بجودة HD أو MP3.",
    url: "https://nouralddin.wtf",
    siteName: "سناب نست لتحميل الفيديوهات",
    locale: "ar_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "سناب نست - تحميل سريع وآمن للفيديوهات عبر جميع المنصات",
    description:
      "تطبيق ويب حديث وسريع لتحميل أروع الفيديوهات والملفات الصوتية بجودة ممتازة من مواقع التواصل الاجتماعي المفضلة لديك.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.className} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
