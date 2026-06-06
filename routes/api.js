const express = require('express');
const Analytics = require('../models/Analytics');
const Link = require('../models/Link');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return next();
}

router.post('/locale', (req, res) => {
  const allowed = ['en', 'ar', 'sw', 'fr', 'am', 'ti'];
  const locale = allowed.includes(req.body.locale) ? req.body.locale : 'en';
  req.session.locale = locale;
  res.json({ ok: true, locale, dir: locale === 'ar' ? 'rtl' : 'ltr' });
});

router.post('/theme', (req, res) => {
  const theme = ['light', 'dark', 'system'].includes(req.body.theme) ? req.body.theme : 'system';
  req.session.theme = theme;
  res.json({ ok: true, theme });
});

router.get('/analytics/summary', requireAuth, async (req, res, next) => {
  try {
    const tenantSlug = req.session.user.tenantSlug;
    const [views, clicks, uniqueVisitors, topLinks] = await Promise.all([
      Analytics.countDocuments({ tenantSlug, eventType: 'profile_view' }),
      Analytics.countDocuments({ tenantSlug, eventType: 'link_click' }),
      Analytics.distinct('visitorId', { tenantSlug, eventType: 'profile_view' }),
      Analytics.aggregate([
        { $match: { tenantSlug, eventType: 'link_click', link: { $ne: null } } },
        { $group: { _id: '$link', clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'links',
            localField: '_id',
            foreignField: '_id',
            as: 'link'
          }
        },
        { $unwind: '$link' },
        { $project: { title: '$link.title', clicks: 1 } }
      ])
    ]);

    res.json({
      views,
      clicks,
      uniqueVisitors: uniqueVisitors.length,
      ctr: views ? Math.round((clicks / views) * 1000) / 10 : 0,
      topLinks
    });
  } catch (error) {
    next(error);
  }
});

router.get('/links/:id/quick-stats', requireAuth, async (req, res, next) => {
  try {
    const link = await Link.findOne({ _id: req.params.id, tenantSlug: req.session.user.tenantSlug });
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const [clicks, unlocks, checkouts] = await Promise.all([
      Analytics.countDocuments({ link: link._id, eventType: 'link_click' }),
      Analytics.countDocuments({ link: link._id, eventType: 'gate_unlock' }),
      Analytics.countDocuments({ link: link._id, eventType: { $in: ['checkout_started', 'checkout_completed'] } })
    ]);

    return res.json({ clicks, unlocks, checkouts });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
