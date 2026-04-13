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
    "تحميل فيديو",
    "تنزيل يوتيوب",
    "تنزيل من فيسبوك",
    "تيك توك بدون علامة مائية",
    "تحميل ريلز انستغرام",
    "تحميل فيديوهات تويتر",
    "محول يوتيوب الى mp3",
    "SnapNest",
    "سناب نست",
  ],
  authors: [{ name: "سناب نست" }],
  creator: "SnapNest",
  metadataBase: new URL("https://example.com"),
  openGraph: {
    title: "سناب نست - الموقع الأصلي لتحميل الفيديوهات من جميع المنصات",
    description:
      "احفظ فيديوهاتك المفضلة بسرعة وأمان! دعم كامل ليوتيوب، فيسبوك، تيك توك، انستغرام وتويتر، مع خيارات التحميل بجودة HD أو MP3.",
    url: "https://example.com",
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
