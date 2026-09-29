(() => {
  'use strict';

  const status = document.getElementById('page-status');
  const videos = [...document.querySelectorAll('video')];
  const navigation = document.getElementById('page-navigation');
  const menu = document.querySelector('.nav-toggle');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const opening = document.getElementById('opening-video');
  let introStarted = false;

  function closeMenu() {
    menu.setAttribute('aria-expanded', 'false');
    menu.textContent = 'Menu';
    navigation.classList.remove('is-open');
  }

  menu.addEventListener('click', () => {
    const isOpen = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(isOpen));
    menu.textContent = isOpen ? 'Close' : 'Menu';
    navigation.classList.toggle('is-open', isOpen);
  });
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menu.focus();
    }
  });

  document.querySelectorAll('[data-tab-group]').forEach(group => {
    const tabs = [...group.querySelectorAll('[role="tab"]')];
    function select(tab) {
      tabs.forEach(item => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        panel.hidden = !selected;
        if (!selected) panel.querySelectorAll('video').forEach(video => video.pause());
      });
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) {
          event.preventDefault();
          select(tabs[next]);
          tabs[next].focus();
        }
      });
    });
  });

  opening.removeAttribute('autoplay');
  opening.pause();
  videos.forEach(video => {
    video.addEventListener('play', () => {
      if (video === opening) introStarted = true;
      videos.filter(other => other !== video).forEach(other => other.pause());
    });
    video.addEventListener('error', () => {
      status.textContent = 'This video could not be loaded. Please reload the page or check the local video file.';
    });
  });

  const videoVisibility = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;
      if (!entry.isIntersecting && !video.paused && !document.fullscreenElement) video.pause();
      if (video === opening && entry.intersectionRatio >= .25 && !introStarted && !reduceMotion.matches && !navigator.connection?.saveData) {
        introStarted = true;
        video.play().catch(() => { status.textContent = 'Use the overview video controls to start playback.'; });
      }
    });
  }, { threshold: [0, .25] });
  videos.forEach(video => videoVisibility.observe(video));
  reduceMotion.addEventListener('change', event => { if (event.matches) opening.pause(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) videos.forEach(video => video.pause());
  });

  async function seekAndPlay(video, time) {
    try {
      if (video.readyState === 0) {
        await new Promise((resolve, reject) => {
          const cleanup = () => {
            video.removeEventListener('loadedmetadata', ready);
            video.removeEventListener('error', failed);
          };
          const ready = () => { cleanup(); resolve(); };
          const failed = () => { cleanup(); reject(new Error('Video unavailable')); };
          video.addEventListener('loadedmetadata', ready);
          video.addEventListener('error', failed);
          video.load();
        });
      }
      video.currentTime = time;
      await video.play();
    } catch {
      status.textContent = 'Use the video controls to start or resume playback.';
    }
  }
  document.querySelectorAll('[data-video][data-time]').forEach(button => {
    button.addEventListener('click', () => seekAndPlay(document.getElementById(button.dataset.video), Number(button.dataset.time)));
  });

  const dialog = document.getElementById('figure-dialog');
  const dialogImage = document.getElementById('dialog-image');
  let figureTrigger;
  document.querySelectorAll('[data-figure]').forEach(button => {
    button.addEventListener('click', () => {
      figureTrigger = button;
      dialogImage.src = button.dataset.figure;
      dialogImage.alt = button.querySelector('img').alt;
      document.getElementById('figure-dialog-title').textContent = button.dataset.caption;
      videos.forEach(video => video.pause());
      dialog.showModal();
      document.body.classList.add('dialog-open');
    });
  });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    figureTrigger?.focus({ preventScroll: true });
  });

  const copy = document.getElementById('copy-citation');
  copy.addEventListener('click', async () => {
    const citation = document.getElementById('citation-text');
    try {
      await navigator.clipboard.writeText(citation.textContent);
      copy.textContent = 'Copied';
      status.textContent = 'BibTeX citation copied to clipboard.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(citation);
      selection.removeAllRanges();
      selection.addRange(range);
      copy.textContent = 'Text selected';
      status.textContent = 'Citation selected. Press Command+C or Control+C to copy.';
    }
  });

  const links = [...navigation.querySelectorAll('a')];
  const sections = links.map(link => document.querySelector(link.getAttribute('href')));
  const progress = document.querySelector('.reading-progress');
  let scheduled = false;
  function updateScroll() {
    scheduled = false;
    let active = -1;
    sections.forEach((section, index) => { if (section.getBoundingClientRect().top <= 160) active = index; });
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${distance > 0 ? Math.min(100, Math.max(0, window.scrollY / distance * 100)) : 0}%`;
  }
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });
  window.addEventListener('resize', updateScroll);
  updateScroll();
})();
