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
});
