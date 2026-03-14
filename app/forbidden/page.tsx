import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="text-6xl font-bold text-red-500">403</div>
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-gray-400">
          You need officer permissions to view this page.
        </p>
        <Link
          href="/player"
          className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
