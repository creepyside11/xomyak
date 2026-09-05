// Dynamic import lets the page explain module/WebGL failures instead of staying blank.
import('./app.js').catch(error => {
  console.error('Unable to start the 3D habitat:', error);
  document.getElementById('scene-loading').hidden = true;
  const message = document.getElementById('scene-error');
  message.hidden = false;
  message.textContent = location.protocol === 'file:'
    ? 'Для 3D нужен локальный сервер. Запусти npm start в папке игры и открой http://localhost:3000. Или открой игру через GitHub Pages.'
    : 'Не удалось запустить 3D. Проверь поддержку WebGL 2 и включи аппаратное ускорение в браузере, затем обнови страницу.';
});
