// app/[id]/page.tsx
import { Metadata } from "next";

interface PageProps {
  params: {
    id: string;
  };
}

export const metadata: Metadata = {
  title: "Grievance Detail",
};

export default function Page({ params }: PageProps) {
  const { id } = params;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">📝 Grievance ID: {id}</h1>
      <p className="mt-4 text-gray-700">
        Grievance details for case <strong>{id}</strong> will appear here soon.
      </p>
    </div>
  );
}
