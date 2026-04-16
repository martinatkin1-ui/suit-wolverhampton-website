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
