import type { Metadata } from "next";
import { Noto_Sans_Georgian } from "next/font/google";
import { AppProviders } from "@/components/providers";
import "./globals.css";

const notoSansGeorgian = Noto_Sans_Georgian({
  subsets: ["georgian", "latin"],
  variable: "--font-noto",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "პერსონალი",
    template: "%s · პერსონალი",
  },
  description: "რესტორნის თანამშრომლებისა და სამუშაო გრაფიკის მართვა",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ka" className={`${notoSansGeorgian.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
