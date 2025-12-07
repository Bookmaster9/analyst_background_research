export default function AnalystDashboard({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Analyst Dashboard - ID: {params.id}
        </h1>
        <p className="text-gray-600">
          Dashboard coming soon...
        </p>
      </div>
    </div>
  );
}
