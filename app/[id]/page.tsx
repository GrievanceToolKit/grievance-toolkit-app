// app/[id]/page.tsx
export default function Page({ params }: { params: { id: string } }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">📝 Grievance ID: {params.id}</h1>
      <p className="mt-4 text-gray-700">
        Case <strong>{params.id}</strong> details will load here.
      </p>
    </div>
  );
}