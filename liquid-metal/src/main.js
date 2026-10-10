import { LiquidMetalApp } from './LiquidMetalApp.js';

const canvas = document.getElementById('metal-canvas');
const input = document.getElementById('metal-input');
const blurElement = document.querySelector('#goo feGaussianBlur');

const app = new LiquidMetalApp(canvas, input, blurElement);
app.start();
