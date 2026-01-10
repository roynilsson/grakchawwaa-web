import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Grakchawwaa - Guild Management",
  description: "SWGOH guild management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
