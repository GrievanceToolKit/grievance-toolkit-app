'use client';
import { useRouter } from 'next/navigation';

export default function DashboardNavigation() {
  const router = useRouter();

  const goTo = (path: string) => {
    router.push(path);
  };

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <button
        onClick={() => goTo('/')}
        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
      >
        Dashboard
      </button>
      <button
        onClick={() => goTo('/reportes')}
        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
      >
        Reports
      </button>
      <button
        onClick={() => goTo('/usuarios')}
        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
      >
        Users
      </button>
      <button
        onClick={() => goTo('/configuracion')}
        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
      >
        Configuration
      </button>
    </div>
  );
}
