const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const socialLinkSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      trim: true,
      maxlength: 40,
      default: 'globe'
    },
    label: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ''
    },
    url: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 40,
      default: 'globe'
    }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: 120,
      required: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
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
    coverUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    fileLabel: {
      type: String,
      trim: true,
      maxlength: 120,
      default: 'Instant download'
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 40,
      match: [/^[a-z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, underscores, and hyphens.'],
      index: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },
    role: {
      type: String,
      enum: ['owner', 'admin'],
      default: 'owner'
    },
    tenant: {
      slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
      },
      displayName: {
        type: String,
        trim: true,
        maxlength: 120,
        default: ''
      },
      plan: {
        type: String,
        enum: ['free', 'creator', 'pro', 'studio'],
        default: 'pro'
      }
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 280,
      default: 'Curated links, drops, and updates.'
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    locale: {
      type: String,
      enum: ['en', 'ar', 'sw', 'fr', 'am', 'ti'],
      default: 'en'
    },
    profileTheme: {
      colorMode: {
        type: String,
        enum: ['system', 'light', 'dark'],
        default: 'system'
      },
      backgroundType: {
        type: String,
        enum: ['gradient', 'solid', 'image', 'video'],
        default: 'gradient'
      },
      backgroundValue: {
        type: String,
        trim: true,
        maxlength: 800,
        default: 'radial-gradient(circle at top left, #dbeafe 0, transparent 34%), linear-gradient(135deg, #f8fafc 0%, #dbeafe 48%, #f5d0fe 100%)'
      },
      buttonStyle: {
        type: String,
        enum: ['fill', 'outline', 'hard-shadow', 'soft-shadow', 'rounded', 'square'],
        default: 'soft-shadow'
      },
      typography: {
        type: String,
        enum: ['sans', 'serif', 'mono'],
        default: 'sans'
      },
      accentColor: {
        type: String,
        trim: true,
        maxlength: 20,
        default: '#111827'
      }
    },
    socialLinks: {
      type: [socialLinkSchema],
      default: []
    },
    tipJar: {
      enabled: {
        type: Boolean,
        default: true
      },
      headline: {
        type: String,
        trim: true,
        maxlength: 120,
        default: 'Support my work'
      },
      suggestedAmounts: {
        type: [Number],
        default: [5, 10, 25]
      },
      currency: {
        type: String,
        uppercase: true,
        trim: true,
        maxlength: 4,
        default: 'USD'
      }
    },
    products: {
      type: [productSchema],
      default: []
    },
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    },
    lastLoginAt: Date
  },
  { timestamps: true }
);

userSchema.pre('validate', function setTenantDefaults(next) {
  if (!this.tenant) {
    this.tenant = {};
  }
  if (!this.tenant.slug && this.username) {
    this.tenant.slug = this.username;
  }
  if (!this.tenant.displayName && this.name) {
    this.tenant.displayName = this.name;
  }
  next();
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.passwordResetExpires = Date.now() + 1000 * 60 * 30;
  return rawToken;
};

userSchema.statics.hashResetToken = function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = mongoose.model('User', userSchema);
