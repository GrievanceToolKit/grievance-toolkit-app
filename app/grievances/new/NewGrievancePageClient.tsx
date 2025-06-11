'use client';
import dynamic from 'next/dynamic';
const GrievanceClient = dynamic(() => import('./GrievanceClient'), { ssr: false });

export default function NewGrievancePageClient() {
  return <GrievanceClient />;
}
