import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArtFlowly | Create AI-Powered Stories & Videos",
  description: "Create stunning AI-powered stories and videos in minutes. Generate scripts, characters, scenes, and professional-quality animated films with AI.",
  keywords: ["ArtFlowly", "AI story", "AI video", "story generator", "AI animation", "animated films", "video generation"],
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
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {/* Ambient light effects - cinematic glow in both modes */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/20 dark:bg-purple-500/20 rounded-full blur-[128px] animate-pulse" />
              <div className="absolute top-1/3 -right-40 w-80 h-80 bg-cyan-500/15 dark:bg-cyan-500/15 rounded-full blur-[100px]" />
              <div className="absolute -bottom-40 left-1/3 w-72 h-72 bg-pink-500/12 dark:bg-pink-500/10 rounded-full blur-[100px]" />
            </div>

            {/* Main content */}
            <div className="relative z-10 flex flex-col min-h-screen">
              <Header />
              <main className="flex-1 pt-16">
                {children}
              </main>

              {/* Footer */}
              <Footer />
            </div>

            <Toaster
              position="bottom-right"
              theme="dark"
              gap={40}
              richColors={false}
              expand={true}
              toastOptions={{
                duration: 5000,
              }}
            />
            <ShadcnToaster />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
