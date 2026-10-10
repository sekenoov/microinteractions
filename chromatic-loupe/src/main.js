import { LoupeApp } from './LoupeApp.js';

const app = new LoupeApp({
  stage: document.querySelector('.stage'),
  sceneCanvas: document.getElementById('loupe-scene'),
  lensElement: document.getElementById('loupe-lens'),
  lensCanvas: document.getElementById('loupe-canvas'),
  glareElement: document.querySelector('.loupe-glare'),
  zoomLabel: document.getElementById('loupe-zoom'),
});

app.start();
