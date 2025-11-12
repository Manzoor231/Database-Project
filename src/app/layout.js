import "./globals.css";

export const metadata = {
  title: "Fazli Advertisement",
  description: "Manage money in/out and printing transactions easily",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="antialiased bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
