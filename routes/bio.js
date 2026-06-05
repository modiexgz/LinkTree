const crypto = require('crypto');
const express = require('express');
const User = require('../models/User');
const Link = require('../models/Link');
const Analytics = require('../models/Analytics');

const router = express.Router();

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || req.ip || '');
  return rawIp.split(',')[0].trim().replace('::ffff:', '');
}

function getVisitorId(req) {
  if (!req.session.visitorId) {
    req.session.visitorId = crypto.randomBytes(18).toString('hex');
  }
  return req.session.visitorId;
}

function normalizeReferrer(referrer) {
  if (!referrer) {
    return 'Direct';
  }
  try {
    const parsed = new URL(referrer);
    return parsed.hostname.replace(/^www\./, '');
  } catch (error) {
    return 'Direct';
  }
}

function inferGeoFromHeaders(req) {
  return {
    country: req.get('cf-ipcountry') || req.get('x-vercel-ip-country') || 'Unknown',
    city: req.get('x-vercel-ip-city') || ''
  };
}

async function recordEvent(req, user, eventType, options = {}) {
  const ip = getClientIp(req);
  const geo = inferGeoFromHeaders(req);
  await Analytics.create({
    tenantSlug: user.tenant.slug,
    profileUser: user._id,
    link: options.link ? options.link._id : null,
    eventType,
    visitorId: getVisitorId(req),
    sessionId: req.sessionID,
    ipHash: crypto.createHash('sha256').update(`${ip}:${process.env.SESSION_SECRET || 'dev'}`).digest('hex'),
    userAgent: req.get('user-agent') || '',
    referrer: normalizeReferrer(req.get('referer')),
    country: geo.country,
    city: geo.city,
    metadata: options.metadata || {}
  });
}

function visibleLinks(links) {
  return links.filter((link) => link.isVisibleNow());
}

function isUnlocked(req, link) {
  return Array.isArray(req.session.unlockedLinks) && req.session.unlockedLinks.includes(link._id.toString());
}

function unlock(req, link) {
  req.session.unlockedLinks = Array.from(new Set([...(req.session.unlockedLinks || []), link._id.toString()]));
}

router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/admin');
  }

  return res.render('landing', { title: 'Premium bio links for creators' });
});

router.get('/:username', async (req, res, next) => {
  try {
    const username = String(req.params.username || '').toLowerCase();
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).render('error', {
        title: 'Profile not found',
        message: 'This creator profile is not available.'
      });
    }

    const links = await Link.find({ owner: user._id, active: true }).sort({ pinned: -1, order: 1, createdAt: -1 });
    const publicLinks = visibleLinks(links);
    await recordEvent(req, user, 'profile_view');

    const gateLink = req.query.gate
      ? publicLinks.find((link) => link._id.toString() === String(req.query.gate))
      : null;
    const checkoutLink = req.query.checkout
      ? publicLinks.find((link) => link._id.toString() === String(req.query.checkout))
      : null;

    return res.render('profile', {
      title: `${user.name} | Lumin Bio`,
      profileUser: user,
      links: publicLinks,
      gateLink,
      checkoutLink,
      unlockedLinks: req.session.unlockedLinks || []
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:username/links/:id', async (req, res, next) => {
  try {
    const user = await User.findOne({ username: String(req.params.username || '').toLowerCase() });
    if (!user) {
      return res.status(404).render('error', { title: 'Profile not found', message: 'Profile not found.' });
    }

    const link = await Link.findOne({ _id: req.params.id, owner: user._id, active: true });
    if (!link || !link.isVisibleNow()) {
      setFlash(req, 'error', 'That link is not available right now.');
      return res.redirect(`/${user.username}`);
    }

    if (link.gate.type !== 'none' && !isUnlocked(req, link)) {
      return res.redirect(`/${user.username}?gate=${link._id}#gate`);
    }

    await recordEvent(req, user, 'link_click', { link });

    if (link.type === 'product' || link.commerce.enabled) {
      await recordEvent(req, user, 'checkout_started', {
        link,
        metadata: {
          amount: link.commerce.price,
          currency: link.commerce.currency,
          productTitle: link.title
        }
      });
      return res.redirect(`/${user.username}?checkout=${link._id}#checkout`);
    }

    return res.redirect(link.url);
  } catch (error) {
    return next(error);
  }
});

router.post('/:username/links/:id/unlock', async (req, res, next) => {
  try {
    const user = await User.findOne({ username: String(req.params.username || '').toLowerCase() });
    const link = user ? await Link.findOne({ _id: req.params.id, owner: user._id, active: true }) : null;

    if (!user || !link || link.gate.type === 'none') {
      return res.redirect('/');
    }

    let unlocked = false;
    if (link.gate.type === 'password') {
      unlocked = Boolean(link.gate.password && String(req.body.password || '') === link.gate.password);
    }
    if (link.gate.type === 'age') {
      unlocked = req.body.ageConfirm === 'on';
    }
    if (link.gate.type === 'newsletter') {
      unlocked = /.+@.+\..+/.test(String(req.body.email || '').trim());
    }

    if (!unlocked) {
      setFlash(req, 'error', 'Unlock requirements were not met. Please try again.');
      return res.redirect(`/${user.username}?gate=${link._id}#gate`);
    }

    unlock(req, link);
    await recordEvent(req, user, 'gate_unlock', {
      link,
      metadata: { gateType: link.gate.type }
    });
    return res.redirect(`/${user.username}/links/${link._id}`);
  } catch (error) {
    return next(error);
  }
});

router.post('/:username/tip', async (req, res, next) => {
  try {
    const user = await User.findOne({ username: String(req.params.username || '').toLowerCase() });
    if (!user || !user.tipJar.enabled) {
      return res.redirect('/');
    }

    const amount = Number(req.body.amount || 0);
    await recordEvent(req, user, 'tip_started', {
      metadata: {
        amount,
        currency: user.tipJar.currency
      }
    });
    setFlash(req, 'success', `Tip simulation complete. ${user.name} felt the love.`);
    return res.redirect(`/${user.username}#support`);
  } catch (error) {
    return next(error);
  }
});

router.post('/:username/checkout/:id', async (req, res, next) => {
  try {
    const user = await User.findOne({ username: String(req.params.username || '').toLowerCase() });
    const link = user ? await Link.findOne({ _id: req.params.id, owner: user._id, active: true }) : null;

    if (!user || !link) {
      return res.redirect('/');
    }

    await recordEvent(req, user, 'checkout_completed', {
      link,
      metadata: {
        amount: link.commerce.price,
        currency: link.commerce.currency,
        productTitle: link.title
      }
    });
    setFlash(req, 'success', 'Checkout complete. Your digital delivery is ready.');
    return res.redirect(`/${user.username}`);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
