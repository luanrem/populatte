import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { QueryProvider } from "@/lib/query/provider";
import { Toaster } from "@/components/ui/sonner";
import { GlobalLoadingIndicator } from "@/components/error/global-loading";

const fontSans = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

const fontMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const fontSerif = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Populatte - Excel to Web Automation",
  description: "Automate form-filling from Excel data using browser extensions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${fontSans.variable} ${fontMono.variable} ${fontSerif.variable} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            forcedTheme="light"
            disableTransitionOnChange
          >
            <QueryProvider>
              <GlobalLoadingIndicator />
              <SignedIn>
                <SidebarProvider>
                  <AppSidebar />
                  {children}
                </SidebarProvider>
              </SignedIn>
              <SignedOut>
                {children}
              </SignedOut>
              <Toaster richColors />
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
