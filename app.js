// DeSync / ADHS Simulation – Unified App Entry (ES Module)
// =============================================================
// Zweck
// - Hält die bisher verteilten Module zusammen:
//   - Landing UI (Modal + Navigation)
//   - Scene UI (Overlay-Controls + Level-Anzeige + Self-Check)
//   - Bootstrap (window.adhs erstellen, HUD/Intro installieren)
//   - Input (Keyboard + ESP32 Touch Handler)
//
// Hinweis
// - Dieses File ist bewusst "side-effecty" (installiert Listener beim Laden).
// - Alte Entry-Files (bootstrap.js/page-ui.js/landing.js) können auf dieses verweisen.
// =============================================================

import { ADHSSimulation } from './adhs_simulation.js';

// =============================================================
// Block: Guards / Mini-Utilities
// =============================================================

const APP_GUARD_KEY = '__DESYNC_APP_INSTALLED__';

function safeGetSearch() {
	try {
		return String(window.location?.search || '');
	} catch (e) {
		return '';
	}
}

function hasUrlFlag(name) {
	try {
		const params = new URLSearchParams(safeGetSearch());
		const v = params.get(name);
		if (v === null) return false;
		return v === '1' || v === 'true' || v === '';
	} catch (e) {
		return false;
	}
}

function isDebugEnabled() {
	return hasUrlFlag('debug') || hasUrlFlag('dbg');
}

function onceGlobal(key, fn) {
	try {
		if (window[key]) return;
		window[key] = true;
	} catch (e) {
		// If window is not writable, we still try to run once per module instance.
	}
	fn();
}

// =============================================================
// Block: Landingpage UI (Modal + Navigation)
// =============================================================

function installScenarioButtons() {
	// Buttons nutzen data-href, damit das HTML ohne Inline-JS auskommt
	document.querySelectorAll('[data-href]').forEach((el) => {
		el.addEventListener('click', () => {
			const href = el.getAttribute('data-href');
			if (href) location.href = href;
		});
	});
}

function installEduModal() {
	// Einfaches (semi-)accessibles Modal (aria-hidden + Escape zum Schließen)
	const modal = document.getElementById('edu-modal');
	const openBtn = document.getElementById('edu-open');
	const closeBtn = document.getElementById('edu-close');
	if (!modal || !openBtn || !closeBtn) return;

	function open() {
		modal.classList.add('is-open');
		modal.setAttribute('aria-hidden', 'false');
		try {
			document.body.classList.add('modal-open');
		} catch (e) {}
	}
	function close() {
		modal.classList.remove('is-open');
		modal.setAttribute('aria-hidden', 'true');
		try {
			document.body.classList.remove('modal-open');
		} catch (e) {}
	}

	openBtn.addEventListener('click', open);
	closeBtn.addEventListener('click', close);
	modal.addEventListener('click', (e) => {
		// Klick auf Backdrop schließt das Modal
		const t = e.target;
		if (t && t.getAttribute && t.getAttribute('data-close') === 'true') close();
	});
	window.addEventListener(
		'keydown',
		(e) => {
			if (!modal.classList.contains('is-open')) return;
			if (e.key === 'Escape') {
				e.preventDefault();
				close();
			}
		},
		true
	);
}

function installLandingUiIfPresent() {
	// Landing ist "optional": wenn Elemente fehlen, passiert nichts.
	installScenarioButtons();
	installEduModal();
}

// =============================================================
// Block: Scene DOM-Overlay UI (Controls + Anzeige)
// =============================================================

function getAdhs() {
	return typeof window !== 'undefined' && window.adhs ? window.adhs : null;
}

function setText(el, text) {
	if (!el) return;
	el.textContent = text;
}

function updateLevelDisplay() {
	const levelSpan = document.getElementById('adhs-level');
	if (!levelSpan) return;

	const adhs = getAdhs();
	const levelNames = ['Aus', 'Leicht', 'Mittel', 'Stark'];
	const levelColors = ['#10b981', '#fbbf24', '#f59e0b', '#ef4444'];

	if (!adhs || !adhs.active || adhs.paused) {
		setText(levelSpan, levelNames[0]);
		levelSpan.style.color = levelColors[0];
		return;
	}

	const lvl = Math.max(0, Math.min(3, Number(adhs.distractionLevel || 0)));
	setText(levelSpan, levelNames[lvl] || levelNames[0]);
	levelSpan.style.color = levelColors[lvl] || levelColors[0];
}

function installAdhsControls() {
	const plusBtn = document.getElementById('adhs-btn-plus');
	const minusBtn = document.getElementById('adhs-btn-minus');
	const toggleBtn = document.getElementById('adhs-btn-toggle');
	const giveInBtn = document.getElementById('adhs-btn-givein');
	const refocusBtn = document.getElementById('adhs-btn-refocus');
	const hideBtn = document.getElementById('adhs-btn-hide');

	if (plusBtn) {
		plusBtn.addEventListener('click', () => {
			const adhs = getAdhs();
			if (!adhs) return;
			if (adhs.distractionLevel < 3) adhs.start(adhs.distractionLevel + 1);
			adhs.paused = false;
		});
	}

	if (minusBtn) {
		minusBtn.addEventListener('click', () => {
			const adhs = getAdhs();
			if (!adhs) return;
			if (adhs.distractionLevel > 0) adhs.start(adhs.distractionLevel - 1);
		});
	}

	if (toggleBtn) {
		toggleBtn.addEventListener('click', () => {
			const adhs = getAdhs();
			if (!adhs) return;
			if (adhs.active && !adhs.paused) {
				adhs.paused = true;
				adhs.stop();
				return;
			}
			const level = adhs.distractionLevel && adhs.distractionLevel > 0 ? adhs.distractionLevel : 1;
			adhs.start(level);
			adhs.paused = false;
		});
	}

	if (giveInBtn) {
		giveInBtn.addEventListener('click', () => {
			const adhs = getAdhs();
			if (!adhs || typeof adhs.handleUserGaveIn !== 'function') return;
			adhs.handleUserGaveIn({ type: 'manual', label: 'Nachgegeben', severity: 1.0 });
		});
	}

	if (refocusBtn) {
		refocusBtn.addEventListener('click', () => {
			const adhs = getAdhs();
			if (!adhs || typeof adhs.handleUserRefocus !== 'function') return;
			adhs.handleUserRefocus();
		});
	}

	if (hideBtn) {
		hideBtn.addEventListener('click', () => {
			const panel = document.getElementById('adhs-controls');
			if (panel) panel.style.display = 'none';
		});
	}
}

function installKeyboardShortcuts() {
	window.addEventListener('keydown', (e) => {
		const k = String(e.key || '');

		if (k === '+' || k === '=') {
			const btn = document.getElementById('adhs-btn-plus');
			if (btn) btn.click();
			return;
		}

		if (k === '-') {
			const btn = document.getElementById('adhs-btn-minus');
			if (btn) btn.click();
			return;
		}

		if (k.toLowerCase() === 'o') {
			const btn = document.getElementById('adhs-btn-toggle');
			if (btn) btn.click();
			return;
		}

		if (k.toLowerCase() === 'g') {
			const btn = document.getElementById('adhs-btn-givein');
			if (btn) btn.click();
			return;
		}

		if (k.toLowerCase() === 'r') {
			const btn = document.getElementById('adhs-btn-refocus');
			if (btn) btn.click();
			return;
		}

		if (k.toLowerCase() === 'h') {
			const panel = document.getElementById('adhs-controls');
			if (!panel) return;
			panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
		}
	});
}

function installBootstrapSelfCheck() {
	window.addEventListener('load', () => {
		setTimeout(() => {
			if (window.adhs) return;

			const host = document.getElementById('ui-overlay') || document.body;
			if (!host) return;

			const msg = document.createElement('div');
			msg.style.cssText =
				'position:fixed; left:12px; right:12px; bottom:12px; z-index:99999; padding:12px 14px; border-radius:10px; background:rgba(239,68,68,.92); color:#fff; font:14px/1.35 system-ui,Segoe UI,Roboto,sans-serif; box-shadow:0 10px 25px rgba(0,0,0,.25)';
			const errTxt =
				window.adhsInitError && (window.adhsInitError.message || String(window.adhsInitError))
					? '<br><br><strong>Init-Fehler:</strong><br><code style="white-space:pre-wrap">' +
						(window.adhsInitError.message || String(window.adhsInitError)) +
						'</code>'
					: '';
			msg.innerHTML =
				'Simulation wurde nicht initialisiert (window.adhs fehlt).<br><strong>Bitte über einen lokalen Server öffnen</strong> (z.B. VS Code Live Server).<br>Aktuelles Protokoll: <code>' +
				String(location.protocol) +
				'</code>' +
				errTxt;
			host.appendChild(msg);

			const debug = isDebugEnabled();
			const payload = { protocol: location.protocol, href: location.href };
			if (debug) {
				console.log('[ADHS][debug] Bootstrap nicht geladen. Öffne die Seite über http:// statt file://', payload);
			} else {
				console.warn('[ADHS] Bootstrap nicht geladen. Öffne die Seite über http:// statt file://', payload);
			}
		}, 1200);
	});
}

function installSceneUiIfPresent() {
	// Scene UI nur installieren, wenn wir wirklich auf einer Scene-Page sind.
	// Landingpage hat absichtlich kein window.adhs und soll keine Warnung spammen.
	const isScenePage =
		!!document.querySelector('a-scene') ||
		!!document.getElementById('adhs-controls') ||
		(document.body && document.body.classList && document.body.classList.contains('scene-page'));

	if (!isScenePage) return;

	installScenarioButtons();
	installAdhsControls();
	installKeyboardShortcuts();
	installBootstrapSelfCheck();
	updateLevelDisplay();
	setInterval(updateLevelDisplay, 250);

	// Input-Modul erwartet diesen Hook teilweise (ESP32/Keyboard updates)
	try {
		window.updateLevelDisplay = updateLevelDisplay;
	} catch (e) {}
}

// =============================================================
// Block: Input (Keyboard + ESP32)
// =============================================================

let inputInstalled = false;

export function installInput(adhs) {
	if (inputInstalled) return;
	inputInstalled = true;

	// ESP32: cc_sdk erwartet globale handler-Funktionen.
	try {
		window.handleTouch12 = function handleTouch12() {
			if (!window.adhs) return;
			let newLevel = window.adhs.distractionLevel + 1;
			if (newLevel > 3) newLevel = 3;
			window.adhs.start(newLevel);
			console.log(`[ESP32] Intensität erhöht auf: ${['Aus', 'Leicht', 'Mittel', 'Stark'][newLevel]}`);
		};

		window.handleTouch13 = function handleTouch13() {
			if (!window.adhs) return;
			let newLevel = window.adhs.distractionLevel - 1;
			if (newLevel < 0) newLevel = 0;
			window.adhs.start(newLevel);
			if (newLevel === 0 && typeof window.updateLevelDisplay === 'function') {
				setTimeout(() => window.updateLevelDisplay(), 50);
			}
			console.log(`[ESP32] Intensität verringert auf: ${['Aus', 'Leicht', 'Mittel', 'Stark'][newLevel]}`);
		};

		window.handleTouch14 = function handleTouch14() {
			if (!window.adhs) return;
			window.adhs.stop();
			console.log('[ESP32] Simulation ausgeschaltet');
			if (typeof window.updateLevelDisplay === 'function') {
				setTimeout(() => window.updateLevelDisplay(), 50);
			}
		};

		window.handleTouch27 = function handleTouch27() {};
		window.handleTouch32 = function handleTouch32() {};
		window.handleTouch33 = function handleTouch33() {};
	} catch (e) {
		// ESP32 ist optional
	}

	// Tastatursteuerung
	window.addEventListener(
		'keydown',
		(e) => {
			if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) return;
			if (e.repeat) return;
			if (!window.adhs) return;

			// Debug: VR-HUD ohne Headset togglen
			if (e.shiftKey && e.key && e.key.toLowerCase() === 'v') {
				if (typeof window.adhs.toggleVrHudDebug === 'function') {
					window.adhs.toggleVrHudDebug();
					console.log(`[Debug] VR HUD: ${window.adhs._vrHudDebug ? 'AN' : 'AUS'}`);
				}
				return;
			}

			switch (e.key.toLowerCase()) {
				case '1':
					if (typeof window.handleTouch12 === 'function') {
						window.handleTouch12();
						if (typeof window.updateLevelDisplay === 'function') setTimeout(() => window.updateLevelDisplay(), 50);
					}
					break;
				case '2':
					if (typeof window.handleTouch13 === 'function') {
						window.handleTouch13();
						if (typeof window.updateLevelDisplay === 'function') setTimeout(() => window.updateLevelDisplay(), 50);
					}
					break;
				case '3':
					if (typeof window.handleTouch14 === 'function') {
						window.handleTouch14();
						if (typeof window.updateLevelDisplay === 'function') setTimeout(() => window.updateLevelDisplay(), 50);
					}
					break;
				case 'g':
					if (typeof window.adhs.handleUserGaveIn === 'function') {
						window.adhs.handleUserGaveIn({ type: 'manual', label: 'Handy/Tab wechseln', severity: 1.0 });
						console.log('[Tastatur] Nachgegeben (G)');
					}
					break;
				case 'r':
					if (typeof window.adhs.handleUserRefocus === 'function') {
						window.adhs.handleUserRefocus();
						console.log('[Tastatur] Refocus (R)');
					}
					break;
				case 'q':
					if (window.adhs.active && !window.adhs.paused) {
						window.adhs.paused = true;
						window.adhs.stop();
						if (typeof window.updateLevelDisplay === 'function') setTimeout(() => window.updateLevelDisplay(), 50);
						console.log('[Tastatur] Simulation pausiert');
					} else if (!window.adhs.active && window.adhs.paused) {
						window.adhs.start(window.adhs.distractionLevel);
						window.adhs.paused = false;
						if (typeof window.updateLevelDisplay === 'function') setTimeout(() => window.updateLevelDisplay(), 50);
						console.log('[Tastatur] Simulation fortgesetzt');
					}
					break;
				case 'w':
					if (window.adhs.distractionLevel > 0) {
						window.adhs.start(window.adhs.distractionLevel - 1);
						if (typeof window.updateLevelDisplay === 'function') setTimeout(() => window.updateLevelDisplay(), 50);
						console.log(
							`[Tastatur] Intensität verringert auf: ${['Aus', 'Leicht', 'Mittel', 'Stark'][window.adhs.distractionLevel - 1]}`
						);
					}
					break;
				case 'e':
					if (window.adhs.distractionLevel < 3) {
						window.adhs.start(window.adhs.distractionLevel + 1);
						if (typeof window.updateLevelDisplay === 'function') setTimeout(() => window.updateLevelDisplay(), 50);
						console.log(
							`[Tastatur] Intensität erhöht auf: ${['Aus', 'Leicht', 'Mittel', 'Stark'][window.adhs.distractionLevel + 1]}`
						);
					}
					break;
			}
		},
		true
	);

	// Erste User-Geste entsperrt Audio
	document.addEventListener(
		'pointerdown',
		() => {
			if (window.adhs && typeof window.adhs.unlockAudio === 'function') {
				window.adhs.unlockAudio();
			}
		},
		{ once: true, passive: true }
	);
}

// =============================================================
// Block: Bootstrap (window.adhs)
// =============================================================

function ensureInstance() {
	try {
		window.adhsInitError = null;
	} catch (e) {}

	// Globale Klasse für Debug/Legacy
	try {
		if (typeof window.ADHSSimulation === 'undefined') {
			window.ADHSSimulation = ADHSSimulation;
		}
	} catch (e) {}

	try {
		if (typeof window.adhs === 'undefined') {
			window.adhs = new ADHSSimulation();
		}
	} catch (e) {
		try {
			window.adhsInitError = e;
		} catch (err) {}
		if (isDebugEnabled()) console.log('[ADHS][debug] Failed to initialize simulation instance', e);
		else console.warn('[ADHS] Failed to initialize simulation instance');
		return;
	}

	try {
		installInput(window.adhs);
	} catch (e) {
		if (isDebugEnabled()) console.log('[ADHS][debug] Failed to install input handlers', e);
		else console.warn('[ADHS] Failed to install input handlers');
	}

	// Simulation startet mit Aus
	try {
		window.adhs.stop();
	} catch (e) {}

	// VR HUD / Intro
	try {
		if (window.adhs && typeof window.adhs.installVrHudOnce === 'function') window.adhs.installVrHudOnce();
		if (window.adhs && typeof window.adhs.installSceneIntroOnce === 'function') window.adhs.installSceneIntroOnce();
	} catch (e) {}

	// Optional: Debug-HUD via URL einschalten (ohne Headset)
	try {
		const params = new URLSearchParams(safeGetSearch());
		const debugHud = params.get('debugHud') || params.get('hud');
		if ((debugHud === '1' || debugHud === 'true') && window.adhs && typeof window.adhs.setVrHudDebugEnabled === 'function') {
			window.adhs.setVrHudDebugEnabled(true);
			console.log('[Debug] VR HUD per URL aktiviert');
		}
	} catch (e) {}

	console.log('🎮 ADHS Simulation bereit');
}

function installBootstrapIfScenePresent() {
	// Nur bootstrappen, wenn eine A-Frame Scene vorhanden ist.
	if (!document.querySelector('a-scene')) return;

	// Als Module ist Script sowieso defer; wir warten trotzdem auf load,
	// damit A-Frame Scene/DOM sicher da ist.
	window.addEventListener('load', () => {
		ensureInstance();
	});
}

// =============================================================
// Block: Unified Entry
// =============================================================

function installAll() {
	installLandingUiIfPresent();
	installSceneUiIfPresent();
	installBootstrapIfScenePresent();
}

// Exportiert für Legacy-Imports/Tests
export { updateLevelDisplay };

// Installiert alles genau einmal pro Page Load
onceGlobal(APP_GUARD_KEY, () => {
	document.addEventListener('DOMContentLoaded', () => {
		installAll();
	});
});
