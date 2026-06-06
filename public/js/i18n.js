window.LuminI18n = {
  labels: {
    en: { saved: 'Saved', copied: 'Copied', checkoutReady: 'Checkout ready' },
    ar: { saved: 'تم الحفظ', copied: 'تم النسخ', checkoutReady: 'الدفع جاهز' },
    sw: { saved: 'Imehifadhiwa', copied: 'Imenakiliwa', checkoutReady: 'Malipo yako tayari' },
    fr: { saved: 'Enregistre', copied: 'Copie', checkoutReady: 'Paiement pret' },
    am: { saved: 'ተቀምጧል', copied: 'ተቀድቷል', checkoutReady: 'ክፍያ ዝግጁ ነው' },
    ti: { saved: 'ተቐሚጡ', copied: 'ተቐዲሑ', checkoutReady: 'ክፍሊት ድሉው እዩ' }
  },
  getLocale() {
    return document.documentElement.lang || 'en';
  },
  t(key) {
    const locale = this.getLocale();
    return (this.labels[locale] && this.labels[locale][key]) || this.labels.en[key] || key;
  }
};
