-- CreateIndex
CREATE INDEX "ActivityLog_inquiryId_idx" ON "ActivityLog"("inquiryId");

-- CreateIndex
CREATE INDEX "ActivityLog_performedById_idx" ON "ActivityLog"("performedById");

-- CreateIndex
CREATE INDEX "Booking_quotationId_idx" ON "Booking"("quotationId");

-- CreateIndex
CREATE INDEX "Booking_unitId_idx" ON "Booking"("unitId");

-- CreateIndex
CREATE INDEX "Booking_bookedById_idx" ON "Booking"("bookedById");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "BookingDocument_bookingId_idx" ON "BookingDocument"("bookingId");

-- CreateIndex
CREATE INDEX "BookingDocument_uploadedById_idx" ON "BookingDocument"("uploadedById");

-- CreateIndex
CREATE INDEX "BookingPayment_bookingId_idx" ON "BookingPayment"("bookingId");

-- CreateIndex
CREATE INDEX "BookingPayment_createdById_idx" ON "BookingPayment"("createdById");

-- CreateIndex
CREATE INDEX "Broker_companyId_idx" ON "Broker"("companyId");

-- CreateIndex
CREATE INDEX "FollowUp_inquiryId_idx" ON "FollowUp"("inquiryId");

-- CreateIndex
CREATE INDEX "FollowUp_createdById_idx" ON "FollowUp"("createdById");

-- CreateIndex
CREATE INDEX "FollowUp_scheduledAt_idx" ON "FollowUp"("scheduledAt");

-- CreateIndex
CREATE INDEX "Inquiry_companyId_idx" ON "Inquiry"("companyId");

-- CreateIndex
CREATE INDEX "Inquiry_contactId_idx" ON "Inquiry"("contactId");

-- CreateIndex
CREATE INDEX "Inquiry_projectId_idx" ON "Inquiry"("projectId");

-- CreateIndex
CREATE INDEX "Inquiry_brokerId_idx" ON "Inquiry"("brokerId");

-- CreateIndex
CREATE INDEX "Inquiry_assignedToId_idx" ON "Inquiry"("assignedToId");

-- CreateIndex
CREATE INDEX "Inquiry_createdById_idx" ON "Inquiry"("createdById");

-- CreateIndex
CREATE INDEX "Inquiry_stage_idx" ON "Inquiry"("stage");

-- CreateIndex
CREATE INDEX "Interaction_contactId_idx" ON "Interaction"("contactId");

-- CreateIndex
CREATE INDEX "Interaction_inquiryId_idx" ON "Interaction"("inquiryId");

-- CreateIndex
CREATE INDEX "Interaction_createdById_idx" ON "Interaction"("createdById");

-- CreateIndex
CREATE INDEX "Negotiation_inquiryId_idx" ON "Negotiation"("inquiryId");

-- CreateIndex
CREATE INDEX "Negotiation_quotationId_idx" ON "Negotiation"("quotationId");

-- CreateIndex
CREATE INDEX "Negotiation_createdById_idx" ON "Negotiation"("createdById");

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- CreateIndex
CREATE INDEX "Quotation_inquiryId_idx" ON "Quotation"("inquiryId");

-- CreateIndex
CREATE INDEX "Quotation_unitId_idx" ON "Quotation"("unitId");

-- CreateIndex
CREATE INDEX "Quotation_createdById_idx" ON "Quotation"("createdById");

-- CreateIndex
CREATE INDEX "Quotation_decision_idx" ON "Quotation"("decision");

-- CreateIndex
CREATE INDEX "QuotationCharge_quotationId_idx" ON "QuotationCharge"("quotationId");

-- CreateIndex
CREATE INDEX "SiteVisit_inquiryId_idx" ON "SiteVisit"("inquiryId");

-- CreateIndex
CREATE INDEX "SiteVisit_unitId_idx" ON "SiteVisit"("unitId");

-- CreateIndex
CREATE INDEX "SiteVisit_createdById_idx" ON "SiteVisit"("createdById");

-- CreateIndex
CREATE INDEX "SiteVisit_status_idx" ON "SiteVisit"("status");

-- CreateIndex
CREATE INDEX "SiteVisit_scheduledAt_idx" ON "SiteVisit"("scheduledAt");

-- CreateIndex
CREATE INDEX "Unit_status_idx" ON "Unit"("status");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
