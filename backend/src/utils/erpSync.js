/**
 * erpSync.js — stub ERP integration module.
 *
 * Phase 1: All four functions return mock success responses.
 * When the real ERP is built, replace the internals of each function —
 * the function signatures, return shapes, and call sites in bookingController.js
 * are NOT changed. Only this file changes.
 *
 * Per ERP contract (erp-contract.md §2):
 *   - syncInventory  → POST {ERP_BASE_URL}/inventory/lock
 *   - createSalesOrder → POST {ERP_BASE_URL}/sales-orders
 *   - generateInvoice  → POST {ERP_BASE_URL}/invoices
 *   - syncCustomer     → POST {ERP_BASE_URL}/customers/sync
 *
 * Caller (bookingController.js) responsibilities:
 *   - Call AFTER the DB transaction commits (never inside it)
 *   - On all four succeeding: set Booking.erpSyncedAt + erpSalesOrderRef
 *   - On any failure: log it, leave erpSyncedAt null — booking is still valid
 */

/**
 * Lock/reserve the booked unit in ERP inventory.
 * @param {{ companyId: string, unitId: string, bookingId: string }} params
 * @returns {Promise<{ success: boolean, refId: string }>}
 */
const syncInventory = async ({ companyId, unitId, bookingId }) => {
  // Stub — replace with: await axios.post(`${ERP_BASE_URL}/inventory/lock`, { companyId, unitId, bookingId })
  console.log('[ERP STUB] syncInventory', { companyId, unitId, bookingId });
  return { success: true, refId: `STUB-INV-${bookingId.slice(0, 8).toUpperCase()}` };
};

/**
 * Create a Sales Order in ERP for this booking.
 * @param {{ companyId: string, bookingId: string, unitId: string, contactId: string, finalAmount: number, discountAmount: number, bookingAmount: number }} params
 * @returns {Promise<{ success: boolean, refId: string }>}
 */
const createSalesOrder = async ({
  companyId,
  bookingId,
  unitId,
  contactId,
  finalAmount,
  discountAmount,
  bookingAmount,
}) => {
  // Stub — replace with: await axios.post(`${ERP_BASE_URL}/sales-orders`, { ... })
  console.log('[ERP STUB] createSalesOrder', { companyId, bookingId, unitId, contactId });
  return { success: true, refId: `ERP-SO-${bookingId.slice(0, 8).toUpperCase()}` };
};

/**
 * Generate an Invoice in ERP tied to the Sales Order.
 * @param {{ companyId: string, salesOrderRef: string, amount: number }} params
 * @returns {Promise<{ success: boolean, refId: string }>}
 */
const generateInvoice = async ({ companyId, salesOrderRef, amount }) => {
  // Stub — replace with: await axios.post(`${ERP_BASE_URL}/invoices`, { companyId, salesOrderRef, amount })
  console.log('[ERP STUB] generateInvoice', { companyId, salesOrderRef, amount });
  return { success: true, refId: `ERP-INV-${salesOrderRef}` };
};

/**
 * Upsert the Contact as an ERP Customer record.
 * No ordering dependency — can run in parallel with inventory/order/invoice.
 * @param {{ companyId: string, contactId: string, fullName: string, phone: string, email: string|null, address: string|null }} params
 * @returns {Promise<{ success: boolean, refId: string }>}
 */
const syncCustomer = async ({ companyId, contactId, fullName, phone, email, address }) => {
  // Stub — replace with: await axios.post(`${ERP_BASE_URL}/customers/sync`, { ... })
  console.log('[ERP STUB] syncCustomer', { companyId, contactId, fullName });
  return { success: true, refId: `ERP-CUST-${contactId.slice(0, 8).toUpperCase()}` };
};

module.exports = { syncInventory, createSalesOrder, generateInvoice, syncCustomer };
