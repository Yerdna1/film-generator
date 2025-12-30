import type { Metadata } from "next";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { Header } from "@/components/shared/Header";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Film Generator | AI-Powered Film Creation Studio",
  description: "Create stunning short films with AI. Generate prompts, characters, scenes, and videos with professional quality.",
  keywords: ["AI film", "video generation", "short films", "AI animation", "film generator"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>
          <NextIntlClientProvider messages={messages}>
          {/* Ambient light effects - cinematic glow in both modes */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/20 dark:bg-purple-500/20 rounded-full blur-[128px] animate-pulse" />
            <div className="absolute top-1/3 -right-40 w-80 h-80 bg-cyan-500/15 dark:bg-cyan-500/15 rounded-full blur-[100px]" />
            <div className="absolute -bottom-40 left-1/3 w-72 h-72 bg-pink-500/12 dark:bg-pink-500/10 rounded-full blur-[100px]" />
          </div>

          {/* Main content */}
          <div className="relative z-10 flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-black/5 dark:border-white/5 py-6 mt-auto">
              <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">F</span>
                    </div>
                    <span>Film Generator</span>
                  </div>
                  <p className="text-center">
                    Powered by AI • Built for creators
                  </p>
                  <div className="flex items-center gap-4">
                    <Link href="/help" className="hover:text-foreground transition-colors">Help</Link>
                    <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                    <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                  </div>
                </div>
              </div>
            </footer>
          </div>

          <Toaster
            position="bottom-right"
            theme="system"
            toastOptions={{
              classNames: {
                toast: 'glass-strong',
              },
            }}
          />
          </NextIntlClientProvider>
        </Providers>
      </body>
    </html>
  );
}
