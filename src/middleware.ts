import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip API routes, statics, Next.js internals explicitly
  if (
    pathname.includes("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".") 
  ) {
    return NextResponse.next();
  }

  const locales = ["en", "ar"];
  const hasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (hasLocale) {
    return NextResponse.next();
  }

  // Very fast language detector reading the browser locale blindly
  const acceptLanguage = request.headers.get("accept-language") || "";
  let detectedLocale = "ar"; // Target demographic default

  const langs = acceptLanguage.split(",").map(i => i.split(";")[0].trim().toLowerCase());
  if (langs.length > 0 && langs[0].startsWith("en")) {
     detectedLocale = "en";
  }

  // Rewrite / Redirect
  const newUrl = request.nextUrl.clone();
  newUrl.pathname = `/${detectedLocale}${pathname === "/" ? "" : pathname}`;
  
  return NextResponse.redirect(newUrl);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
