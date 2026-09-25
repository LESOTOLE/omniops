export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading...</p>
      </div>
    </div>
  );
}
