import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grievance Details",
};

type PageProps = {
  params: {
    id: string;
  };
};

// ✅ Async function required for dynamic params (Server Component)
export default async function Page({ params }: PageProps) {
  const { id } = params;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">📄 Grievance ID: {id}</h1>
      <p className="text-base text-gray-600 mt-2">
        This is a placeholder for grievance <strong>{id}</strong>. Details will load dynamically in a future update.
      </p>
    </div>
  );
}
