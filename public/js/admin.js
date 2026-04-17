/**
 * SUIT Admin Panel — Client-side JavaScript
 */

// Auto-dismiss toast notifications
document.addEventListener('DOMContentLoaded', () => {
  const toasts = document.querySelectorAll('.toast');
  toasts.forEach(toast => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  });
});

// File upload preview
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[type="file"]').forEach(input => {
    input.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        const file = this.files[0];
        const isImage = file.type.startsWith('image/');

        if (isImage) {
          const reader = new FileReader();
          reader.onload = (e) => {
            let preview = this.parentElement.querySelector('.preview-image');
            if (!preview) {
              preview = document.createElement('img');
              preview.className = 'preview-image';
              preview.style.marginTop = '0.5rem';
              this.parentElement.appendChild(preview);
            }
            preview.src = e.target.result;
          };
          reader.readAsDataURL(file);
        }
      }
    });
  });
});

// Page updates: media order matches Announcements cover + gallery (sync hidden existingOrder)
document.addEventListener('DOMContentLoaded', () => {
  const feed = document.getElementById('adminExistingMediaFeed');
  const orderInput = document.getElementById('existingOrder');
  if (!feed || !orderInput) return;

  function rows() {
    return [...feed.querySelectorAll('.admin-existing-media-row[data-orig-idx]')];
  }

  function syncOrderAndBadges() {
    const r = rows();
    orderInput.value = r.map((row) => row.getAttribute('data-orig-idx')).join(',');
    r.forEach((row, i) => {
      row.classList.toggle('admin-existing-media-row--lead', i === 0);
      const badge = row.querySelector('.admin-media-role-badge');
      if (badge) {
        badge.textContent = i === 0 ? 'Cover — Announcements feed' : 'Gallery';
      }
      const up = row.querySelector('.admin-media-move-up');
      const down = row.querySelector('.admin-media-move-down');
      if (up) up.disabled = i === 0;
      if (down) down.disabled = i === r.length - 1;
    });
  }

  feed.addEventListener('click', (e) => {
    const up = e.target.closest('.admin-media-move-up');
    const down = e.target.closest('.admin-media-move-down');
    const row = e.target.closest('.admin-existing-media-row[data-orig-idx]');
    if (!row) return;
    if (up && !up.disabled) {
      const prev = row.previousElementSibling;
      if (prev && prev.matches('.admin-existing-media-row[data-orig-idx]')) {
        feed.insertBefore(row, prev);
        syncOrderAndBadges();
      }
    } else if (down && !down.disabled) {
      const next = row.nextElementSibling;
      if (next && next.matches('.admin-existing-media-row[data-orig-idx]')) {
        feed.insertBefore(next, row);
        syncOrderAndBadges();
      }
    }
  });

  const form = feed.closest('form');
  if (form) {
    form.addEventListener('submit', () => {
      syncOrderAndBadges();
    });
  }

  syncOrderAndBadges();
});
