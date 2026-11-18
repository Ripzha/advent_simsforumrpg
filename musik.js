/* Musik zum Bild. Fassung 6.
   Türchen mit Bild und Lied: unter dem Bild steht eine schmale Leiste.
   Links darin sitzt ein kleines Fenster, das genau den roten Play-Knopf
   von YouTube zeigt. Der Player selbst ist in voller Grösse vorhanden,
   nur eben abgeschnitten. Dadurch drückt man YouTubes eigenen Knopf,
   und das ist der einzige Weg, auf dem der Ton zuverlässig startet.
   Ein zweiter Druck auf dasselbe Fenster hält die Musik wieder an.

   Aktiv wird die Leiste, sobald in der Türchen-Zeile die Spalte musik_url
   gefüllt ist. video_url bleibt unberührt und zeigt weiterhin das Video. */
(function () {
  var bildRahmen = document.getElementById('ak-modal-image-rahmen');
  if (!bildRahmen || typeof showModal !== 'function') {
    console.warn('[musik] Einstieg nicht gefunden.');
    return;
  }

  // Masse des Ausschnitts und des dahinterliegenden Players
  var FENSTER_B = 92, FENSTER_H = 58;
  var PLAYER_B = 480, PLAYER_H = 270;

  /* ---------- Aussehen ---------- */
  var stil = document.createElement('style');
  stil.textContent = [
    '.ak-musik { display: none; align-items: center; gap: 13px; margin: -4px 0 16px; padding: 9px 13px;',
    '  border: 1px solid var(--cream-tief); border-radius: 9px; background: rgba(216, 200, 154, 0.26); }',
    '.ak-musik.an { display: flex; }',
    /* Das Guckloch auf den Play-Knopf */
    '.ak-musik-luke { flex: none; position: relative; overflow: hidden; border-radius: 7px;',
    '  width: ' + FENSTER_B + 'px; height: ' + FENSTER_H + 'px; background: #0a1220;',
    '  border: 1px solid var(--cream-tief); }',
    '.ak-musik-luke iframe { position: absolute; border: 0; display: block;',
    '  width: ' + PLAYER_B + 'px; height: ' + PLAYER_H + 'px;',
    '  left: ' + Math.round((FENSTER_B - PLAYER_B) / 2) + 'px;',
    '  top: ' + Math.round((FENSTER_H - PLAYER_H) / 2) + 'px; }',
    '.ak-musik-text { flex: 1; min-width: 0; }',
    '.ak-musik-titel { display: block; font-family: var(--serif); font-style: italic;',
    '  font-size: 14.5px; color: var(--tinte-mittel);',
    '  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.ak-musik-hinweis { display: block; font-size: 11.5px; color: var(--tinte-hell); margin-top: 2px; }',
    '@media (max-width: 420px) { .ak-musik-hinweis { display: none; } }'
  ].join('\n');
  document.head.appendChild(stil);

  /* ---------- Bausteine ---------- */
  var leiste = document.createElement('div');
  leiste.className = 'ak-musik';
  leiste.id = 'ak-musik';
  leiste.innerHTML =
    '<div class="ak-musik-luke" id="ak-musik-luke"></div>' +
    '<span class="ak-musik-text">' +
      '<span class="ak-musik-titel" id="ak-musik-titel"></span>' +
      '<span class="ak-musik-hinweis">Auf den Knopf drücken, dann läuft die Musik zum Bild.</span>' +
    '</span>';
  bildRahmen.insertAdjacentElement('afterend', leiste);

  var luke = document.getElementById('ak-musik-luke');
  var titel = document.getElementById('ak-musik-titel');

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

  function aus() {
    luke.innerHTML = '';           // leeren hält den Ton an
    leiste.classList.remove('an');
  }

  function an(id, name) {
    titel.textContent = name;
    // controls=0 blendet die Bedienleiste aus, damit im Ausschnitt nur der Knopf steht
    luke.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id
      + '?rel=0&modestbranding=1&playsinline=1&controls=0&disablekb=1" '
      + 'title="Musik zum Bild" loading="lazy" '
      + 'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">'
      + '</iframe>';
    leiste.classList.add('an');
  }

  /* ---------- Einklinken in Modal auf und zu ---------- */
  var zeigeOriginal = showModal;
  showModal = function (tag) {
    zeigeOriginal(tag);
    aus();   // beim Blättern immer erst zumachen, sonst läuft der Ton weiter
    var daten = getTuerData(tag, modalState.tueren) || {};
    var roh = daten.musik_url || daten.musik || daten.lied_url || '';
    var id = musikId(roh);
    if (!id) return;
    if (bildRahmen.style.display === 'none') {
      console.warn('[musik] Musik vorhanden, aber kein Bild sichtbar — video_url gesetzt?');
      return;
    }
    an(id, daten.musik_titel || daten.lied || 'Musik zum Bild');
  };

  var schliesseOriginal = closeModal;
  closeModal = function () {
    schliesseOriginal();
    aus();
  };
})();
