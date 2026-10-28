(() => {
  const dialog = document.getElementById('demo-dialog');
  const trigger = document.getElementById('demo-open');
  if (!dialog || !trigger) return;
  trigger.addEventListener('click', () => dialog.showModal());
  document.getElementById('demo-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.querySelectorAll('a').forEach(link => link.addEventListener('click', () => dialog.close()));
})();
