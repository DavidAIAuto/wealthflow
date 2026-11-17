import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider } from "@/components/layout/QuickAddTrigger";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader, MobileNav } from "@/components/layout/MobileNav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Personal finance & stock portfolio tracker",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppProvider>
            <div className="flex min-h-dvh">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <MobileHeader />
                <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-10">
                  {children}
                </main>
              </div>
            </div>
            <MobileNav />
          </AppProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
