const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const companyRoutes = require('./companyRoutes');
const projectRoutes = require('./projectRoutes');
const inquiryRoutes = require('./inquiryRoutes');
const contactRoutes = require('./contactRoutes');
const siteVisitRoutes = require('./siteVisitRoutes');
const unitRoutes = require('./unitRoutes');
const quotationRoutes = require('./quotationRoutes');
const negotiationRoutes = require('./negotiationRoutes');
const bookingRoutes = require('./bookingRoutes');

router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/projects', projectRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/contacts', contactRoutes);
router.use('/site-visits', siteVisitRoutes);
router.use('/units', unitRoutes);
router.use('/quotations', quotationRoutes);
router.use('/negotiations', negotiationRoutes);
router.use('/bookings', bookingRoutes);

module.exports = router;
