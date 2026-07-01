import { Loader2 } from 'lucide-react';

/**
 * LoadingState — single consistent loading indicator used while service calls are in flight.
 */
const LoadingState = ({ label = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Loader2 size={32} className="text-primary animate-spin mb-3" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
};

export default LoadingState;
