(function luminApp() {
  const premiumEase = 'cubic-bezier(0.16, 1, 0.3, 1)';

  function applyTheme(theme) {
    const resolved = theme || localStorage.getItem('lumin-theme') || 'system';
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', resolved === 'dark' || (resolved === 'system' && prefersDark));
    document.documentElement.dataset.theme = resolved;
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.themeChoice === resolved);
    });
  }

  function postJson(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  function initTheme() {
    applyTheme();
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        const theme = button.dataset.themeChoice;
        localStorage.setItem('lumin-theme', theme);
        applyTheme(theme);
        postJson('/api/theme', { theme }).catch(() => {});
      });
    });

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if ((localStorage.getItem('lumin-theme') || 'system') === 'system') {
          applyTheme('system');
        }
      });
    }
  }

  function initLanguage() {
    document.querySelectorAll('[data-language-select]').forEach((select) => {
      select.addEventListener('change', async () => {
        const locale = select.value;
        document.documentElement.lang = locale;
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
        try {
          await postJson('/api/locale', { locale });
        } finally {
          window.location.reload();
        }
      });
    });
  }

  function initIcons() {
    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          'stroke-width': 1.7
        }
      });
    }
  }

  function initCopyButtons() {
    document.querySelectorAll('[data-copy]').forEach((button) => {
      button.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(button.dataset.copy);
          const oldText = button.textContent;
          button.textContent = window.LuminI18n.t('copied');
          setTimeout(() => {
            button.textContent = oldText;
          }, 1400);
        } catch (error) {
          window.prompt('Copy this URL', button.dataset.copy);
        }
      });
    });
  }

  function initModals() {
    document.querySelectorAll('[data-modal-open]').forEach((button) => {
      button.addEventListener('click', () => {
        const modal = document.querySelector(button.dataset.modalOpen);
        if (modal) {
          modal.classList.add('is-open');
        }
      });
    });

    document.querySelectorAll('[data-modal-close]').forEach((button) => {
      button.addEventListener('click', () => {
        const modal = button.closest('.modal, .preview-drawer');
        if (modal) {
          modal.classList.remove('is-open');
        }
      });
    });
  }

  function drawMiniChart() {
    const canvas = document.querySelector('[data-analytics-chart]');
    if (!canvas) {
      return;
    }

    const series = JSON.parse(canvas.dataset.series || '[]');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const max = Math.max(1, ...series.map((point) => Math.max(point.views, point.clicks)));
    const padding = 18;
    const width = rect.width - padding * 2;
    const height = rect.height - padding * 2;

    function pointsFor(key) {
      return series.map((point, index) => {
        const x = padding + (series.length <= 1 ? width : (index / (series.length - 1)) * width);
        const y = padding + height - (point[key] / max) * height;
        return [x, y];
      });
    }

    function drawLine(points, color) {
      ctx.beginPath();
      points.forEach(([x, y], index) => {
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.stroke();
    }

    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 4; i += 1) {
      const y = padding + (height / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(rect.width - padding, y);
      ctx.strokeStyle = getComputedStyle(document.documentElement).classList ? '#94a3b8' : '#94a3b8';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (series.length) {
      drawLine(pointsFor('views'), '#2563eb');
      drawLine(pointsFor('clicks'), '#d946ef');
    }
  }

  function initCheckoutAutoload() {
    const openCheckout = document.querySelector('[data-open-on-load="checkout"]');
    if (openCheckout) {
      requestAnimationFrame(() => {
        document.querySelector(openCheckout.dataset.target)?.classList.add('is-open');
      });
    }
    const openGate = document.querySelector('[data-open-on-load="gate"]');
    if (openGate) {
      requestAnimationFrame(() => {
        document.querySelector(openGate.dataset.target)?.classList.add('is-open');
      });
    }
  }

  function initInteractiveCards() {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      card.addEventListener('mousemove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * -8;
        card.style.transition = `transform 0.12s ${premiumEase}`;
        card.style.transform = `perspective(900px) rotateY(${x}deg) rotateX(${y}deg) translateY(-2px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transition = `transform 0.5s ${premiumEase}`;
        card.style.transform = '';
      });
    });
  }

  function initLiveBioPreview() {
    const phone = document.querySelector('[data-live-phone]');
    if (!phone) {
      return;
    }

    const preview = {
      bg: document.querySelector('[data-live-bg]'),
      font: document.querySelector('[data-live-font]'),
      name: document.querySelector('[data-live-name]'),
      bio: document.querySelector('[data-live-bio]'),
      avatar: document.querySelector('[data-live-avatar]'),
      avatarFallback: document.querySelector('[data-live-avatar-fallback]'),
      draftLink: document.querySelector('[data-live-draft-link]'),
      draftTitle: document.querySelector('[data-live-draft-title]'),
      draftDescription: document.querySelector('[data-live-draft-description]'),
      draftIcon: document.querySelector('[data-live-draft-icon]'),
      support: document.querySelector('[data-live-support]'),
      tipHeadline: document.querySelector('[data-live-tip-headline]')
    };

    const inputs = {
      name: document.querySelector('[data-live-name-input]'),
      bio: document.querySelector('[data-live-bio-input]'),
      avatar: document.querySelector('[data-live-avatar-input]'),
      font: document.querySelector('[data-live-font-input]'),
      accent: document.querySelector('[data-live-accent-input]'),
      bgType: document.querySelector('[data-live-bg-type-input]'),
      bgValue: document.querySelector('[data-live-bg-value-input]'),
      linkTitle: document.querySelector('[data-live-link-title]'),
      linkDescription: document.querySelector('[data-live-link-description]'),
      linkIcon: document.querySelector('[data-live-link-icon]'),
      tipEnabled: document.querySelector('[data-live-tip-enabled-input]'),
      tipHeadline: document.querySelector('[data-live-tip-headline-input]')
    };

    function initialsFor(name) {
      return (name || 'You')
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }

    function setText(element, value, fallback) {
      if (element) {
        element.textContent = value && value.trim() ? value.trim() : fallback;
      }
    }

    function updateAvatar() {
      if (!preview.avatar) {
        return;
      }
      const url = inputs.avatar ? inputs.avatar.value.trim() : '';
      if (url) {
        preview.avatar.src = url;
        preview.avatar.classList.remove('hidden');
        preview.avatar.onerror = () => {
          preview.avatar.classList.add('hidden');
          if (preview.avatarFallback) {
            preview.avatarFallback.classList.remove('hidden');
          }
        };
        if (preview.avatarFallback) {
          preview.avatarFallback.classList.add('hidden');
        }
      } else {
        preview.avatar.removeAttribute('src');
        preview.avatar.classList.add('hidden');
        if (preview.avatarFallback) {
          preview.avatarFallback.textContent = initialsFor(inputs.name && inputs.name.value);
          preview.avatarFallback.classList.remove('hidden');
        }
      }
    }

    function updateBackground() {
      if (!preview.bg) {
        return;
      }
      const type = inputs.bgType ? inputs.bgType.value : 'gradient';
      const value = inputs.bgValue && inputs.bgValue.value.trim()
        ? inputs.bgValue.value.trim()
        : 'linear-gradient(135deg, #eff6ff 0%, #ffffff 45%, #fae8ff 100%)';

      preview.bg.style.background = '';
      preview.bg.style.backgroundImage = '';
      preview.bg.style.backgroundColor = '';
      preview.bg.style.backgroundSize = 'cover';
      preview.bg.style.backgroundPosition = 'center';

      if (type === 'image') {
        preview.bg.style.backgroundImage = `url("${value}")`;
      } else if (type === 'solid') {
        preview.bg.style.backgroundColor = value;
      } else if (type === 'video') {
        preview.bg.style.background = 'linear-gradient(135deg, #020617 0%, #1d4ed8 45%, #a21caf 100%)';
      } else {
        preview.bg.style.background = value;
      }
    }

    function updateFont() {
      if (!preview.font) {
        return;
      }
      preview.font.classList.remove('font-sans', 'font-serif', 'font-mono');
      preview.font.classList.add(inputs.font && inputs.font.value === 'serif' ? 'font-serif' : inputs.font && inputs.font.value === 'mono' ? 'font-mono' : 'font-sans');
    }

    function updateButtonStyle() {
      const selected = document.querySelector('[data-live-button-style-input]:checked');
      const style = selected ? selected.value : 'soft-shadow';
      document.querySelectorAll('.live-preview-link').forEach((link) => {
        ['fill', 'outline', 'hard-shadow', 'soft-shadow', 'rounded', 'square'].forEach((name) => {
          link.classList.remove(`bio-button-${name}`);
        });
        link.classList.add(`bio-button-${style}`);
      });
    }

    function updateMode() {
      const selected = document.querySelector('[data-live-mode-input]:checked');
      const mode = selected ? selected.value : 'system';
      const shouldDark = mode === 'dark' || (mode === 'system' && document.documentElement.classList.contains('dark'));
      phone.classList.toggle('dark', shouldDark);
      phone.classList.toggle('text-white', shouldDark);
      phone.classList.toggle('text-slate-950', !shouldDark);
    }

    function updateDraftLink() {
      if (!preview.draftLink) {
        return;
      }
      const title = inputs.linkTitle ? inputs.linkTitle.value.trim() : '';
      const description = inputs.linkDescription ? inputs.linkDescription.value.trim() : '';
      const icon = inputs.linkIcon ? inputs.linkIcon.value : 'link';
      preview.draftLink.classList.toggle('hidden', !title);
      preview.draftLink.classList.toggle('flex', Boolean(title));
      setText(preview.draftTitle, title, 'New link');
      setText(preview.draftDescription, description, '');
      if (preview.draftIcon) {
        preview.draftIcon.setAttribute('data-lucide', icon || 'link');
        preview.draftIcon.innerHTML = '';
      }
      initIcons();
    }

    function updateSupport() {
      if (preview.support && inputs.tipEnabled) {
        preview.support.classList.toggle('hidden', !inputs.tipEnabled.checked);
      }
      setText(preview.tipHeadline, inputs.tipHeadline && inputs.tipHeadline.value, 'Support my work');
    }

    function updateAll() {
      setText(preview.name, inputs.name && inputs.name.value, 'Your name');
      setText(preview.bio, inputs.bio && inputs.bio.value, 'Tell visitors what you create, sell, or share.');
      if (preview.avatarFallback) {
        preview.avatarFallback.textContent = initialsFor(inputs.name && inputs.name.value);
      }
      if (inputs.accent) {
        phone.style.setProperty('--accent', inputs.accent.value || '#111827');
      }
      updateAvatar();
      updateBackground();
      updateFont();
      updateButtonStyle();
      updateMode();
      updateDraftLink();
      updateSupport();
    }

    document.querySelectorAll('[data-live-name-input], [data-live-bio-input], [data-live-avatar-input], [data-live-font-input], [data-live-accent-input], [data-live-bg-type-input], [data-live-bg-value-input], [data-live-link-title], [data-live-link-description], [data-live-link-icon], [data-live-tip-enabled-input], [data-live-tip-headline-input], [data-live-button-style-input], [data-live-mode-input]').forEach((input) => {
      input.addEventListener('input', updateAll);
      input.addEventListener('change', updateAll);
    });

    document.querySelectorAll('[data-builder-preset]').forEach((button) => {
      button.addEventListener('click', () => {
        if (inputs.accent) {
          inputs.accent.value = button.dataset.presetAccent || inputs.accent.value;
        }
        if (inputs.bgType) {
          inputs.bgType.value = button.dataset.presetBgType || inputs.bgType.value;
        }
        if (inputs.bgValue) {
          inputs.bgValue.value = button.dataset.presetBg || inputs.bgValue.value;
        }
        if (inputs.font) {
          inputs.font.value = button.dataset.presetFont || inputs.font.value;
        }
        const mode = document.querySelector(`[data-live-mode-input][value="${button.dataset.presetMode}"]`);
        if (mode) {
          mode.checked = true;
        }
        const buttonStyle = document.querySelector(`[data-live-button-style-input][value="${button.dataset.presetButton}"]`);
        if (buttonStyle) {
          buttonStyle.checked = true;
        }
        document.querySelector('#iphone-preview-drawer')?.classList.add('is-open');
        updateAll();
      });
    });

    updateAll();
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLanguage();
    initIcons();
    initCopyButtons();
    initModals();
    drawMiniChart();
    initCheckoutAutoload();
    initInteractiveCards();
    initLiveBioPreview();
  });
})();
