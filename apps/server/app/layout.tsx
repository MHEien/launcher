import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Launcher API Server",
  description: "API server for the Launcher desktop application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

