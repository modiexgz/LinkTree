const mongoose = require('mongoose');

const gateSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['none', 'password', 'age', 'newsletter'],
      default: 'none'
    },
    password: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ''
    },
    ageMinimum: {
      type: Number,
      min: 13,
      max: 99,
      default: 18
    },
    newsletterLabel: {
      type: String,
      trim: true,
      maxlength: 140,
      default: 'Join the list to unlock'
    }
  },
  { _id: false }
);

const commerceSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false
    },
    price: {
      type: Number,
      min: 0,
      default: 0
    },
    currency: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: 4,
      default: 'USD'
    },
    productLabel: {
      type: String,
      trim: true,
      maxlength: 120,
      default: 'Digital product'
    }
  },
  { _id: false }
);

const linkSchema = new mongoose.Schema(
  {
    tenantSlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200
    },
    description: {
      type: String,
      trim: true,
      maxlength: 240,
      default: ''
    },
    type: {
      type: String,
      enum: ['standard', 'animated', 'scheduled', 'gated', 'support', 'product'],
      default: 'standard',
      index: true
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 60,
      default: 'link'
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    animation: {
      type: String,
      enum: ['none', 'leap', 'pulse', 'float'],
      default: 'none'
    },
    schedule: {
      startsAt: Date,
      endsAt: Date
    },
    gate: {
      type: gateSchema,
      default: () => ({})
    },
    commerce: {
      type: commerceSchema,
      default: () => ({})
    },
    pinned: {
      type: Boolean,
      default: false
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    order: {
      type: Number,
      default: 0,
      index: true
    },
    metadata: {
      tags: {
        type: [String],
        default: []
      },
      utmSource: {
        type: String,
        trim: true,
        maxlength: 80,
        default: ''
      }
    }
  },
  { timestamps: true }
);

linkSchema.index({ tenantSlug: 1, order: 1 });
linkSchema.index({ owner: 1, active: 1 });

linkSchema.virtual('isScheduledVisible').get(function isScheduledVisible() {
  const now = new Date();
  const startsAt = this.schedule && this.schedule.startsAt;
  const endsAt = this.schedule && this.schedule.endsAt;
  return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
});

linkSchema.methods.isVisibleNow = function isVisibleNow() {
  if (!this.active) {
    return false;
  }

  if (this.type !== 'scheduled') {
    return true;
  }

  return this.isScheduledVisible;
};

module.exports = mongoose.model('Link', linkSchema);
