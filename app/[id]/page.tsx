export default function GrievancePage({ params }: { params: { id: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">📄 Grievance ID: {params.id}</h1>
      <p className="text-base text-gray-600 mt-2">
        Details for grievance <strong>{params.id}</strong> will appear here once loaded.
      </p>
    </div>
  );
}
