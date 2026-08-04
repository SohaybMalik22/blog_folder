import type { Metadata } from "next";
import { Playfair_Display, Source_Serif_4, Inter } from "next/font/google";
import { SiteHeader } from "./components/site-header";
import { SiteFooter } from "./components/site-footer";
import { getTagIndex } from "@/lib/posts";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BLOG_BASE_URL ?? "http://localhost:3000"),
  title: {
    default: "Cricket Beat — Asian Legends League analysis",
    template: "%s | Cricket Beat",
  },
  description:
    "Match previews and analysis for the Asian Legends League, written from the fixture record.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tags = await getTagIndex();

  return (
    <html
      lang="en"
      className={`${playfair.variable} ${sourceSerif.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter tags={tags} />
      </body>
    </html>
  );
}
