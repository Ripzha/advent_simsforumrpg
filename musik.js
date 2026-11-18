/* Musik zum Bild. Fassung 5.
   Türchen mit Bild und Lied: unter dem Bild steht der Player im Papierrahmen
   des Kalenders, darüber eine Zeile mit dem Namen des Liedes.
   Aktiv wird das, sobald in der Türchen-Zeile die Spalte musik_url gefüllt ist.
   video_url bleibt unberührt und zeigt weiterhin das Video (Hymne).

   Warum so und nicht unsichtbar mit eigenem Knopf:
   Browser lassen Ton nicht von allein starten, und einen fremden Player
   von aussen zu steuern verweigern sie ebenfalls. YouTubes eigener
   Play-Knopf ist der einzige Weg, der immer funktioniert. */
(function () {
  var bildRahmen = document.getElementById('ak-modal-image-rahmen');
  if (!bildRahmen || typeof showModal !== 'function') {
    console.warn('[musik] Einstieg nicht gefunden.');
    return;
  }

  /* ---------- Aussehen ---------- */
  var stil = document.createElement('style');
  stil.textContent = [
    '.ak-musik-zeile { display: none; align-items: baseline; gap: 7px; margin: -6px 0 7px;',
    '  font-family: var(--serif); font-size: 13.5px; font-style: italic; color: var(--tinte-hell); }',
    '.ak-musik-zeile.an { display: flex; }',
    '.ak-musik-note { font-style: normal; flex: none; }',
    '.ak-musik-titel { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.ak-musik-rahmen { display: none; border: 1px solid var(--cream-tief); border-radius: 8px;',
    '  padding: 5px; background: #fff8ea; margin-bottom: 16px; }',
    '.ak-musik-rahmen.an { display: block; }',
    '.ak-musik-box { position: relative; width: 100%; padding-top: 56.25%;',
    '  border-radius: 5px; overflow: hidden; background: #0a1220; }',
    '.ak-musik-box iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; display: block; }'
  ].join('\n');
  document.head.appendChild(stil);

  /* ---------- Bausteine ---------- */
  var zeile = document.createElement('p');
  zeile.className = 'ak-musik-zeile';
  zeile.id = 'ak-musik-zeile';
  zeile.innerHTML = '<span class="ak-musik-note" aria-hidden="true">♪</span>'
    + '<span class="ak-musik-titel" id="ak-musik-titel"></span>';

  var rahmen = document.createElement('div');
  rahmen.className = 'ak-musik-rahmen';
  rahmen.id = 'ak-musik-rahmen';
  rahmen.innerHTML = '<div class="ak-musik-box" id="ak-musik-box"></div>';

  bildRahmen.insertAdjacentElement('afterend', rahmen);
  bildRahmen.insertAdjacentElement('afterend', zeile);

  var box = document.getElementById('ak-musik-box');
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
    box.innerHTML = '';          // leeren hält den Ton an
    rahmen.classList.remove('an');
    zeile.classList.remove('an');
  }

  function an(id, name) {
    titel.textContent = name;
    zeile.classList.add('an');
    box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id
      + '?rel=0&modestbranding=1&playsinline=1" title="Musik zum Bild" loading="lazy" '
      + 'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" '
      + 'allowfullscreen></iframe>';
    rahmen.classList.add('an');
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
