import '../styles/globals.css';
import type { ReactNode } from 'react';
import AuthProvider from '../context/AuthContext';
import { MessagesProvider } from '../context/MessagesContext';
import Navbar from '../components/Navbar';
import ChatWidget from '../components/ChatWidget';

export const metadata = {
  title: 'Tech Blog',
  description: 'Instagram-style blog application',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-800 min-h-screen">
        <AuthProvider>
          <MessagesProvider>
            <Navbar />
            <main className="container mx-auto p-4">{children}</main>
            <ChatWidget />
          </MessagesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
