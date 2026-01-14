// =============================================================
// VR / WebXR Hilfsfunktionen
// - Start-VR Button (enterVR)
// - Optional: Pointer-Lock für Desktop (wenn look-controls es erlaubt)
// - Optional: Komfort/Experiment-Komponente "return-to-start"
// =============================================================

// -------------------------------------------------------------
// Initialisierung (DOM ready)
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('a-scene');
  if (!scene) return;

  const vrBtn = document.getElementById('start-vr');
  if (vrBtn) {
    vrBtn.addEventListener('click', () => {
      enterVr(scene); // startet WebXR-Session (wenn verfügbar)

      // Fallback: Starthinweis direkt beim Klick anstoßen (enter-vr Event kommt je nach Browser verzögert).
      try {
        if (window.adhs && typeof window.adhs.showVrStartHint === 'function') {
          setTimeout(() => window.adhs.showVrStartHint({ autoHideMs: 6500 }), 250);
        }
      } catch (e) {}

      // Desktop-Mouselook: PointerLock sofort im Click-Handler anfordern.
      // Dadurch verschwindet der Mauszeiger und Umschauen klappt „überall“.
      if (hasPointerLock()) requestPointerLockSoon(scene); // Desktop: Maus „capturen“ für Mouselook
    });
  }

  if (hasPointerLock()) enablePointerLock(scene);

  // Sauberer Rückweg: wenn VR endet, PointerLock lösen.
  scene.addEventListener('exit-vr', () => {
    try {
      if (document.exitPointerLock) document.exitPointerLock();
    } catch (e) {
      // ignorieren
    }
  });
});

function requestPointerLockSoon(scene) {
  const tryLock = () => {
    if (!scene?.canvas) return false;
    if (document.pointerLockElement === scene.canvas) return true;
    if (!scene.canvas.requestPointerLock) return false;
    try {
      // PointerLock braucht meist einen User-Click (wir sind hier im Click-Handler / kurz danach).
      scene.canvas.requestPointerLock();
      return true;
    } catch (e) {
      return false;
    }
  };

  // Canvas existiert erst nach renderstart.
  if (scene?.hasLoaded && scene.canvas) {
    tryLock();
    return;
  }

  scene?.addEventListener?.('renderstart', () => {
    tryLock();
    setTimeout(tryLock, 50);
    setTimeout(tryLock, 250);
  }, { once: true });
}

// -------------------------------------------------------------
// Optionales Komfort-/Experiment-Feature:
// Rig bleibt auf Startposition und hält die Blickrichtung stabil,
// indem die Kopf-Yaw durch Gegenrotation des Rigs kompensiert wird.
// Hinweis: Das kann sich in VR unnatürlich anfühlen.
// -------------------------------------------------------------
if (typeof AFRAME !== 'undefined' && AFRAME?.registerComponent) {
  AFRAME.registerComponent('return-to-start', {
    schema: {
      enabled: { default: true },
      lockPosition: { default: true },
      lockWorldYaw: { default: true },
      strength: { default: 0.35 }, // 0..1 (1 = sofort)
      deadzoneDeg: { default: 0.0 }
    },

    init() {
      this.startPos = this.el.object3D.position.clone();
      this.startRot = this.el.object3D.rotation.clone();
      this.cameraEl = this.el.querySelector('[camera]') || null;
      this._deadzoneRad = THREE.MathUtils.degToRad(this.data.deadzoneDeg);
    },

    update() {
      this._deadzoneRad = THREE.MathUtils.degToRad(this.data.deadzoneDeg);
    },

    tick() {
      if (!this.data.enabled) return;

      if (this.data.lockPosition) {
        this.el.object3D.position.copy(this.startPos);
      }

      if (!this.data.lockWorldYaw || !this.cameraEl) return;

      // cameraEl.rotation ist lokal unter dem Rig (Head pose / look-controls)
      const headYaw = wrapRad(this.cameraEl.object3D.rotation.y);
      if (Math.abs(headYaw) <= this._deadzoneRad) {
        // sanft zurück zur Start-Yaw
        this.el.object3D.rotation.y = lerpAngleRad(this.el.object3D.rotation.y, this.startRot.y, this.data.strength);
        this.el.object3D.rotation.x = this.startRot.x;
        this.el.object3D.rotation.z = this.startRot.z;
        return;
      }

      const targetYaw = wrapRad(this.startRot.y - headYaw);
      this.el.object3D.rotation.y = lerpAngleRad(this.el.object3D.rotation.y, targetYaw, this.data.strength);
      this.el.object3D.rotation.x = this.startRot.x;
      this.el.object3D.rotation.z = this.startRot.z;
    }
  });

  function wrapRad(rad) {
    let r = rad;
    while (r > Math.PI) r -= Math.PI * 2;
    while (r < -Math.PI) r += Math.PI * 2;
    return r;
  }

  function lerpAngleRad(current, target, alpha) {
    const c = wrapRad(current);
    const t = wrapRad(target);
    let delta = wrapRad(t - c);
    return wrapRad(c + delta * THREE.MathUtils.clamp(alpha, 0, 1));
  }
}

function enterVr(scene) {
  // Startet WebXR (wenn verfügbar) – bevorzugt über die aktuelle Scene.
  // Hinweis: In Desktop ohne Headset kann das trotzdem „VR Mode“ auslösen (Magic Window).
  try {
    if (scene?.enterVR) {
      scene.enterVR();
      tryPlayDomOverlayAmbience(); // Audio starten, weil hier die Autoplay-Policy „entsperrt“ ist
      return;
    }
    if (AFRAME?.scenes?.[0]) {
      AFRAME.scenes[0].enterVR();
      tryPlayDomOverlayAmbience();
      return;
    }
  } catch (err) {
    console.warn('VR Start failed:', err);
  }
  alert('VR nicht verfügbar.');
}

function tryPlayDomOverlayAmbience() {
  // Manche Szenen nutzen ein leises Ambient-Track.
  // Wegen Autoplay-Policies wird Audio nur direkt durch den Start-VR Klick gestartet.
  try {
    const candidates = document.querySelectorAll('[data-play-on-vr="1"]');
    candidates.forEach((el) => {
      const cmp = el?.components?.sound;
      if (cmp?.playSound) cmp.playSound();
    });
  } catch (e) {
    // ignorieren
  }
}

function hasPointerLock() {
  // Prüft, ob look-controls PointerLock explizit erlaubt.
  const els = document.querySelectorAll('[look-controls]');
  for (const el of els) {
    const cfg = el.getAttribute('look-controls');
    if (cfg?.includes('pointerLockEnabled: true')) return true;
  }
  return false;
}

function enablePointerLock(scene) {
  // Aktiviert PointerLock nur im Desktop-Modus (Click auf Canvas).
  const attach = () => {
    if (!scene.canvas) return;
    scene.canvas.addEventListener('click', () => {
      if (document.pointerLockElement !== scene.canvas && scene.canvas.requestPointerLock) {
        try {
          scene.canvas.requestPointerLock();
        } catch (e) {
          // PointerLock nicht unterstützt
        }
      }
    });
  };

  if (scene.hasLoaded && scene.canvas) {
    attach();
  } else {
    scene.addEventListener('renderstart', attach, { once: true });
  }
}
