/**
 * Shared booking financial calculations — used by BookingDetailPage's Financial
 * Summary card and PaymentList's totals so both stay in sync and never diverge.
 *
 * The token/booking amount is captured on Booking.bookingAmount (not as a
 * BookingPayment row), so "paid" must combine it with the sum of payments.
 */
export const getBookingFinancials = (booking) => {
  const totalAmount = Number(booking?.finalAmount || 0);
  const tokenAmount = Number(booking?.bookingAmount || 0);
  const paymentsTotal = (booking?.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid = tokenAmount + paymentsTotal;
  const remainingAmount = Math.max(totalAmount - totalPaid, 0);

  return { totalAmount, tokenAmount, paymentsTotal, totalPaid, remainingAmount };
};

/**
 * Merge the token/booking amount into the payment list as a synthetic first
 * entry, so the payment history table shows the complete picture — not just
 * the BookingPayment rows recorded after booking.
 */
export const getPaymentHistory = (booking) => {
  const tokenEntry = {
    id: 'token',
    isToken: true,
    amount: booking?.bookingAmount,
    mode: null,
    paidAt: booking?.createdAt,
    referenceNumber: null,
    createdBy: booking?.bookedBy,
  };

  return [tokenEntry, ...(booking?.payments || [])].sort(
    (a, b) => new Date(a.paidAt) - new Date(b.paidAt)
  );
};
