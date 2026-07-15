import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

const ForbiddenPage = () => {
  return (
    <div className="min-h-screen bg-app flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <ShieldX size={28} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">403 — Forbidden</h1>
        <p className="text-sm text-gray-500 mb-6">
          You don't have permission to access this page.
        </p>
        <Link
          to="/dashboard"
          className="text-sm text-primary font-medium hover:text-primary-600 hover:underline transition-colors duration-150 ease-snappy"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default ForbiddenPage;
