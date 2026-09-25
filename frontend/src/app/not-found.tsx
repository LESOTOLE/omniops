import { FileQuestion, Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
          <FileQuestion className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
