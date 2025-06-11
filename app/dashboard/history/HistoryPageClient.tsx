'use client';
import dynamic from 'next/dynamic';
const HistoryViewer = dynamic(() => import('./HistoryViewer'), { ssr: false });

export default function HistoryPageClient() {
  return <HistoryViewer />;
}
