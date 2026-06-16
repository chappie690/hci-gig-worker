import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SkillPilot AI",
  description: "AI trainer operating system for courses, learners, marketing, sessions, and payments."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(localStorage.getItem('skillpilot-theme')==='dark'){document.documentElement.classList.add('skillpilot-dark')}}catch(e){}"
          }}
        />
        {children}
      </body>
    </html>
  );
}
