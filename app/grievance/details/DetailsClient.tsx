'use client';
import { useSearchParams } from 'next/navigation';

export default function DetailsClient() {
  const searchParams = useSearchParams();
  const grievanceId = searchParams.get('id');

  return (
    <div>
      <h1>Grievance ID: {grievanceId}</h1>
    </div>
  );
}
