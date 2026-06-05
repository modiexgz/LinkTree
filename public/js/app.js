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
        const modal = button.closest('.modal');
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

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLanguage();
    initIcons();
    initCopyButtons();
    initModals();
    drawMiniChart();
    initCheckoutAutoload();
    initInteractiveCards();
  });
})();
