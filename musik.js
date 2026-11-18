/* Musik-Leiste für Türchen mit Bild und Lied. Fassung 3.
   Das Bild bleibt gross, der YouTube-Ton läuft über eine schmale Leiste darunter.
   Aktiv wird die Leiste, sobald in der Türchen-Zeile die Spalte musik_url gefüllt ist.
   Das bestehende Verhalten bleibt unangetastet:
   video_url zeigt weiterhin das Video (Hymne), musik_url zeigt Bild plus Ton.

   Gegenüber Fassung 2 vollständig umgebaut:
   Kein iframe_api und kein www-widgetapi mehr. Der Player ist ein gewöhnliches
   Einbettungs-Fenster, gesteuert über Nachrichten an das Fenster selbst.
   Damit entfallen die Herkunfts-Fehler beim postMessage. */
(function () {
  var karte = document.querySelector('#ak-modal .ak-modal-card');
  var bildRahmen = document.getElementById('ak-modal-image-rahmen');
  if (!karte || !bildRahmen || typeof showModal !== 'function') {
    console.warn('[musik] Einstieg nicht gefunden, Leiste bleibt aus.');
    return;
  }

  var YT_ORIGIN = 'https://www.youtube.com';

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
    '  opacity: 0.01; pointer-events: none; z-index: -1; border: 0; }',
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

  /* ---------- Zustand ---------- */
  var rahmen = null;        // das Einbettungs-Fenster
  var aktuelleId = null;
  var spielt = false;
  var titelText = '';

  function setzeText(t) { text.textContent = t; }
  function zeigePlay() {
    knopf.innerHTML = IKON_PLAY;
    knopf.setAttribute('aria-label', 'Musik abspielen');
    leiste.classList.remove('spielt');
    spielt = false;
  }
  function zeigePause() {
    knopf.innerHTML = IKON_PAUSE;
    knopf.setAttribute('aria-label', 'Musik anhalten');
    leiste.classList.add('spielt');
    spielt = true;
  }

  /* ---------- Player ---------- */
  function baueRahmen(id, startenSofort) {
    entferneRahmen();
    rahmen = document.createElement('iframe');
    rahmen.className = 'ak-musik-player';
    rahmen.id = 'ak-musik-rahmen';
    rahmen.allow = 'autoplay; encrypted-media';
    rahmen.setAttribute('title', 'Musik');
    rahmen.src = YT_ORIGIN + '/embed/' + id +
      '?enablejsapi=1&playsinline=1&rel=0&modestbranding=1' +
      '&autoplay=' + (startenSofort ? '1' : '0') +
      '&origin=' + encodeURIComponent(location.origin);
    document.body.appendChild(rahmen);
    aktuelleId = id;
    if (startenSofort) zeigePause(); else zeigePlay();
  }

  function entferneRahmen() {
    if (rahmen && rahmen.parentNode) rahmen.parentNode.removeChild(rahmen);
    rahmen = null;
    aktuelleId = null;
    zeigePlay();
  }

  // Befehl ans Einbettungs-Fenster schicken
  function befehl(name) {
    if (!rahmen || !rahmen.contentWindow) return false;
    try {
      rahmen.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: name, args: [] }),
        YT_ORIGIN
      );
      return true;
    } catch (err) {
      console.warn('[musik] Befehl', name, 'fehlgeschlagen:', err);
      return false;
    }
  }

  // YouTube meldet seinen Zustand zurück, sobald wir zuhören
  window.addEventListener('message', function (e) {
    if (!rahmen || e.source !== rahmen.contentWindow) return;
    if (String(e.origin).indexOf('youtube.com') === -1) return;
    var daten = null;
    try { daten = JSON.parse(e.data); } catch (err) { return; }
    if (!daten) return;
    if (daten.event === 'onReady') {
      // Zuhören anmelden, damit Zustandsmeldungen kommen
      try {
        rahmen.contentWindow.postMessage(
          JSON.stringify({ event: 'listening', id: 'ak-musik' }), YT_ORIGIN
        );
      } catch (err) {}
    }
    var zustand = daten.info && typeof daten.info.playerState === 'number'
      ? daten.info.playerState : null;
    if (zustand === 1) { zeigePause(); setzeText(titelText); }
    else if (zustand === 2 || zustand === 0 || zustand === 5) { zeigePlay(); }
    if (daten.info && daten.info.errorCode) {
      console.warn('[musik] YouTube meldet Fehler', daten.info.errorCode);
      setzeText('Dieses Lied lässt sich hier nicht abspielen.');
      zeigePlay();
    }
  });

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

  knopf.addEventListener('click', function (e) {
    e.stopPropagation();
    var id = knopf.dataset.id || aktuelleId;
    if (!id) return;
    if (!rahmen || aktuelleId !== id) {
      // Erster Druck oder anderes Lied: Fenster neu bauen, diesmal mit Start
      baueRahmen(id, true);
      setzeText(titelText);
      return;
    }
    if (spielt) {
      if (!befehl('pauseVideo')) baueRahmen(id, false);
      zeigePlay();
    } else {
      // Klappt der Befehl nicht, hilft Neubauen mit Startvorgabe immer
      if (!befehl('playVideo')) baueRahmen(id, true);
      zeigePause();
    }
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
      knopf.dataset.id = id;
      leiste.classList.add('an');
      // Versuch, gleich loszulegen. Verweigert der Browser das, bleibt der Knopf auf Play
      baueRahmen(id, true);
    } else {
      if (roh && !bildSichtbar) console.warn('[musik] Musik vorhanden, aber kein Bild sichtbar — video_url gesetzt?');
      leiste.classList.remove('an');
      knopf.dataset.id = '';
      entferneRahmen();
    }
  };

  var schliesseOriginal = closeModal;
  closeModal = function () {
    schliesseOriginal();
    leiste.classList.remove('an');
    entferneRahmen();
  };
})();
