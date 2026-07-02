/**
 * StatusBadge — color-mapped pill for any stage/status/decision enum value.
 * Shared across all modules. Add new mappings here as modules are built.
 */

const STATUS_COLORS = {
  // ─── Project Status (Project & Unit Inventory) ────────────────────────────────
  UPCOMING: 'bg-gray-100 text-gray-600',
  UNDER_CONSTRUCTION: 'bg-amber-100 text-amber-700',
  READY_TO_MOVE: 'bg-emerald-100 text-emerald-700',
  // COMPLETED already mapped above (same color as site-visit COMPLETED)

  // ─── Company status
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  SUSPENDED: 'bg-red-100 text-red-700',

  // User active/inactive
  true: 'bg-emerald-100 text-emerald-700',
  false: 'bg-gray-100 text-gray-600',

  // Generic fallback
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  WARNING: 'bg-amber-100 text-amber-700',
  DANGER: 'bg-red-100 text-red-700',
  NEUTRAL: 'bg-gray-100 text-gray-600',
  INFO: 'bg-blue-100 text-blue-700',

  // Role display
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-indigo-100 text-indigo-700',
  MANAGER: 'bg-sky-100 text-sky-700',
  SALES_EXECUTIVE: 'bg-teal-100 text-teal-700',

  // ─── Inquiry Stage ──────────────────────────────────────────────────────────
  NEW: 'bg-gray-100 text-gray-600',
  CONTACTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-indigo-100 text-indigo-700',
  SITE_VISIT_SCHEDULED: 'bg-violet-100 text-violet-700',
  NEGOTIATION: 'bg-amber-100 text-amber-700',
  BOOKED: 'bg-emerald-100 text-emerald-700',
  NOT_INTERESTED: 'bg-red-100 text-red-600',

  // ─── Inquiry Source ─────────────────────────────────────────────────────────
  WALK_IN: 'bg-teal-100 text-teal-700',
  PHONE_CALL: 'bg-sky-100 text-sky-700',
  WEBSITE: 'bg-blue-100 text-blue-700',
  WHATSAPP: 'bg-green-100 text-green-700',
  REFERRAL: 'bg-purple-100 text-purple-700',
  ADVERTISEMENT: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-gray-100 text-gray-600',

  // ─── Interaction Type (Module 2) ─────────────────────────────────────────────
  CALL: 'bg-sky-100 text-sky-700',
  MEETING: 'bg-violet-100 text-violet-700',
  EMAIL: 'bg-blue-100 text-blue-700',
  NOTE: 'bg-gray-100 text-gray-600',

  // ─── Site Visit Status (Module 2) ────────────────────────────────────────────
  SCHEDULED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RESCHEDULED: 'bg-amber-100 text-amber-700',

  // ─── Unit Status (Module 2) ───────────────────────────────────────────────────
  AVAILABLE: 'bg-emerald-100 text-emerald-700',
  RESERVED: 'bg-amber-100 text-amber-700',
  SOLD: 'bg-red-100 text-red-700',

  // ─── Quotation Decision (Module 3) ────────────────────────────────────────────
  PENDING: 'bg-gray-100 text-gray-600',
  NEGOTIATING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',

  // ─── Booking Status (Module 4) ─────────────────────────────────────────────
  // CANCELLED already mapped above (same color as site-visit CANCELLED)
  CONFIRMED: 'bg-emerald-100 text-emerald-700',

  // ─── Payment Mode (Module 4) ───────────────────────────────────────────────
  CASH: 'bg-emerald-100 text-emerald-700',
  CHEQUE: 'bg-blue-100 text-blue-700',
  BANK_TRANSFER: 'bg-indigo-100 text-indigo-700',
  UPI: 'bg-violet-100 text-violet-700',
  CARD: 'bg-sky-100 text-sky-700',

  // ─── Document Type (Module 4) ─────────────────────────────────────────────
  BOOKING_FORM: 'bg-blue-100 text-blue-700',
  SIGNED_AGREEMENT: 'bg-indigo-100 text-indigo-700',
  ID_PROOF: 'bg-amber-100 text-amber-700',
  PAYMENT_PROOF: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES_EXECUTIVE: 'Sales Executive',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  true: 'Active',
  false: 'Inactive',

  // ─── Project Status labels (Project & Unit Inventory) ─────────────────────────
  UPCOMING: 'Upcoming',
  UNDER_CONSTRUCTION: 'Under Construction',
  READY_TO_MOVE: 'Ready to Move',
  // COMPLETED label is defined in the Site Visit section below (same value)

  // Inquiry Stage labels
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  SITE_VISIT_SCHEDULED: 'Site Visit',
  NEGOTIATION: 'Negotiation',
  BOOKED: 'Booked',
  NOT_INTERESTED: 'Not Interested',

  // Inquiry Source labels
  WALK_IN: 'Walk-in',
  PHONE_CALL: 'Phone Call',
  WEBSITE: 'Website',
  WHATSAPP: 'WhatsApp',
  REFERRAL: 'Referral',
  ADVERTISEMENT: 'Advertisement',
  OTHER: 'Other',

  // ─── Interaction Type labels (Module 2) ──────────────────────────────────────
  CALL: 'Call',
  MEETING: 'Meeting',
  EMAIL: 'Email',
  NOTE: 'Note',

  // ─── Site Visit Status labels (Module 2) ─────────────────────────────────────
  SCHEDULED: 'Scheduled',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  RESCHEDULED: 'Rescheduled',

  // ─── Unit Status labels (Module 2) ───────────────────────────────────────────
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  SOLD: 'Sold',

  // ─── Quotation Decision labels (Module 3) ─────────────────────────────────────
  PENDING: 'Pending',
  NEGOTIATING: 'Negotiating',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',

  // ─── Booking Status labels (Module 4) ─────────────────────────────────────
  // CANCELLED already mapped above
  CONFIRMED: 'Confirmed',

  // ─── Payment Mode labels (Module 4) ───────────────────────────────────────
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank Transfer',
  UPI: 'UPI',
  CARD: 'Card',

  // ─── Document Type labels (Module 4) ─────────────────────────────────────
  BOOKING_FORM: 'Booking Form',
  SIGNED_AGREEMENT: 'Signed Agreement',
  ID_PROOF: 'ID Proof',
  PAYMENT_PROOF: 'Payment Proof',
};

const StatusBadge = ({ value, label, size = 'sm' }) => {
  const key = String(value);
  const colorClass = STATUS_COLORS[key] || STATUS_COLORS[value] || 'bg-gray-100 text-gray-600';
  const displayLabel = label ?? STATUS_LABELS[key] ?? String(value);

  const sizeClass = size === 'xs' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${sizeClass} ${colorClass}`}>
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
