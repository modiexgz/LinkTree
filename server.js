require('dotenv').config();

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const connectMongo = require('connect-mongo');
const methodOverride = require('method-override');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const bioRoutes = require('./routes/bio');

const app = express();
const MongoStore = connectMongo.MongoStore || connectMongo.default || connectMongo;
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/premium_linktree';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-change-this-secret';

const dictionaries = {
  en: {
    brand: 'Lumin Bio',
    dashboard: 'Dashboard',
    analytics: 'Analytics',
    links: 'Links',
    design: 'Design',
    logout: 'Log out',
    login: 'Log in',
    signup: 'Create account',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    totalViews: 'Total views',
    uniqueVisitors: 'Unique visitors',
    ctr: 'CTR',
    topLinks: 'Top links',
    referrers: 'Referrers',
    countries: 'Countries',
    profile: 'Profile',
    supportMe: 'Support me',
    unlock: 'Unlock',
    checkout: 'Checkout',
    livePreview: 'Live preview'
  },
  ar: {
    brand: 'لومين بايو',
    dashboard: 'لوحة التحكم',
    analytics: 'التحليلات',
    links: 'الروابط',
    design: 'التصميم',
    logout: 'تسجيل الخروج',
    login: 'تسجيل الدخول',
    signup: 'إنشاء حساب',
    language: 'اللغة',
    theme: 'المظهر',
    light: 'فاتح',
    dark: 'داكن',
    system: 'النظام',
    totalViews: 'إجمالي المشاهدات',
    uniqueVisitors: 'زوار فريدون',
    ctr: 'معدل النقر',
    topLinks: 'أفضل الروابط',
    referrers: 'مصادر الإحالة',
    countries: 'البلدان',
    profile: 'الملف الشخصي',
    supportMe: 'ادعمني',
    unlock: 'فتح',
    checkout: 'الدفع',
    livePreview: 'معاينة مباشرة'
  },
  sw: {
    brand: 'Lumin Bio',
    dashboard: 'Dashibodi',
    analytics: 'Takwimu',
    links: 'Viungo',
    design: 'Muundo',
    logout: 'Toka',
    login: 'Ingia',
    signup: 'Fungua akaunti',
    language: 'Lugha',
    theme: 'Mandhari',
    light: 'Mwanga',
    dark: 'Giza',
    system: 'Mfumo',
    totalViews: 'Mitazamo yote',
    uniqueVisitors: 'Wageni wa kipekee',
    ctr: 'CTR',
    topLinks: 'Viungo bora',
    referrers: 'Vyanzo',
    countries: 'Nchi',
    profile: 'Wasifu',
    supportMe: 'Niunge mkono',
    unlock: 'Fungua',
    checkout: 'Malipo',
    livePreview: 'Muonekano wa moja kwa moja'
  },
  fr: {
    brand: 'Lumin Bio',
    dashboard: 'Tableau de bord',
    analytics: 'Analytique',
    links: 'Liens',
    design: 'Design',
    logout: 'Se deconnecter',
    login: 'Connexion',
    signup: 'Creer un compte',
    language: 'Langue',
    theme: 'Theme',
    light: 'Clair',
    dark: 'Sombre',
    system: 'Systeme',
    totalViews: 'Vues totales',
    uniqueVisitors: 'Visiteurs uniques',
    ctr: 'CTR',
    topLinks: 'Meilleurs liens',
    referrers: 'Referents',
    countries: 'Pays',
    profile: 'Profil',
    supportMe: 'Me soutenir',
    unlock: 'Debloquer',
    checkout: 'Paiement',
    livePreview: 'Apercu en direct'
  },
  am: {
    brand: 'Lumin Bio',
    dashboard: 'ዳሽቦርድ',
    analytics: 'ትንታኔ',
    links: 'አገናኞች',
    design: 'ንድፍ',
    logout: 'ውጣ',
    login: 'ግባ',
    signup: 'መለያ ፍጠር',
    language: 'ቋንቋ',
    theme: 'ገጽታ',
    light: 'ብርሃን',
    dark: 'ጨለማ',
    system: 'ስርዓት',
    totalViews: 'ጠቅላላ እይታዎች',
    uniqueVisitors: 'ልዩ ጎብኚዎች',
    ctr: 'CTR',
    topLinks: 'ከፍተኛ አገናኞች',
    referrers: 'ምንጮች',
    countries: 'አገሮች',
    profile: 'መገለጫ',
    supportMe: 'ድጋፍ አድርግ',
    unlock: 'ክፈት',
    checkout: 'ክፍያ',
    livePreview: 'ቀጥታ ቅድመ እይታ'
  },
  ti: {
    brand: 'Lumin Bio',
    dashboard: 'ዳሽቦርድ',
    analytics: 'ትንታነ',
    links: 'መራኸቢታት',
    design: 'ንድፊ',
    logout: 'ውጻእ',
    login: 'እቶ',
    signup: 'ሕሳብ ፍጠር',
    language: 'ቋንቋ',
    theme: 'ቅዲ',
    light: 'ብርሃን',
    dark: 'ጸልማት',
    system: 'ስርዓት',
    totalViews: 'ጠቕላላ ርእይቶ',
    uniqueVisitors: 'ፍሉያት በጻሕቲ',
    ctr: 'CTR',
    topLinks: 'ዝለዓሉ መራኸቢታት',
    referrers: 'ምንጭታት',
    countries: 'ሃገራት',
    profile: 'ፕሮፋይል',
    supportMe: 'ደግፈኒ',
    unlock: 'ክፈት',
    checkout: 'ክፍሊት',
    livePreview: 'ቀጥታ ቅድመ ርእይቶ'
  }
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    name: 'lumin.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 14
    },
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      ttl: 60 * 60 * 24 * 14
    })
  })
);

app.use((req, res, next) => {
  const requestedLocale = req.query.lang || req.session.locale || 'en';
  const locale = dictionaries[requestedLocale] ? requestedLocale : 'en';
  req.locale = locale;
  req.isRtl = locale === 'ar';
  res.locals.locale = locale;
  res.locals.isRtl = req.isRtl;
  res.locals.locales = [
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'العربية' },
    { code: 'sw', label: 'Swahili' },
    { code: 'fr', label: 'Francais' },
    { code: 'am', label: 'አማርኛ' },
    { code: 'ti', label: 'ትግርኛ' }
  ];
  res.locals.dictionary = dictionaries[locale];
  res.locals.t = (key) => dictionaries[locale][key] || dictionaries.en[key] || key;
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  res.locals.currentPath = req.originalUrl;
  delete req.session.flash;
  next();
});

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/', bioRoutes);

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page not found',
    message: 'The page you are looking for has drifted out of orbit.'
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = error.status || 500;
  res.status(status).render('error', {
    title: status === 500 ? 'Something went wrong' : 'Request error',
    message: status === 500 ? 'We hit an unexpected issue. Please try again.' : error.message
  });
});

async function start() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => {
    console.log(`Lumin Bio running at http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = app;
