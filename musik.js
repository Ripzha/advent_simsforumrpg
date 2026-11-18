/* Musik und Hörstücke im Türchen. Fassung 7.

   Zwei getrennte Dinge in einer Datei:

   1. Musik zum Bild (Spalte musik_url)
      Unter dem Bild sitzt eine schmale Leiste. Links darin ein kleines Fenster,
      das genau den roten Play-Knopf von YouTube zeigt. Der Player ist in voller
      Grösse vorhanden, nur abgeschnitten. Dadurch drückt man YouTubes eigenen
      Knopf, und nur so startet der Ton zuverlässig.
      Gilt nur, wenn ein Bild sichtbar ist, nicht bei Video-Türchen.

   2. Hörstücke (Spalten audio_url und audio2_url)
      Eigene Tondateien aus dem Repo, als normale Abspieler unter dem Inhalt.
      Laufen auch dann, wenn im selben Türchen schon ein YouTube-Video steht.
      Namen wahlweise in audio_titel und audio2_titel.

   Beim Blättern und Schliessen wird alles angehalten. */
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
    /* Musikleiste mit dem ausgeschnittenen Play-Knopf */
    '.ak-musik { display: none; align-items: center; gap: 13px; margin: -4px 0 16px; padding: 9px 13px;',
    '  border: 1px solid var(--cream-tief); border-radius: 9px; background: rgba(216, 200, 154, 0.26); }',
    '.ak-musik.an { display: flex; }',
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
    '@media (max-width: 420px) { .ak-musik-hinweis { display: none; } }',
    /* Hörstücke */
    '.ak-hoer { display: none; flex-direction: column; gap: 10px; margin: 0 0 16px; }',
    '.ak-hoer.an { display: flex; }',
    '.ak-hoer-stueck { border: 1px solid var(--cream-tief); border-radius: 9px;',
    '  padding: 10px 12px 11px; background: rgba(216, 200, 154, 0.26); }',
    '.ak-hoer-name { display: block; font-family: var(--serif); font-style: italic;',
    '  font-size: 14.5px; color: var(--tinte-mittel); margin-bottom: 7px; }',
    '.ak-hoer-stueck audio { width: 100%; display: block; }'
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

  var hoer = document.createElement('div');
  hoer.className = 'ak-hoer';
  hoer.id = 'ak-hoer';
  leiste.insertAdjacentElement('afterend', hoer);

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

  function musikAus() {
    luke.innerHTML = '';           // leeren hält den Ton an
    leiste.classList.remove('an');
  }

  function musikAn(id, name) {
    titel.textContent = name;
    // controls=0 blendet die Bedienleiste aus, damit im Ausschnitt nur der Knopf steht
    luke.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id
      + '?rel=0&modestbranding=1&playsinline=1&controls=0&disablekb=1" '
      + 'title="Musik zum Bild" loading="lazy" '
      + 'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">'
      + '</iframe>';
    leiste.classList.add('an');
  }

  function hoerAus() {
    // Erst anhalten, dann entfernen — sonst spielt der Ton im Hintergrund weiter
    var alle = hoer.querySelectorAll('audio');
    for (var i = 0; i < alle.length; i++) {
      try { alle[i].pause(); alle[i].removeAttribute('src'); alle[i].load(); } catch (e) {}
    }
    hoer.innerHTML = '';
    hoer.classList.remove('an');
  }

  function hoerStueck(url, name) {
    var stueck = document.createElement('div');
    stueck.className = 'ak-hoer-stueck';
    var beschriftung = document.createElement('span');
    beschriftung.className = 'ak-hoer-name';
    beschriftung.textContent = name;
    var ton = document.createElement('audio');
    ton.controls = true;
    ton.preload = 'none';          // lädt erst beim Drücken, spart Daten auf dem Handy
    ton.src = url;
    // Immer nur ein Stück gleichzeitig
    ton.addEventListener('play', function () {
      var alle = hoer.querySelectorAll('audio');
      for (var i = 0; i < alle.length; i++) if (alle[i] !== ton) alle[i].pause();
    });
    ton.addEventListener('error', function () {
      console.warn('[musik] Tondatei nicht gefunden:', url);
      beschriftung.textContent = name + ' — Datei nicht gefunden';
    });
    stueck.appendChild(beschriftung);
    stueck.appendChild(ton);
    hoer.appendChild(stueck);
  }

  /* ---------- Einklinken in Modal auf und zu ---------- */
  var zeigeOriginal = showModal;
  showModal = function (tag) {
    zeigeOriginal(tag);
    musikAus();
    hoerAus();
    var daten = getTuerData(tag, modalState.tueren) || {};

    // 1. Musik zum Bild
    var roh = daten.musik_url || daten.musik || daten.lied_url || '';
    var id = musikId(roh);
    if (id) {
      if (bildRahmen.style.display === 'none') {
        console.warn('[musik] Musik vorhanden, aber kein Bild sichtbar — video_url gesetzt?');
      } else {
        musikAn(id, daten.musik_titel || daten.lied || 'Musik zum Bild');
      }
    }

    // 2. Hörstücke
    var eins = String(daten.audio_url || '').trim();
    var zwei = String(daten.audio2_url || '').trim();
    if (eins) hoerStueck(eins, String(daten.audio_titel || 'Hörstück').trim());
    if (zwei) hoerStueck(zwei, String(daten.audio2_titel || 'Teil 2').trim());
    if (eins || zwei) hoer.classList.add('an');
  };

  var schliesseOriginal = closeModal;
  closeModal = function () {
    schliesseOriginal();
    musikAus();
    hoerAus();
  };
})();
