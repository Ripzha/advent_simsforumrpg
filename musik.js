/* Musik-Leiste für Türchen mit Bild und Lied.
   Das Bild bleibt gross, der YouTube-Ton läuft über eine schmale Leiste darunter.
   Aktiv wird die Leiste, sobald in der Türchen-Zeile die Spalte musik_url gefüllt ist.
   Das bestehende Verhalten bleibt unangetastet:
   video_url zeigt weiterhin das Video (Hymne), musik_url zeigt Bild plus Ton. */
(function () {
  var karte = document.querySelector('#ak-modal .ak-modal-card');
  var bildRahmen = document.getElementById('ak-modal-image-rahmen');
  if (!karte || !bildRahmen || typeof showModal !== 'function') return;

  /* ---------- Aussehen ---------- */
  var stil = document.createElement('style');
  stil.textContent = [
    '.ak-musik { display: none; align-items: center; gap: 12px; margin: -4px 0 16px; padding: 9px 13px;',
    '  border: 1px solid var(--cream-tief); border-radius: 9px; background: rgba(216, 200, 154, 0.26); }',
    '.ak-musik.an { display: flex; }',
    '.ak-musik-knopf { flex: none; width: 38px; height: 38px; border-radius: 50%; cursor: pointer;',
    '  border: 1px solid var(--gold); background: linear-gradient(135deg, rgba(244,212,132,0.55), rgba(200,146,72,0.28));',
    '  color: var(--tinte); display: flex; align-items: center; justify-content: center; padding: 0; }',
    '.ak-musik-knopf:hover { background: linear-gradient(135deg, rgba(244,212,132,0.82), rgba(200,146,72,0.44)); }',
    '.ak-musik-knopf:focus-visible { outline: 2px solid var(--tinte-hell); outline-offset: 2px; }',
    '.ak-musik-knopf svg { width: 13px; height: 14px; display: block; }',
    '.ak-musik-text { flex: 1; min-width: 0; font-size: 13.5px; color: var(--tinte-mittel);',
    '  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.ak-musik-wellen { flex: none; display: flex; align-items: flex-end; gap: 2px; height: 15px; opacity: 0.3; }',
    '.ak-musik-wellen i { width: 3px; height: 4px; border-radius: 1px; background: var(--tinte-hell); }',
    '.ak-musik.spielt .ak-musik-wellen { opacity: 1; }',
    '.ak-musik.spielt .ak-musik-wellen i { animation: ak-welle 0.9s ease-in-out infinite; }',
    '.ak-musik.spielt .ak-musik-wellen i:nth-child(2) { animation-delay: 0.18s; }',
    '.ak-musik.spielt .ak-musik-wellen i:nth-child(3) { animation-delay: 0.36s; }',
    '.ak-musik.spielt .ak-musik-wellen i:nth-child(4) { animation-delay: 0.54s; }',
    '@keyframes ak-welle { 0%, 100% { height: 4px; } 50% { height: 15px; } }',
    '.ak-musik-player { position: fixed; left: -9999px; top: 0; width: 1px; height: 1px;',
    '  overflow: hidden; opacity: 0; pointer-events: none; }',
    '@media (prefers-reduced-motion: reduce) {',
    '  .ak-musik.spielt .ak-musik-wellen i { animation: none; height: 10px; } }'
  ].join('\n');
  document.head.appendChild(stil);

  var IKON_PLAY = '<svg viewBox="0 0 12 14" aria-hidden="true"><path d="M1 1 L11 7 L1 13 Z" fill="currentColor"/></svg>';
  var IKON_PAUSE = '<svg viewBox="0 0 12 14" aria-hidden="true"><rect x="1.5" y="1" width="3.4" height="12" fill="currentColor"/><rect x="7.1" y="1" width="3.4" height="12" fill="currentColor"/></svg>';

  /* ---------- Leiste bauen ---------- */
  var leiste = document.createElement('div');
  leiste.className = 'ak-musik';
  leiste.id = 'ak-musik';

  var knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'ak-musik-knopf';
  knopf.id = 'ak-musik-knopf';
  knopf.setAttribute('aria-label', 'Musik abspielen');
  knopf.innerHTML = IKON_PLAY;

  var text = document.createElement('span');
  text.className = 'ak-musik-text';
  text.id = 'ak-musik-text';

  var wellen = document.createElement('span');
  wellen.className = 'ak-musik-wellen';
  wellen.setAttribute('aria-hidden', 'true');
  wellen.innerHTML = '<i></i><i></i><i></i><i></i>';

  leiste.appendChild(knopf);
  leiste.appendChild(text);
  leiste.appendChild(wellen);
  bildRahmen.insertAdjacentElement('afterend', leiste);

  // Der Player hängt ausserhalb der Karte, damit ihn kein Klick auf das Modal trifft
  var playerHalter = document.createElement('div');
  playerHalter.className = 'ak-musik-player';
  playerHalter.innerHTML = '<div id="ak-musik-ziel"></div>';
  document.body.appendChild(playerHalter);

  /* ---------- YouTube-Player ---------- */
  var player = null;
  var playerBereit = false;
  var wartendeId = null;   // Lied, das gesetzt wurde, bevor der Player bereit war
  var aktuelleId = null;

  function ladeApi() {
    if (window.YT && window.YT.Player) { bauePlayer(); return; }
    if (document.getElementById('ak-musik-api')) return;
    var s = document.createElement('script');
    s.id = 'ak-musik-api';
    s.src = 'https://www.youtube.com/iframe_api';
    var vorher = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof vorher === 'function') vorher();
      bauePlayer();
    };
    document.head.appendChild(s);
  }

  function bauePlayer() {
    if (player) return;
    player = new YT.Player('ak-musik-ziel', {
      height: '1',
      width: '1',
      host: 'https://www.youtube-nocookie.com',
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onReady: function () {
          playerBereit = true;
          if (wartendeId) { var id = wartendeId; wartendeId = null; spieleId(id, true); }
        },
        onStateChange: function (e) {
          var spielt = (e.data === YT.PlayerState.PLAYING);
          leiste.classList.toggle('spielt', spielt);
          knopf.innerHTML = spielt ? IKON_PAUSE : IKON_PLAY;
          knopf.setAttribute('aria-label', spielt ? 'Musik anhalten' : 'Musik abspielen');
        },
        onError: function () {
          // Lied gesperrt oder nicht einbettbar: Leiste sagt es, statt still zu bleiben
          text.textContent = 'Dieses Lied lässt sich hier nicht abspielen.';
          leiste.classList.remove('spielt');
          knopf.innerHTML = IKON_PLAY;
        }
      }
    });
  }

  /* ---------- Hilfen ---------- */
  function musikId(url) {
    var u = String(url || '').trim();
    if (!u) return '';
    var m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(u)) return u;
    return '';
  }

  function spieleId(id, sofort) {
    if (!playerBereit) { wartendeId = id; ladeApi(); return; }
    if (id !== aktuelleId) {
      aktuelleId = id;
      player.loadVideoById(id);   // startet von selbst, wo der Browser es zulässt
    } else if (sofort) {
      player.playVideo();
    }
  }

  function haltAn() {
    leiste.classList.remove('spielt');
    knopf.innerHTML = IKON_PLAY;
    knopf.setAttribute('aria-label', 'Musik abspielen');
    if (player && playerBereit) { try { player.stopVideo(); } catch (e) {} }
    aktuelleId = null;
    wartendeId = null;
  }

  knopf.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!player || !playerBereit) { ladeApi(); return; }
    var zustand = player.getPlayerState();
    if (zustand === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  });

  /* ---------- Einklinken in Modal auf und zu ---------- */
  var zeigeOriginal = showModal;
  showModal = function (tag) {
    zeigeOriginal(tag);
    var daten = getTuerData(tag, modalState.tueren) || {};
    var id = musikId(daten.musik_url || daten.musik || daten.lied_url);
    var bildSichtbar = bildRahmen.style.display !== 'none';
    if (id && bildSichtbar) {
      text.textContent = daten.musik_titel || daten.lied || 'Musik zum Bild';
      leiste.classList.add('an');
      ladeApi();
      spieleId(id, true);
    } else {
      leiste.classList.remove('an');
      haltAn();
    }
  };

  var schliesseOriginal = closeModal;
  closeModal = function () {
    schliesseOriginal();
    leiste.classList.remove('an');
    haltAn();
  };
})();
