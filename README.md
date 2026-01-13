# DeSync – Wenn dein Gehirn 20 Tabs offen hat

## Was ist das hier?

Hast du dich mal gefragt, wie es ist mit ADHS durch den Alltag zu gehen? Spoiler: Es ist wie wenn du versuchst Netflix zu schauen, während 47 Leute gleichzeitig auf dich einreden, dein Handy alle 3 Sekunden vibriert und im Hintergrund ein Feuerwerk abgeht.

Dieses Projekt ist eine VR-Simulation die zeigt, wie sich ADHS in drei verschiedenen Alltagssituationen anfühlt:

### 🎓 Hörsaal
Du sitzt in der Vorlesung und willst eigentlich aufpassen. Aber:
- Jemand klickt mit dem Stift (klick klick klick)
- WhatsApp Nachrichten kommen rein
- Leute flüstern
- Dein Gehirn zwingt dich wegzuschauen
- Prof redet über... warte, worüber ging's nochmal?

### 💻 Schreibtisch (Gaming Room)
Du willst eigentlich lernen/arbeiten, aber:
- Discord pingt
- YouTube empfiehlt dir Videos
- Steam lädt Updates
- Der PC-Lüfter ist SO LAUT
- War das die Tür? Nein? Egal, Fokus weg.

### 🛍️ Supermarkt
Einfach nur einkaufen. Sollte easy sein. Ist es nicht:
- Durchsagen
- Leute überall
- Kinder schreien
- Handy vibriert ("VERGISS DIE MILCH NICHT!")
- Kasse piept, Wagen rollen, Kühlregal brummt
- Was wollte ich nochmal kaufen?

## Wie funktioniert das technisch?

Das ganze ist gebaut mit:
- **A-Frame** (WebVR Framework) – damit die 3D-Welten laufen
- **Web Audio API** – Sounds werden als Audio-Dateien geladen/decoded (kein Synth-Oszillator-Noise mehr)
- **Vanilla JavaScript** – weil Frameworks overrated sind

Optional:
- **ESP32 Integration** – Hardware-Buttons steuern die Simulation (Touch 12, 13, 14) über `cc_sdk.min.js` (der Projektordner/Sketch ist nicht mehr im Repo)
### ESP32 Hardware (optional)
- **Touch Pin 12**: Intensität +
- **Touch Pin 13**: Intensität -
- **Touch Pin 14**: Ausschalten

Die Simulation hat **4 Intensitäts-Level** (0-3):
- **Level 0**: Aus (endlich Ruhe)
- **Level 1**: Leicht (alle paar Sekunden was)
- **Level 2**: Mittel (konstant nervig)
- **Level 3**: CHAOS (willkommen in meinem Gehirn)

### Das Geile: Kontextspezifische Ablenkungen

Jede Umgebung hat eigene Ablenkungen:
- **Schreibtisch**: Discord, YouTube, Steam, Gaming-Zeug
- **Hörsaal**: Prof-Mails, Moodle, Lerngruppen, Uni-Stress
- **Supermarkt**: Einkaufsliste, Payback, Kassengeräusche, Leute

Und das Wichtigste: **Deine Kamera wird zu den Ablenkungen GEZWUNGEN**. Du willst auf deine Aufgabe schauen, aber dein Blick wird einfach woanders hingezogen. Das ist der Fokusshift den ADHS-Leute ständig erleben.

## Schnellstart

**Option 1: VS Code Live Server** (easy mode)
1. Installier die **Live Server** Extension in VS Code
2. Öffne `landingpage.html`
3. Rechtsklick → **Open with Live Server**
4. Fertig, läuft

**Option 2: Einfach Datei öffnen**

Wichtig: Die Simulation nutzt ES-Module (Entry: `sim/app.js`). Öffne die HTML-Dateien deshalb **nicht** per Doppelklick als `file://...`, sonst blockt der Browser die Module und die Steuerung bleibt ohne Funktion.

Empfohlen: In VS Code die Extension **Live Server** nutzen und die gewünschte HTML-Datei über "Open with Live Server" öffnen.

## Steuerung

### Tastatur (ohne Hardware)

**Global (in allen Szenen über** [adhs_simulation.js](adhs_simulation.js)**):**
- **W**: Intensität runter
- **E**: Intensität hoch
- **Q**: Pause / Fortsetzen
- **G**: Nachgeben
- **R**: Refocus
- **Shift + V**: Debug (VR-HUD ohne Headset)

**Zusätzlich in** [desk.html](desk.html) **und** [hoersaal.html](hoersaal.html) **über das Overlay:**
- **+ / -**: Intensität hoch / runter
- **O**: Simulation An/Aus

**Zusätzlich in** [supermarkt.html](supermarkt.html) **(Legacy-Mapping):**
- **1 / 2 / 3**: Intensität + / Intensität - / Ausschalten

### VR-Brille
- Brille anschließen (Quest, Vive, etc.)
- "Enter VR" Button klicken
- Eintauchen ins Chaos

## Browser-Support

WebXR läuft am besten in:
- **Chrome/Edge** (Desktop)
- **Quest Browser** (wenn du eine Quest hast)
- Braucht HTTPS oder localhost (Live Server macht das automatisch)

## Projektstruktur (Stand: Januar 2026)

- **Einstieg:** [landingpage.html](landingpage.html)
- **Szenen:**
	- [desk.html](desk.html)
	- [hoersaal.html](hoersaal.html)
	- [supermarkt.html](supermarkt.html)
- **Core Logic:** [adhs_simulation.js](adhs_simulation.js)
- **Unified App Entry (JS):** [sim/app.js](sim/app.js) (UI + Bootstrap + Input in thematischen Blöcken)
- **VR Helper:** [vr.js](vr.js)
- **Styles:** [base.css](base.css), [landing.css](landing.css), [overlay.css](overlay.css)
- **Assets:** `Assets/` (Texturen & Sounds)


## Credits

Projekt von **Maximilian Wittwer** (Matrikelnummer: 287664)

Gebaut für Creative Coding 1 – weil ADHS endlich mal sichtbar gemacht werden sollte.

---

**Hinweis**: Das ist keine medizinische Diagnose-App. Nur eine Simulation um Leuten zu zeigen wie überwältigend ADHS sein kann. Wenn du denkst du hast ADHS, geh zum Arzt, nicht zu meiner VR-App 😅