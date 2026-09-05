(() => {
  'use strict';
  const { Game, TYPES, PET_NAMES, ACTIVITIES } = globalThis.HamsterGame;
  const game = new Game();
  const $ = id => document.getElementById(id);
  const statDefinitions = [
    ['hunger', 'Сытость', '◒', '#d2a36c'], ['thirst', 'Вода', '◕', '#88aeb6'],
    ['energy', 'Энергия', 'ϟ', '#bfbd79'], ['happiness', 'Настроение', '♡', '#c69a84'],
    ['health', 'Здоровье', '✚', '#91a578'],
  ];
  const nodes = new Map();
  let toastTimer, last = null, uiTime = 0, helpWasPaused = false;
  const plural = n => n === 1 ? 'хомяк' : n < 5 ? 'хомяка' : 'хомяков';
  const needsCare = h => h.hunger < 30 || h.thirst < 30 || h.health < 40;
  const time = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function toast(message) {
    clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('visible');
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3200);
  }
  $('stats').innerHTML = statDefinitions.map(([key, label, icon, color]) => `<div class="stat-row" id="stat-${key}"><div class="stat-header"><span><span class="stat-icon" style="color:${color}" aria-hidden="true">${icon}</span>${label}</span><span class="stat-value"></span></div><div class="stat-track" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100"><div class="stat-fill" style="--stat-color:${color}"></div></div></div>`).join('');
  function select(id) { game.selectedId = id; renderUI(); }
  function syncResidents() {
    for (const [id, node] of nodes) if (!game.hamsters.some(h => h.id === id)) { node.remove(); nodes.delete(id); }
    for (const h of game.hamsters) if (!nodes.has(h.id)) {
      const button = document.createElement('button'); button.className = 'hamster'; button.type = 'button';
      button.innerHTML = `<span class="selection-ring"></span><div class="sprite type-${h.type}"></div><span class="hamster-indicator"><i></i></span><span class="hamster-name">${h.name}</span><span class="bubble"></span>`;
      button.addEventListener('click', () => select(h.id));
      $('hamsters-layer').append(button); nodes.set(h.id, button);
    }
    $('resident-list').replaceChildren(...game.hamsters.map(h => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'resident-card'; b.dataset.id = h.id;
      b.innerHTML = `<span class="sprite type-${h.type}" aria-hidden="true"></span><span class="resident-text"><strong>${h.name}</strong><small>${TYPES[h.type].name}</small></span><span class="resident-state"></span>`;
      b.addEventListener('click', () => select(h.id)); return b;
    }));
    renderPositions(); renderUI();
  }
  function renderPositions() {
    for (const h of game.hamsters) {
      const node = nodes.get(h.id);
      node.style.left = `${h.x}%`; node.style.top = `${h.y}%`;
      node.style.zIndex = h.id === game.selectedId ? 30 : String(Math.floor(h.y / 5));
      node.style.setProperty('--facing', h.facing);
      node.className = `hamster ${h.activity} ${game.selectedId === h.id ? 'selected' : ''}`;
      node.style.animationPlayState = game.paused ? 'paused' : '';
      node.querySelector('.sprite').style.animationPlayState = game.paused ? 'paused' : '';
    }
  }
  function renderUI() {
    const h = game.selected, n = game.hamsters.length, type = TYPES[h.type];
    $('habitat-summary').textContent = `${n} ${plural(n)} · ${game.hamsters.some(needsCare) ? 'ждут твоей заботы' : 'всем уютно'}`;
    $('game-time').textContent = `${time(game.elapsed)} в игре`;
    $('food-supply').textContent = `В миске: ${Math.round(game.food)}%`;
    $('water-supply').textContent = `В поилке: ${Math.round(game.water)}%`;
    $('feed-button').classList.toggle('low', game.food < 20);
    $('water-button').classList.toggle('low', game.water < 20);
    $('pet-number').textContent = `${String(game.hamsters.indexOf(h) + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    $('pet-name').textContent = h.name;
    $('pet-species').textContent = `${type.name} · ${type.personality}`;
    $('pet-portrait').className = `pet-portrait sprite type-${h.type}`;
    $('pet-portrait').setAttribute('aria-label', `${type.name} хомяк ${h.name}`);
    const destination = h.target && ({ eat: 'Идёт к миске', drink: 'Идёт к поилке', sleep: 'Идёт отдыхать', wheel: 'Идёт к колесу', slide: 'Идёт к горке' })[h.target.activity];
    $('pet-activity').textContent = destination || ACTIVITIES[h.activity];
    for (const [key] of statDefinitions) {
      const row = $(`stat-${key}`), value = Math.round(h[key]);
      row.classList.toggle('urgent', value < 30);
      row.querySelector('.stat-value').textContent = `${value}%`;
      row.querySelector('.stat-fill').style.width = `${value}%`;
      row.querySelector('.stat-track').setAttribute('aria-valuenow', value);
    }
    $('pet-distance').textContent = `${h.distance.toFixed(1).replace('.', ',')} м`;
    $('pet-wheel').textContent = `${Math.floor(h.wheelTime)} сек`;
    $('pet-button-name').textContent = PET_NAMES[h.nameIndex];
    $('pet-button').disabled = h.petCooldown > 0;
    $('pet-hint').textContent = h.petCooldown > 0 ? `Мур-мур… ещё через ${Math.ceil(h.petCooldown)} сек` : needsCare(h) ? 'Малыш проголодался или хочет пить' : 'Счастье складывается из мелочей';
    $('resident-total').textContent = n; $('hamster-count').value = n;
    $('remove-hamster').disabled = n <= 1; $('add-hamster').disabled = n >= 10;
    $('pause-button').textContent = game.paused ? '▶' : 'Ⅱ';
    $('pause-button').setAttribute('aria-label', game.paused ? 'Продолжить игру' : 'Приостановить игру');
    $('pause-button').setAttribute('aria-pressed', game.paused);
    $('paused-label').hidden = !game.paused;
    $('speed-button').textContent = `${game.speed}×`;
    $('speed-button').setAttribute('aria-label', `Скорость игры ${game.speed}. Нажмите, чтобы изменить`);
    for (const pet of game.hamsters) {
      const node = nodes.get(pet.id), card = $('resident-list').querySelector(`[data-id="${pet.id}"]`), need = needsCare(pet);
      node.setAttribute('aria-label', `${pet.name}, ${TYPES[pet.type].name}, ${ACTIVITIES[pet.activity]}${need ? ', нужна забота' : ''}`);
      node.setAttribute('aria-pressed', pet.id === h.id);
      const fill = node.querySelector('.hamster-indicator i'); fill.style.width = `${Math.min(pet.hunger, pet.thirst, pet.health)}%`; fill.style.background = need ? '#cc755c' : '#77915e';
      const bubble = node.querySelector('.bubble');
      if (!bubble.classList.contains('heart')) bubble.textContent = pet.activity === 'sleep' ? 'zᶻ' : pet.activity === 'eat' ? '♪' : pet.activity === 'drink' ? '◕' : need ? '!' : '';
      card.classList.toggle('active', pet.id === h.id); card.classList.toggle('needs-care', need);
      card.setAttribute('aria-pressed', pet.id === h.id);
      card.querySelector('.resident-state').textContent = need ? 'Нужна забота' : pet.activity === 'sleep' ? 'Сладко спит' : 'Всё хорошо';
    }
    renderPositions();
  }
  $('feed-button').addEventListener('click', () => { game.feed(); renderUI(); toast('Миска полна! Малыши уже спешат на обед 🥕'); });
  $('water-button').addEventListener('click', () => { game.fillWater(); renderUI(); toast('Свежая водичка для всех 💧'); });
  $('pause-button').addEventListener('click', () => { game.paused = !game.paused; last = null; renderUI(); });
  $('speed-button').addEventListener('click', () => { game.speed = game.speed === 1 ? 2 : game.speed === 2 ? 4 : 1; renderUI(); toast(`Скорость времени: ${game.speed}×`); });
  $('add-hamster').addEventListener('click', () => { const h = game.add(); if (h) { game.selectedId = h.id; syncResidents(); toast(`${h.name} теперь с нами!`); } });
  $('remove-hamster').addEventListener('click', () => { const h = game.remove(); if (h) { syncResidents(); toast(`${h.name} переехал в другой уютный дом`); } });
  $('pet-button').addEventListener('click', () => {
    const h = game.selected;
    if (game.pet(h.id)) {
      const bubble = nodes.get(h.id).querySelector('.bubble'); bubble.textContent = '♥'; bubble.classList.add('heart');
      setTimeout(() => { bubble.classList.remove('heart'); renderUI(); }, 1500);
      toast(`${h.name} радуется твоей заботе ♡`); renderUI();
    }
  });
  $('help-button').addEventListener('click', () => { helpWasPaused = game.paused; game.paused = true; renderUI(); $('help-dialog').showModal(); });
  const closeHelp = () => $('help-dialog').close();
  $('close-help').addEventListener('click', closeHelp); $('start-playing').addEventListener('click', closeHelp);
  $('help-dialog').addEventListener('close', () => { game.paused = helpWasPaused; last = null; renderUI(); });
  document.addEventListener('visibilitychange', () => { last = null; });
  function frame(now) {
    if (!document.hidden) {
      const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.1);
      game.tick(dt); renderPositions(); uiTime += dt;
      if (uiTime > 0.25) { renderUI(); uiTime = 0; }
    }
    last = now; requestAnimationFrame(frame);
  }
  syncResidents(); requestAnimationFrame(frame);
})();
