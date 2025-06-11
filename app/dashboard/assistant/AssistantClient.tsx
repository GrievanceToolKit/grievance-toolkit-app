'use client';
import { useSearchParams } from 'next/navigation';

export default function AssistantClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';

  return (
    <div>
      Assistant is ready: {query}
    </div>
  );
}
