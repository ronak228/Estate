import { useState } from 'react';
import { UserCheck } from 'lucide-react';
import Button from './Button';

/**
 * AssignDropdown — inline user picker for inquiry assignment.
 * Reusable wherever assignment appears in later modules.
 */
const AssignDropdown = ({ users = [], currentAssigneeId, onAssign, loading = false }) => {
  const [open, setOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const current = users.find((u) => u.id === currentAssigneeId);

  const handleSelect = async (userId) => {
    if (userId === currentAssigneeId) { setOpen(false); return; }
    setAssigning(true);
    try {
      await onAssign(userId);
    } finally {
      setAssigning(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative inline-block">
      <Button
        variant="outline"
        size="sm"
        icon={UserCheck}
        loading={assigning || loading}
        onClick={() => setOpen((v) => !v)}
      >
        {current ? current.fullName : 'Assign'}
      </Button>

      {open && (
        <>
          {/* Backdrop to close */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <ul className="absolute z-20 mt-1.5 right-0 bg-white border border-gray-200 rounded-lg shadow-dropdown min-w-[180px] max-h-60 overflow-y-auto">
            {users.map((user) => (
              <li key={user.id}>
                <button
                  onClick={() => handleSelect(user.id)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors duration-150 ease-snappy hover:bg-primary-50 hover:text-primary ${
                    user.id === currentAssigneeId ? 'font-semibold text-primary bg-primary-50' : 'text-gray-700'
                  }`}
                >
                  <span>{user.fullName}</span>
                  <span className="ml-1 text-xs text-gray-400">({user.role.replace('_', ' ')})</span>
                </button>
              </li>
            ))}
            {users.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">No users available</li>
            )}
          </ul>
        </>
      )}
    </div>
  );
};

export default AssignDropdown;
