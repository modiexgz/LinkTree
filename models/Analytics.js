const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    tenantSlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    profileUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    link: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Link',
      index: true,
      default: null
    },
    eventType: {
      type: String,
      enum: ['profile_view', 'link_click', 'gate_unlock', 'tip_started', 'checkout_started', 'checkout_completed'],
      required: true,
      index: true
    },
    visitorId: {
      type: String,
      trim: true,
      index: true
    },
    sessionId: {
      type: String,
      trim: true,
      index: true
    },
    ipHash: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 600,
      default: ''
    },
    referrer: {
      type: String,
      trim: true,
      maxlength: 800,
      default: 'Direct'
    },
    country: {
      type: String,
      trim: true,
      maxlength: 80,
      default: 'Unknown'
    },
    city: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ''
    },
    metadata: {
      amount: Number,
      currency: String,
      gateType: String,
      productTitle: String
    }
  },
  { timestamps: true }
);

analyticsSchema.index({ tenantSlug: 1, eventType: 1, createdAt: -1 });
analyticsSchema.index({ tenantSlug: 1, visitorId: 1, eventType: 1 });
analyticsSchema.index({ tenantSlug: 1, link: 1, eventType: 1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
