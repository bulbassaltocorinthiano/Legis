import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Legis — legislação atualizada", template: "%s · Legis" },
  description: "Legislação federal e do Maranhão atualizada a partir das fontes oficiais, com jurisprudência e biblioteca doutrinária.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

// Aplica tema e preferências de leitura antes da pintura, sem "piscar".
const prefsScript = `try{var p=JSON.parse(localStorage.getItem('legis:prefs')||'{}');var d=p.theme?p.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');if(p.size)document.documentElement.style.setProperty('--law-size',p.size+'rem');}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: prefsScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
