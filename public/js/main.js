/**
 * SUIT Wolverhampton 2026 — Main JavaScript
 * Accessibility, Navigation, Interactions
 */

// ─── Quick Exit (Safety Feature) ──────────────────────
function quickExit() {
  window.location.replace('https://www.google.co.uk');
}

// ─── Mobile Navigation Toggle ────────────────────────
function toggleMobileNav() {
  const nav = document.getElementById('navLinks');
  nav.classList.toggle('open');
}

// ─── Accessibility: High Contrast ────────────────────
function toggleHighContrast() {
  document.body.classList.toggle('high-contrast');
  localStorage.setItem('highContrast', document.body.classList.contains('high-contrast'));
}

// ─── Theme: Light / Dark Mode Toggle ─────────────────
function toggleLightMode() {
  document.body.classList.toggle('light-mode');
  localStorage.setItem('lightMode', document.body.classList.contains('light-mode'));
  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    const icon = btn.querySelector('iconify-icon');
    const label = btn.querySelector('.theme-toggle-label');
    const isLight = document.body.classList.contains('light-mode');
    if (icon) icon.setAttribute('icon', isLight ? 'lucide:moon' : 'lucide:sun');
    if (label) label.textContent = isLight ? 'Dark' : 'Light';
  }
}

// ─── Accessibility: Dyslexia Font ────────────────────
function toggleDyslexiaFont() {
  document.body.classList.toggle('dyslexia-font');
  localStorage.setItem('dyslexiaFont', document.body.classList.contains('dyslexia-font'));
}

// ─── Restore accessibility preferences ──────────────
(function restoreA11y() {
  if (localStorage.getItem('highContrast') === 'true') {
    document.body.classList.add('high-contrast');
  }
  if (localStorage.getItem('dyslexiaFont') === 'true') {
    document.body.classList.add('dyslexia-font');
  }
  if (localStorage.getItem('lightMode') === 'true') {
    document.body.classList.add('light-mode');
  }
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      const icon = btn.querySelector('iconify-icon');
      const label = btn.querySelector('.theme-toggle-label');
      const isLight = document.body.classList.contains('light-mode');
      if (icon) icon.setAttribute('icon', isLight ? 'lucide:moon' : 'lucide:sun');
      if (label) label.textContent = isLight ? 'Dark' : 'Light';
    }
  });
})();

// ─── Translation (Google Translate redirect) ─────────
function translatePage(lang) {
  if (!lang) return;
  const currentUrl = encodeURIComponent(window.location.href);
  window.open(`https://translate.google.com/translate?sl=en&tl=${lang}&u=${currentUrl}`, '_blank');
}

// ─── AI Chat Bubble ──────────────────────────────────
function toggleAIChat() {
  const chat = document.getElementById('aiChat');
  chat.classList.toggle('open');
}

function aiRespond(type) {
  const body = document.querySelector('#aiChat .ai-chat-body');
  const options = document.querySelector('#aiChat .ai-chat-options');

  const responses = {
    self: `<p style="background: var(--brand-teal); color: #fff;">You're in the right place.</p>
           <p>Here's what I'd suggest:</p>
           <p><strong>Call us:</strong> <a href="tel:01902328983" style="color:var(--brand-orange)">01902 328 983</a></p>
           <p><strong>Walk in:</strong> Mon & Fri 10am-3pm (drop-in). Tue & Thu by appointment.</p>
           <p><strong>WhatsApp:</strong> Message a peer mentor right now.</p>
           <p><a href="/get-help" style="color:var(--brand-orange); font-weight:700;">Go to Get Help page →</a></p>`,
    loved: `<p style="background: var(--brand-pink); color: #fff;">It takes courage to reach out for someone you love.</p>
            <p>We support families and carers too. Here's how:</p>
            <p><strong>Call us:</strong> <a href="tel:01902328983" style="color:var(--brand-orange)">01902 328 983</a></p>
            <p><strong>Family Support:</strong> We provide wraparound support for families too.</p>
            <p><a href="/services" style="color:var(--brand-orange); font-weight:700;">See how we help →</a></p>`,
    timetable: `<p style="background: var(--brand-green); color: #fff;">Here's what's happening this week.</p>
                <p><a href="/timetable" style="color:var(--brand-orange); font-weight:700;">View the full weekly timetable →</a></p>
                <p>Everything is <strong>free</strong> and <strong>no booking needed</strong>.</p>`,
    crisis: `<p style="background: var(--color-crisis); color: #fff;">You are not alone. Help is here right now.</p>
             <p><strong>SUIT:</strong> <a href="tel:01902328983" style="color:var(--brand-orange); font-weight:700;">01902 328 983</a></p>
             <p><strong>Samaritans (24/7):</strong> <a href="tel:116123" style="color:var(--brand-orange); font-weight:700;">116 123</a></p>
             <p><strong>NHS Crisis:</strong> <a href="tel:111" style="color:var(--brand-orange); font-weight:700;">111 (press 2)</a></p>
             <p><a href="/get-help" style="color:var(--brand-orange); font-weight:700;">Go to Get Help page →</a></p>`
  };

  body.innerHTML = responses[type] || responses.self;
  options.innerHTML = '<button type="button" onclick="aiReset()">Ask another question ←</button>';
}

function aiReset() {
  const body = document.querySelector('#aiChat .ai-chat-body');
  const options = document.querySelector('#aiChat .ai-chat-options');
  body.innerHTML = '<p>Are you looking for support for yourself, or a loved one?</p>';
  options.innerHTML = `
    <button type="button" onclick="aiRespond('self')">I need support for myself</button>
    <button type="button" onclick="aiRespond('loved')">I'm worried about someone</button>
    <button type="button" onclick="aiRespond('timetable')">What's on today?</button>
    <button type="button" onclick="aiRespond('crisis')">I'm in crisis right now</button>
  `;
}

// ─── Timetable Filter ────────────────────────────────
function filterTimetable(category, btn) {
  const columns = document.querySelectorAll('.tt-day-column');
  const buttons = document.querySelectorAll('.filter-btn');

  buttons.forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  columns.forEach(col => {
    const events = col.querySelectorAll('.timetable-event');
    let visible = 0;
    events.forEach(event => {
      const show = category === 'all' || event.dataset.category === category;
      event.style.display = show ? 'flex' : 'none';
      if (show) visible++;
    });
    const placeholder = col.querySelector('.tt-day-empty');
    if (placeholder) {
      col.style.display = '';
    } else if (events.length && visible === 0) {
      col.style.display = 'none';
    } else {
      col.style.display = '';
    }
  });
}

function icsEscape(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// ─── Add to Calendar (ICS download) ─────────────────
function addToCalendarFromDataset(btn) {
  const row = btn.closest('.timetable-event');
  if (!row) return;
  const day = row.dataset.day;
  const time = row.dataset.time;
  const title = row.dataset.title;
  const endTime = row.dataset.end || '';
  const location = row.dataset.location || '';
  addToCalendar(day, time, title, endTime, location);
}

function addToCalendar(day, time, title, endTime, location) {
  const days = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
  const now = new Date();
  const currentDay = now.getDay();
  const targetDay = days[day] || 1;

  let diff = targetDay - currentDay;
  if (diff <= 0) diff += 7;

  const eventDate = new Date(now);
  eventDate.setDate(now.getDate() + diff);

  const [hours, mins] = time.split(':').map(Number);
  eventDate.setHours(hours, mins, 0, 0);

  const endDate = new Date(eventDate);
  if (endTime && /^\d{1,2}:\d{2}$/.test(endTime)) {
    const [eh, em] = endTime.split(':').map(Number);
    endDate.setHours(eh, em, 0, 0);
    if (endDate <= eventDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
  } else {
    endDate.setHours(hours + 1);
  }

  const formatDate = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const loc = location || 'SUIT Wolverhampton';
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SUIT Wolverhampton//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(eventDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${icsEscape(`${title} — SUIT Wolverhampton`)}`,
    `LOCATION:${icsEscape(loc)}`,
    'DESCRIPTION:Session at SUIT Wolverhampton. Call 01902 328983 with questions.',
    `RRULE:FREQ=WEEKLY;BYDAY=${day.substring(0, 2).toUpperCase()}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `suit-${title.toLowerCase().replace(/\s+/g, '-')}.ics`;
  link.click();
}

// ─── Programme detail modal (timetable page) ────────
function suitEscapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function suitLoadProgrammes() {
  const el = document.getElementById('suit-programmes-json');
  if (!el) return [];
  try {
    return JSON.parse(el.textContent);
  } catch (e) {
    return [];
  }
}

function suitRenderProgrammeModal(prog) {
  const inner = document.getElementById('programmeModalInner');
  if (!inner || !prog) return;

  let bodyHtml = '<div class="programme-modal-body">';
  (prog.body || []).forEach(block => {
    if (block.type === 'p') {
      bodyHtml += `<p>${suitEscapeHtml(block.text)}</p>`;
    } else if (block.type === 'h') {
      bodyHtml += `<h4>${suitEscapeHtml(block.text)}</h4>`;
    } else if (block.type === 'ul' && block.items) {
      bodyHtml += '<ul>';
      block.items.forEach(item => {
        bodyHtml += `<li>${suitEscapeHtml(item)}</li>`;
      });
      bodyHtml += '</ul>';
    } else if (block.type === 'quote') {
      bodyHtml += `<blockquote class="programme-modal-quote">${suitEscapeHtml(block.text)}<cite>${suitEscapeHtml(block.cite || '')}</cite></blockquote>`;
    }
  });
  bodyHtml += '</div>';

  let galleryHtml = '';
  if (prog.gallery && prog.gallery.length) {
    galleryHtml = '<div class="programme-gallery">';
    prog.gallery.forEach(g => {
      const src = suitEscapeHtml(g.src);
      const alt = suitEscapeHtml(g.alt || '');
      galleryHtml += `<a href="${src}" target="_blank" rel="noopener noreferrer"><img src="${src}" alt="${alt}" loading="lazy"></a>`;
    });
    galleryHtml += '</div>';
  }

  let linksHtml = '';
  if (prog.links && prog.links.length) {
    linksHtml = '<div class="programme-modal-links">';
    prog.links.forEach(l => {
      linksHtml += `<a href="${suitEscapeHtml(l.href)}" class="btn btn-outline" target="_blank" rel="noopener noreferrer">${suitEscapeHtml(l.label)}</a>`;
    });
    linksHtml += '</div>';
  }

  const mediaNote = prog.mediaNote ? `<p class="programme-modal-meta">${suitEscapeHtml(prog.mediaNote)}</p>` : '';
  const source = prog.sourceUrl
    ? `<p class="programme-modal-meta"><a href="${suitEscapeHtml(prog.sourceUrl)}" target="_blank" rel="noopener">Original page on suitrecoverywolverhampton.com</a></p>`
    : '';

  inner.innerHTML = `
    <h2 id="programmeModalTitle">${suitEscapeHtml(prog.title)}</h2>
    <p class="programme-modal-meta"><strong>Typical schedule:</strong> ${suitEscapeHtml(prog.scheduleSummary || '')}</p>
    <p class="programme-modal-meta"><strong>Where:</strong> ${suitEscapeHtml(prog.location || '')}</p>
    <p class="programme-modal-meta">${suitEscapeHtml(prog.referralNote || '')}</p>
    ${galleryHtml}
    ${bodyHtml}
    ${mediaNote}
    ${linksHtml}
    ${source}
  `;
}

function suitOpenProgrammeModal(slug) {
  const list = suitLoadProgrammes();
  const prog = list.find(p => p.slug === slug);
  const modal = document.getElementById('programmeModal');
  if (!prog || !modal) return;

  suitRenderProgrammeModal(prog);
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  const closeBtn = modal.querySelector('.programme-modal-close');
  if (closeBtn) closeBtn.focus();
}

function suitCloseProgrammeModal() {
  const modal = document.getElementById('programmeModal');
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
  const openBtn = e.target.closest('[data-open-programme]');
  if (openBtn) {
    const slug = openBtn.getAttribute('data-open-programme');
    if (slug) suitOpenProgrammeModal(slug);
    return;
  }
  if (e.target.matches('[data-close-programme-modal]')) {
    suitCloseProgrammeModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const modal = document.getElementById('programmeModal');
  if (modal && !modal.hidden) suitCloseProgrammeModal();
});

// Open programme modal when arriving from legacy redirect (#programme-<slug>)
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('programmeModal');
  if (!modal) return;
  const match = /^#programme-(.+)$/.exec(window.location.hash || '');
  if (!match) return;
  const slug = decodeURIComponent(match[1]);
  if (slug) suitOpenProgrammeModal(slug);
});

// ─── Toast auto-dismiss ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const toasts = document.querySelectorAll('.toast');
  toasts.forEach(toast => {
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  });

  // Cookie consent
  if (!localStorage.getItem('cookiesAccepted')) {
    const cc = document.getElementById('cookieConsent');
    if (cc) cc.style.display = 'flex';
  }
});

function acceptCookies() {
  localStorage.setItem('cookiesAccepted', 'true');
  const cc = document.getElementById('cookieConsent');
  if (cc) cc.style.display = 'none';
}

// ─── Smooth scroll for anchor links ──────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});
