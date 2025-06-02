import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import SupabaseProvider from '@/components/SupabaseProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PoliForm',
  description: 'バーチャル政党作成システム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <SupabaseProvider>
          <Header />
          <main className="p-6">{children}</main>
        </SupabaseProvider>
      </body>
    </html>
  );
}
