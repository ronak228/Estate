/**
 * StatCard — icon + label + value tile used across all dashboard scopes
 * (Platform / Company / Personal). Extracted from DashboardPage so it's
 * reusable and stays visually identical to Card everywhere else.
 */
const COLOR_MAP = {
  primary: 'bg-primary-50 text-primary',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
};

const StatCard = ({ icon: Icon, label, value, sub, color = 'primary' }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${COLOR_MAP[color] || COLOR_MAP.primary}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-semibold text-gray-900 mt-1 tracking-tight truncate">
          {value ?? <span className="text-gray-300">—</span>}
        </p>
        {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
};

export default StatCard;
