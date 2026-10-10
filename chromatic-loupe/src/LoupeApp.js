import { SceneRenderer } from './SceneRenderer.js';
import { DisplacementMap } from './DisplacementMap.js';
import { LensRenderer } from './LensRenderer.js';
import { PointerTracker } from './PointerTracker.js';

export class LoupeApp {
  static LENS_SIZE = 220;
  static BULGE_POWER = 1.55;
  static CHROMA_STRENGTH = 4.5;
  static MAG_MIN = 1.5;
  static MAG_MAX = 4.5;
  static MAG_DEFAULT = 2.4;
  static STIFFNESS = 0.1;
  static DAMPING = 0.72;
  static IDLE_STIFFNESS = 0.02;
  static IDLE_DAMPING = 0.9;

  constructor({ stage, sceneCanvas, lensElement, lensCanvas, glareElement, zoomLabel }) {
    this.stage = stage;
    this.lensElement = lensElement;
    this.glareElement = glareElement;
    this.zoomLabel = zoomLabel;

    this.scene = new SceneRenderer(sceneCanvas);
    this.lens = new LensRenderer(lensCanvas, LoupeApp.LENS_SIZE);
    this.displacement = new DisplacementMap(LoupeApp.LENS_SIZE, LoupeApp.BULGE_POWER, LoupeApp.CHROMA_STRENGTH);
    this.pointer = new PointerTracker(stage);

    this.magnification = LoupeApp.MAG_DEFAULT;
    this.focusX = 0;
    this.focusY = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.time = 0;
    this.frame = null;
    this.running = false;
    this.needsDisplacementRebuild = true;

    this.tick = this.tick.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleResize = this.handleResize.bind(this);

    stage.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('resize', this.handleResize);
  }

  handleWheel(event) {
    event.preventDefault();
    const next = this.magnification - event.deltaY * 0.0022;
    this.magnification = Math.min(LoupeApp.MAG_MAX, Math.max(LoupeApp.MAG_MIN, next));
    this.zoomLabel.textContent = `${this.magnification.toFixed(1)}×`;
    this.needsDisplacementRebuild = true;
  }

  handleResize() {
    if (this.running) this.resize();
  }

  resize() {
    const rect = this.scene.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    this.scene.resize(rect.width, rect.height);
    this.focusX = rect.width / 2;
    this.focusY = rect.height / 2;
    this.displacement.build(this.magnification);
    this.needsDisplacementRebuild = false;
    return true;
  }

  idleTarget() {
    const { width, height } = this.scene;
    return [
      width / 2 + Math.cos(this.time * 0.35) * width * 0.16,
      height / 2 + Math.sin(this.time * 0.5) * height * 0.14,
    ];
  }

  updateFocus() {
    let targetX, targetY, stiffness, damping;

    if (this.pointer.active) {
      targetX = this.pointer.x;
      targetY = this.pointer.y;
      stiffness = LoupeApp.STIFFNESS;
      damping = LoupeApp.DAMPING;
    } else {
      [targetX, targetY] = this.idleTarget();
      stiffness = LoupeApp.IDLE_STIFFNESS;
      damping = LoupeApp.IDLE_DAMPING;
    }

    this.velocityX = (this.velocityX + (targetX - this.focusX) * stiffness) * damping;
    this.velocityY = (this.velocityY + (targetY - this.focusY) * stiffness) * damping;
    this.focusX += this.velocityX;
    this.focusY += this.velocityY;
  }

  updatePresentation() {
    this.lensElement.style.transform = `translate(${this.focusX}px, ${this.focusY}px)`;
    const speed = Math.min(30, Math.hypot(this.velocityX, this.velocityY));
    if (speed <= 0.4) return;
    const angle = Math.atan2(this.velocityY, this.velocityX) * (180 / Math.PI);
    this.glareElement.style.setProperty('--glare-angle', `${angle + 90}deg`);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.frame = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.frame) cancelAnimationFrame(this.frame);
  }

  tick() {
    const sized = this.scene.width > 0 ? true : this.resize();

    if (sized) {
      this.time += 0.016;
      if (this.needsDisplacementRebuild) {
        this.displacement.build(this.magnification);
        this.needsDisplacementRebuild = false;
      }
      this.updateFocus();
      this.updatePresentation();
      this.lens.render(this.scene, this.displacement, this.focusX, this.focusY);
    }

    if (this.running) this.frame = requestAnimationFrame(this.tick);
  }
}
