import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grievance Details",
};

// ✅ Correct type and async usage
export default async function GrievancePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">📄 Grievance ID: {id}</h1>
      <p className="text-base text-gray-600 mt-2">
        This is a placeholder for grievance <strong>{id}</strong>. Details will be rendered soon.
      </p>
    </div>
  );
}
