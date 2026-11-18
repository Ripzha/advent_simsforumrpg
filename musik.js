/* Musik-Leiste für Türchen mit Bild und Lied. Fassung 2.
   Das Bild bleibt gross, der YouTube-Ton läuft über eine schmale Leiste darunter.
   Aktiv wird die Leiste, sobald in der Türchen-Zeile die Spalte musik_url gefüllt ist.
   Das bestehende Verhalten bleibt unangetastet:
   video_url zeigt weiterhin das Video (Hymne), musik_url zeigt Bild plus Ton.
   Gegenüber Fassung 1 geändert:
   - Ein Klick vor dem Laden geht nicht mehr verloren, er wird nachgeholt.
   - Der Player hat jetzt echte Masse und sitzt nur unsichtbar in der Ecke.
   - Jeder Fehler steht in der Leiste und zusätzlich in der Browser-Konsole. */
(function () {
  var karte = document.querySelector('#ak-modal .ak-modal-card');
  var bildRahmen = document.getElementById('ak-modal-image-rahmen');
  if (!karte || !bildRahmen || typeof showModal !== 'function') {
    console.warn('[musik] Einstieg nicht gefunden, Leiste bleibt aus.');
    return;
  }

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
    /* Echte Masse, damit der Browser die Wiedergabe nicht verweigert, aber unsichtbar */
    '.ak-musik-player { position: fixed; right: 0; bottom: 0; width: 200px; height: 120px;',
    '  opacity: 0.01; pointer-events: none; z-index: -1; }',
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

  /* ---------- Zustand ---------- */
  var player = null;
  var bereit = false;
  var apiLaeuft = false;
  var wunschId = null;      // Lied, das gespielt werden soll, sobald der Player kann
  var wunschStart = false;  // Soll es von selbst losgehen?
  var aktuelleId = null;
  var titelText = '';

  function setzeText(t) { text.textContent = t; }
  function zeigePlay() { knopf.innerHTML = IKON_PLAY; knopf.setAttribute('aria-label', 'Musik abspielen'); }
  function zeigePause() { knopf.innerHTML = IKON_PAUSE; knopf.setAttribute('aria-label', 'Musik anhalten'); }

  /* ---------- YouTube-Player ---------- */
  function ladeApi() {
    if (window.YT && window.YT.Player) { bauePlayer(); return; }
    if (apiLaeuft) return;
    apiLaeuft = true;
    var vorher = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof vorher === 'function') { try { vorher(); } catch (e) {} }
      bauePlayer();
    };
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = function () {
      console.warn('[musik] YouTube-Schnittstelle konnte nicht geladen werden.');
      setzeText('Musik konnte nicht geladen werden.');
    };
    document.head.appendChild(s);
    // Wenn nach acht Sekunden nichts kommt, sagt es die Leiste statt still zu bleiben
    setTimeout(function () {
      if (!bereit && leiste.classList.contains('an')) {
        console.warn('[musik] Player wurde nicht bereit. YT vorhanden:', !!window.YT);
        setzeText('Musik konnte nicht geladen werden.');
      }
    }, 8000);
  }

  function bauePlayer() {
    if (player) return;
    try {
      player = new YT.Player('ak-musik-ziel', {
        height: '120',
        width: '200',
        // Kein eigener host: sonst gehen die Steuerbefehle an die falsche Gegenstelle
        playerVars: { playsinline: 1, rel: 0, origin: location.origin },
        events: {
          onReady: function () {
            bereit = true;
            if (wunschId) spieleId(wunschId, wunschStart);
          },
          onStateChange: function (e) {
            var spielt = (e.data === YT.PlayerState.PLAYING);
            leiste.classList.toggle('spielt', spielt);
            if (spielt) { zeigePause(); setzeText(titelText); } else { zeigePlay(); }
          },
          onError: function (e) {
            console.warn('[musik] YouTube meldet Fehler', e && e.data);
            setzeText('Dieses Lied lässt sich hier nicht abspielen.');
            leiste.classList.remove('spielt');
            zeigePlay();
          }
        }
      });
    } catch (err) {
      console.warn('[musik] Player liess sich nicht bauen:', err);
      setzeText('Musik konnte nicht geladen werden.');
    }
  }

  /* ---------- Hilfen ---------- */
  function musikId(url) {
    var u = String(url || '').trim();
    if (!u) return '';
    var m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(u)) return u;
    console.warn('[musik] Aus diesem Link liess sich keine Video-Kennung lesen:', u);
    return '';
  }

  function spieleId(id, starten) {
    wunschId = id;
    wunschStart = !!starten;
    if (!bereit) { ladeApi(); return; }
    if (id !== aktuelleId) {
      aktuelleId = id;
      if (starten) player.loadVideoById(id);   // lädt und startet
      else player.cueVideoById(id);            // lädt und wartet
    } else if (starten) {
      player.playVideo();
    }
  }

  function haltAn() {
    leiste.classList.remove('spielt');
    zeigePlay();
    if (player && bereit) { try { player.stopVideo(); } catch (e) {} }
    aktuelleId = null;
    wunschId = null;
    wunschStart = false;
  }

  knopf.addEventListener('click', function (e) {
    e.stopPropagation();
    // Vor dem Laden geht der Klick nicht verloren: er wird als Wunsch gemerkt
    if (!player || !bereit) {
      wunschStart = true;
      setzeText('Musik wird geladen …');
      ladeApi();
      return;
    }
    var zustand = -1;
    try { zustand = player.getPlayerState(); } catch (err) { console.warn('[musik]', err); }
    if (zustand === YT.PlayerState.PLAYING) player.pauseVideo();
    else if (aktuelleId) player.playVideo();
    else if (wunschId) spieleId(wunschId, true);
  });

  /* ---------- Einklinken in Modal auf und zu ---------- */
  var zeigeOriginal = showModal;
  showModal = function (tag) {
    zeigeOriginal(tag);
    var daten = getTuerData(tag, modalState.tueren) || {};
    var roh = daten.musik_url || daten.musik || daten.lied_url || '';
    var id = musikId(roh);
    var bildSichtbar = bildRahmen.style.display !== 'none';
    if (id && bildSichtbar) {
      titelText = daten.musik_titel || daten.lied || 'Musik zum Bild';
      setzeText(titelText);
      leiste.classList.add('an');
      zeigePlay();
      ladeApi();
      spieleId(id, true);
    } else {
      if (roh && !bildSichtbar) console.warn('[musik] Musik vorhanden, aber kein Bild sichtbar — video_url gesetzt?');
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
