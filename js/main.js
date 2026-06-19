// === Language Switcher ===
const currentLang = () => document.documentElement.getAttribute('data-lang') || 'en';

function switchLang(lang) {
  document.documentElement.setAttribute('data-lang', lang);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('lang-btn--active', btn.getAttribute('data-lang') === lang);
  });

  document.querySelectorAll('[data-' + lang + ']').forEach(el => {
    const translation = el.getAttribute('data-' + lang);
    if (translation) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translation;
      } else {
        el.textContent = translation;
      }
    }
  });

  document.documentElement.lang = lang;
  localStorage.setItem('preferredLang', lang);
}

document.addEventListener('DOMContentLoaded', () => {
  const preferred = localStorage.getItem('preferredLang') || 'en';
  switchLang(preferred);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchLang(btn.getAttribute('data-lang'));
    });
  });

  // === Contact Form ===
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = form.querySelector('.form-submit');
  const successEl = form.querySelector('.form-success');
  const errorEl = form.querySelector('.form-error');
  const fields = form.querySelectorAll('.form-field');

  // Staggered reveal on scroll into view
  const formWrap = document.querySelector('.contact-form-wrap');
  if (formWrap) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          fields.forEach((field, i) => {
            field.style.opacity = '0';
            field.style.transform = 'translateY(20px)';
            setTimeout(() => {
              field.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
              field.style.opacity = '1';
              field.style.transform = 'translateY(0)';
            }, i * 150);
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    observer.observe(formWrap);
  }

  // Set initial state for fields
  fields.forEach(f => {
    f.style.opacity = '0';
    f.style.transform = 'translateY(20px)';
  });
  // Reveal immediately if already visible
  setTimeout(() => {
    fields.forEach((field, i) => {
      field.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
      field.style.opacity = '1';
      field.style.transform = 'translateY(0)';
    });
  }, 300);

  function setLoading(loading) {
    submitBtn.classList.toggle('loading', loading);
    submitBtn.disabled = loading;
  }

  function showSuccess() {
    successEl.classList.add('visible');
    errorEl.classList.remove('visible');
    fields.forEach(f => f.classList.remove('error'));
    form.reset();
  }

  function showError(msg) {
    errorEl.textContent = msg || (currentLang() === 'nl'
      ? 'Er is iets misgegaan. Probeer het opnieuw.'
      : 'Something went wrong. Please try again.');
    errorEl.classList.add('visible');
    successEl.classList.remove('visible');
  }

  function showFieldError(field) {
    field.classList.add('error');
    // Shake animation
    field.style.animation = 'none';
    void field.offsetWidth; // reflow
    field.style.animation = 'shake 0.4s ease-out';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Hide previous messages
    successEl.classList.remove('visible');
    errorEl.classList.remove('visible');
    fields.forEach(f => f.classList.remove('error'));

    // Validate
    const name = form.querySelector('#formName').value.trim();
    const email = form.querySelector('#formEmail').value.trim();
    const message = form.querySelector('#formMessage').value.trim();
    let valid = true;

    if (!name) {
      showFieldError(form.querySelector('#formName').closest('.form-field'));
      valid = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError(form.querySelector('#formEmail').closest('.form-field'));
      valid = false;
    }
    if (!message) {
      showFieldError(form.querySelector('#formMessage').closest('.form-field'));
      valid = false;
    }

    if (!valid) return;

    // Submit to Cloudflare Worker
    setLoading(true);

    try {
      const API_URL = window.CONTACT_API_URL || '/api/contact';

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      showSuccess();
      submitBtn.classList.add('success');
      setTimeout(() => submitBtn.classList.remove('success'), 3000);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  });

  // Close success/error on click
  successEl.addEventListener('click', () => successEl.classList.remove('visible'));
  errorEl.addEventListener('click', () => errorEl.classList.remove('visible'));
});
