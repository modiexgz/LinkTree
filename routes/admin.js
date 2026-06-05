const path = require('path');
const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const Link = require('../models/Link');
const Analytics = require('../models/Analytics');

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'public', 'uploads'),
  filename(req, file, cb) {
    const safeName = file.originalname.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    cb(null, allowed.includes(file.mimetype));
  }
});

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

async function requireAuth(req, res, next) {
  try {
    if (!req.session.user) {
      setFlash(req, 'error', 'Please log in to continue.');
      return res.redirect('/auth/login');
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      req.session.destroy(() => {});
      return res.redirect('/auth/login');
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

function asArray(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function parseDate(value) {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function safeUrl(value, fallback = 'https://example.com') {
  const raw = String(value || '').trim();
  if (!raw) {
    return fallback;
  }
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }
  return `https://${raw}`;
}

function parseSocialLinks(body) {
  const platforms = asArray(body.socialPlatform);
  const labels = asArray(body.socialLabel);
  const urls = asArray(body.socialUrl);
  const icons = asArray(body.socialIcon);

  return platforms
    .map((platform, index) => ({
      platform: String(platform || '').trim(),
      label: String(labels[index] || platform || '').trim(),
      url: String(urls[index] || '').trim(),
      icon: String(icons[index] || platform || 'globe').trim()
    }))
    .filter((social) => social.url);
}

function parseProducts(body, existingProducts) {
  const titles = asArray(body.productTitle);
  const descriptions = asArray(body.productDescription);
  const prices = asArray(body.productPrice);
  const currencies = asArray(body.productCurrency);

  const products = titles
    .map((title, index) => ({
      title: String(title || '').trim(),
      description: String(descriptions[index] || '').trim(),
      price: Number(prices[index] || 0),
      currency: String(currencies[index] || 'USD').trim().toUpperCase(),
      fileLabel: 'Instant digital delivery',
      active: true
    }))
    .filter((product) => product.title);

  return products.length ? products : existingProducts;
}

async function getAnalytics(tenantSlug) {
  const [profileViews, linkClicks, uniqueVisitors, topLinks, referrers, countries, eventsByDay] = await Promise.all([
    Analytics.countDocuments({ tenantSlug, eventType: 'profile_view' }),
    Analytics.countDocuments({ tenantSlug, eventType: 'link_click' }),
    Analytics.distinct('visitorId', { tenantSlug, eventType: 'profile_view' }),
    Analytics.aggregate([
      { $match: { tenantSlug, eventType: 'link_click', link: { $ne: null } } },
      { $group: { _id: '$link', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: 'links',
          localField: '_id',
          foreignField: '_id',
          as: 'link'
        }
      },
      { $unwind: '$link' },
      { $project: { title: '$link.title', icon: '$link.icon', clicks: 1 } }
    ]),
    Analytics.aggregate([
      { $match: { tenantSlug, eventType: { $in: ['profile_view', 'link_click'] } } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),
    Analytics.aggregate([
      { $match: { tenantSlug, eventType: 'profile_view' } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),
    Analytics.aggregate([
      { $match: { tenantSlug, createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 13) } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.day': 1 } }
    ])
  ]);

  const seriesMap = new Map();
  eventsByDay.forEach((entry) => {
    const day = entry._id.day;
    const current = seriesMap.get(day) || { day, views: 0, clicks: 0 };
    if (entry._id.type === 'profile_view') {
      current.views += entry.count;
    }
    if (entry._id.type === 'link_click') {
      current.clicks += entry.count;
    }
    seriesMap.set(day, current);
  });

  return {
    profileViews,
    linkClicks,
    uniqueVisitors: uniqueVisitors.length,
    ctr: profileViews ? Math.round((linkClicks / profileViews) * 1000) / 10 : 0,
    topLinks,
    referrers,
    countries,
    series: Array.from(seriesMap.values())
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const links = await Link.find({ owner: req.user._id }).sort({ pinned: -1, order: 1, createdAt: -1 });
    const analytics = await getAnalytics(req.user.tenant.slug);
    res.render('dashboard', {
      title: 'Dashboard',
      user: req.user,
      links,
      analytics
    });
  } catch (error) {
    next(error);
  }
});

router.post('/profile', requireAuth, upload.single('backgroundFile'), async (req, res, next) => {
  try {
    const profileTheme = {
      colorMode: req.body.colorMode || 'system',
      backgroundType: req.body.backgroundType || 'gradient',
      backgroundValue: String(req.body.backgroundValue || req.user.profileTheme.backgroundValue).trim(),
      buttonStyle: req.body.buttonStyle || 'soft-shadow',
      typography: req.body.typography || 'sans',
      accentColor: String(req.body.accentColor || '#111827').trim()
    };

    if (req.file) {
      profileTheme.backgroundType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
      profileTheme.backgroundValue = `/uploads/${req.file.filename}`;
    }

    req.user.name = String(req.body.name || req.user.name).trim();
    req.user.bio = String(req.body.bio || '').trim();
    req.user.avatarUrl = String(req.body.avatarUrl || '').trim();
    req.user.locale = req.body.locale || req.user.locale;
    req.user.tenant.displayName = String(req.body.displayName || req.user.name).trim();
    req.user.profileTheme = profileTheme;
    req.user.socialLinks = parseSocialLinks(req.body);
    req.user.tipJar = {
      enabled: req.body.tipJarEnabled === 'on',
      headline: String(req.body.tipJarHeadline || 'Support my work').trim(),
      suggestedAmounts: String(req.body.tipJarAmounts || '5,10,25')
        .split(',')
        .map((amount) => Number(amount.trim()))
        .filter((amount) => amount > 0),
      currency: String(req.body.tipJarCurrency || 'USD').trim().toUpperCase()
    };
    req.user.products = parseProducts(req.body, req.user.products);
    await req.user.save();

    req.session.user.name = req.user.name;
    req.session.locale = req.user.locale;
    setFlash(req, 'success', 'Profile design updated.');
    res.redirect('/admin#design');
  } catch (error) {
    next(error);
  }
});

router.post('/links', requireAuth, async (req, res, next) => {
  try {
    await Link.create({
      owner: req.user._id,
      tenantSlug: req.user.tenant.slug,
      title: String(req.body.title || 'Untitled link').trim(),
      url: safeUrl(req.body.url),
      description: String(req.body.description || '').trim(),
      type: req.body.type || 'standard',
      icon: String(req.body.icon || 'link').trim(),
      thumbnailUrl: String(req.body.thumbnailUrl || '').trim(),
      animation: req.body.animation || 'none',
      schedule: {
        startsAt: parseDate(req.body.startsAt),
        endsAt: parseDate(req.body.endsAt)
      },
      gate: {
        type: req.body.gateType || 'none',
        password: String(req.body.gatePassword || '').trim(),
        ageMinimum: Number(req.body.ageMinimum || 18),
        newsletterLabel: String(req.body.newsletterLabel || 'Join the list to unlock').trim()
      },
      commerce: {
        enabled: req.body.type === 'product',
        price: Number(req.body.price || 0),
        currency: String(req.body.currency || 'USD').trim().toUpperCase(),
        productLabel: String(req.body.productLabel || 'Digital product').trim()
      },
      pinned: req.body.pinned === 'on',
      active: req.body.active !== 'off',
      order: Number(req.body.order || 0)
    });
    setFlash(req, 'success', 'Link created.');
    res.redirect('/admin#links');
  } catch (error) {
    next(error);
  }
});

router.post('/links/:id', requireAuth, async (req, res, next) => {
  try {
    const update = {
      title: String(req.body.title || 'Untitled link').trim(),
      url: safeUrl(req.body.url),
      description: String(req.body.description || '').trim(),
      type: req.body.type || 'standard',
      icon: String(req.body.icon || 'link').trim(),
      thumbnailUrl: String(req.body.thumbnailUrl || '').trim(),
      animation: req.body.animation || 'none',
      schedule: {
        startsAt: parseDate(req.body.startsAt),
        endsAt: parseDate(req.body.endsAt)
      },
      gate: {
        type: req.body.gateType || 'none',
        password: String(req.body.gatePassword || '').trim(),
        ageMinimum: Number(req.body.ageMinimum || 18),
        newsletterLabel: String(req.body.newsletterLabel || 'Join the list to unlock').trim()
      },
      commerce: {
        enabled: req.body.type === 'product',
        price: Number(req.body.price || 0),
        currency: String(req.body.currency || 'USD').trim().toUpperCase(),
        productLabel: String(req.body.productLabel || 'Digital product').trim()
      },
      pinned: req.body.pinned === 'on',
      active: req.body.active === 'on',
      order: Number(req.body.order || 0)
    };

    await Link.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, update, {
      runValidators: true
    });
    setFlash(req, 'success', 'Link updated.');
    res.redirect('/admin#links');
  } catch (error) {
    next(error);
  }
});

router.post('/links/:id/delete', requireAuth, async (req, res, next) => {
  try {
    await Link.deleteOne({ _id: req.params.id, owner: req.user._id });
    setFlash(req, 'success', 'Link deleted.');
    res.redirect('/admin#links');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
