const express = require('express');
const User = require('../models/User');
const Link = require('../models/Link');

const router = express.Router();

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

function sessionUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    username: user.username,
    tenantSlug: user.tenant.slug,
    plan: user.tenant.plan
  };
}

function requireGuest(req, res, next) {
  if (req.session.user) {
    return res.redirect('/admin');
  }
  return next();
}

function normalizeUsername(username) {
  return String(username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '')
    .slice(0, 40);
}

async function createStarterLinks(user) {
  const starterLinks = [
    {
      title: 'Latest Drop',
      url: 'https://example.com/drop',
      description: 'A highlighted animated link for launches.',
      type: 'animated',
      icon: 'sparkles',
      animation: 'leap',
      pinned: true,
      order: 1
    },
    {
      title: 'Newsletter',
      url: 'https://example.com/newsletter',
      description: 'Unlock by joining the list.',
      type: 'gated',
      icon: 'mail',
      gate: { type: 'newsletter', newsletterLabel: 'Join my weekly letter' },
      order: 2
    },
    {
      title: 'Studio Preset Pack',
      url: 'https://example.com/product',
      description: 'Digital product checkout overlay simulation.',
      type: 'product',
      icon: 'shopping-bag',
      commerce: { enabled: true, price: 29, currency: 'USD', productLabel: 'Preset pack' },
      order: 3
    }
  ];

  await Link.insertMany(
    starterLinks.map((link) => ({
      ...link,
      tenantSlug: user.tenant.slug,
      owner: user._id
    }))
  );
}

router.get('/signup', requireGuest, (req, res) => {
  res.render('signup', { title: 'Create account', form: {} });
});

router.post('/signup', requireGuest, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || '');

    if (!name || !email || !username || password.length < 8) {
      setFlash(req, 'error', 'Please provide a name, valid username, email, and an 8+ character password.');
      return res.status(422).render('signup', {
        title: 'Create account',
        form: { name, email, username }
      });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }, { 'tenant.slug': username }] });
    if (existing) {
      setFlash(req, 'error', 'That email or username is already in use.');
      return res.status(409).render('signup', {
        title: 'Create account',
        form: { name, email, username }
      });
    }

    const user = await User.create({
      name,
      email,
      username,
      password,
      tenant: {
        slug: username,
        displayName: name,
        plan: 'pro'
      },
      socialLinks: [
        { platform: 'instagram', label: 'Instagram', url: 'https://instagram.com', icon: 'instagram' },
        { platform: 'youtube', label: 'YouTube', url: 'https://youtube.com', icon: 'youtube' },
        { platform: 'github', label: 'GitHub', url: 'https://github.com', icon: 'github' }
      ],
      products: [
        {
          title: 'Creator Operating System',
          description: 'A premium Notion-style launch planner and audience growth system.',
          price: 19,
          currency: 'USD',
          fileLabel: 'PDF + workspace template'
        }
      ]
    });

    await createStarterLinks(user);
    req.session.user = sessionUser(user);
    req.session.locale = user.locale;
    return res.redirect('/admin');
  } catch (error) {
    return next(error);
  }
});

router.get('/login', requireGuest, (req, res) => {
  res.render('login', { title: 'Log in', form: {} });
});

router.post('/login', requireGuest, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      setFlash(req, 'error', 'Invalid email or password.');
      return res.status(401).render('login', { title: 'Log in', form: { email } });
    }

    user.lastLoginAt = new Date();
    await user.save();
    req.session.user = sessionUser(user);
    req.session.locale = user.locale;
    return res.redirect('/admin');
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }
    res.clearCookie('lumin.sid');
    return res.redirect('/auth/login');
  });
});

router.get('/forgot-password', requireGuest, (req, res) => {
  res.render('forgot-password', { title: 'Reset password', resetUrl: '' });
});

router.post('/forgot-password', requireGuest, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      setFlash(req, 'info', 'If an account exists for that email, a reset link has been prepared.');
      return res.render('forgot-password', { title: 'Reset password', resetUrl: '' });
    }

    const token = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset-password/${token}`;
    setFlash(req, 'success', 'Password reset link generated for this local demo.');
    return res.render('forgot-password', { title: 'Reset password', resetUrl });
  } catch (error) {
    return next(error);
  }
});

router.get('/reset-password/:token', requireGuest, async (req, res, next) => {
  try {
    const hashedToken = User.hashResetToken(req.params.token);
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      setFlash(req, 'error', 'This password reset link is invalid or expired.');
      return res.redirect('/auth/forgot-password');
    }

    return res.render('reset-password', { title: 'Choose new password', token: req.params.token });
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password/:token', requireGuest, async (req, res, next) => {
  try {
    const password = String(req.body.password || '');
    const hashedToken = User.hashResetToken(req.params.token);
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user || password.length < 8) {
      setFlash(req, 'error', 'Reset link is invalid or password is too short.');
      return res.status(422).render('reset-password', { title: 'Choose new password', token: req.params.token });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    setFlash(req, 'success', 'Password updated. You can log in now.');
    return res.redirect('/auth/login');
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
