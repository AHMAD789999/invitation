'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';

// ================= CIRCULAR GALLERY COMPONENT =================
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function lerp(p1, p2, t) {
  return p1 + (p2 - p1) * t;
}

function autoBind(instance) {
  const proto = Object.getPrototypeOf(instance);
  Object.getOwnPropertyNames(proto).forEach(key => {
    if (key !== 'constructor' && typeof instance[key] === 'function') {
      instance[key] = instance[key].bind(instance);
    }
  });
}

const DEFAULT_FONT = 'bold 30px Figtree';
const DEFAULT_FONT_URL = 'https://fonts.googleapis.com/css2?family=Figtree:wght@400;700&display=swap';

function deriveFontFamilyFromUrl(url) {
  const fileName = (url.split('/').pop() || 'custom-font').split('?')[0];
  const base = fileName.replace(/\.(woff2?|ttf|otf|eot)$/i, '');
  return base.replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'CircularGalleryFont';
}

async function loadFontFromStylesheet(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed stylesheet load`);
  const cssText = await response.text();
  const faceBlocks = cssText.match(/@font-face\s*{[^}]*}/g) || [];
  let family = null;
  const fontFaces = [];
  for (const block of faceBlocks) {
    const familyMatch = block.match(/font-family:\s*['"]?([^;'"]+)['"]?/);
    const urlMatch = block.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    if (!familyMatch || !urlMatch) continue;
    family = familyMatch[1].trim();
    fontFaces.push(new FontFace(family, `url(${urlMatch[1]})`));
  }
  if (!family) throw new Error('No font-face found');
  await Promise.allSettled(fontFaces.map(async face => {
    await face.load();
    document.fonts.add(face);
  }));
  return family;
}

async function resolveFont(font, fontUrl) {
  const effectiveUrl = fontUrl || (font === DEFAULT_FONT ? DEFAULT_FONT_URL : null);
  if (!effectiveUrl) return font;
  try {
    const family = await loadFontFromStylesheet(effectiveUrl);
    const sizeMatch = font.match(/^\s*(.*?\d+px)/);
    return `${sizeMatch ? sizeMatch[1].trim() : 'bold 30px'} "${family}"`;
  } catch {
    return font;
  }
}

function getFontSize(font) {
  const match = font.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) : 30;
}

function createTextTexture(gl, text, font = 'bold 30px monospace', color = 'black') {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = font;
  const metrics = context.measureText(text);
  canvas.width = Math.ceil(metrics.width) + 20;
  canvas.height = Math.ceil(getFontSize(font) * 1.2) + 20;
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.textAlign = 'center';
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

class Title {
  constructor({ gl, plane, renderer, text, textColor = '#545050', font = '30px sans-serif' }) {
    autoBind(this);
    this.gl = gl;
    this.plane = plane;
    this.renderer = renderer;
    this.text = text;
    this.textColor = textColor;
    this.font = font;
    this.createMesh();
  }
  createMesh() {
    const { texture, width, height } = createTextTexture(this.gl, this.text, this.font, this.textColor);
    const geometry = new Plane(this.gl);
    const program = new Program(this.gl, {
      vertex: `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true
    });
    this.mesh = new Mesh(this.gl, { geometry, program });
    const aspect = width / height;
    const textHeight = this.plane.scale.y * 0.15;
    const textWidth = textHeight * aspect;
    this.mesh.scale.set(textWidth, textHeight, 1);
    this.mesh.position.y = -this.plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
    this.mesh.setParent(this.plane);
  }
}

class Media {
  constructor({ geometry, gl, image, index, length, renderer, scene, screen, text, viewport, bend, textColor, borderRadius = 0, font }) {
    this.extra = 0;
    this.geometry = geometry;
    this.gl = gl;
    this.image = image;
    this.index = index;
    this.length = length;
    this.renderer = renderer;
    this.scene = scene;
    this.screen = screen;
    this.text = text;
    this.viewport = viewport;
    this.bend = bend;
    this.textColor = textColor;
    this.borderRadius = borderRadius;
    this.font = font;
    this.createShader();
    this.createMesh();
    this.createTitle();
    this.onResize();
  }
  createShader() {
    const texture = new Texture(this.gl, { generateMipmaps: true });
    this.program = new Program(this.gl, {
      depthTest: false,
      depthWrite: false,
      vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;
        
        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }
        
        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float alpha = 1.0 - smoothstep(-0.002, 0.002, d);
          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: this.borderRadius }
      },
      transparent: true
    });
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = this.image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };
  }
  createMesh() {
    this.plane = new Mesh(this.gl, { geometry: this.geometry, program: this.program });
    this.plane.setParent(this.scene);
  }
  createTitle() {
    this.title = new Title({ gl: this.gl, plane: this.plane, renderer: this.renderer, text: this.text, textColor: this.textColor, font: this.font });
  }
  update(scroll, direction) {
    this.plane.position.x = this.x - scroll.current - this.extra;
    const x = this.plane.position.x;
    const H = this.viewport.width / 2;
    if (this.bend !== 0) {
      const B_abs = Math.abs(this.bend);
      const R = (H * H + B_abs * B_abs) / (2 * B_abs);
      const effectiveX = Math.min(Math.abs(x), H);
      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      if (this.bend > 0) {
        this.plane.position.y = -arc;
        this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
      } else {
        this.plane.position.y = arc;
        this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
      }
    }
    this.speed = scroll.current - scroll.last;
    this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.speed;

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
    if (direction === 'right' && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === 'left' && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }
  onResize({ screen, viewport } = {}) {
    if (screen) this.screen = screen;
    if (viewport) this.viewport = viewport;
    this.scale = this.screen.height / 1500;
    this.plane.scale.y = (this.viewport.height * (900 * this.scale)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (700 * this.scale)) / this.screen.width;
    this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.width = this.plane.scale.x + 2;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

class App {
  constructor(container, { items, bend, textColor = '#ffffff', borderRadius = 0, font = 'bold 30px Figtree', scrollSpeed = 2, scrollEase = 0.05 } = {}) {
    this.container = container;
    this.scrollSpeed = scrollSpeed;
    this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
    this.onCheckDebounce = debounce(this.onCheck, 200);
    this.createRenderer();
    this.createCamera();
    this.createScene();
    this.onResize();
    this.createGeometry();
    this.createMedias(items, bend, textColor, borderRadius, font);
    this.update();
    this.addEventListeners();
  }
  createRenderer() {
    this.renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.container.appendChild(this.gl.canvas);
  }
  createCamera() {
    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;
  }
  createScene() { this.scene = new Transform(); }
  createGeometry() { this.planeGeometry = new Plane(this.gl, { heightSegments: 50, widthSegments: 100 }); }
  createMedias(items, bend, textColor, borderRadius, font) {
    const galleryItems = items && items.length ? items : [{ image: 'https://picsum.photos/800/600', text: 'Memory' }];
    this.mediasImages = galleryItems.concat(galleryItems);
    this.medias = this.mediasImages.map((data, index) => new Media({
      geometry: this.planeGeometry, gl: this.gl, image: data.image, index, length: this.mediasImages.length,
      renderer: this.renderer, scene: this.scene, screen: this.screen, text: data.text, viewport: this.viewport,
      bend, textColor, borderRadius, font
    }));
  }
  onTouchDown(e) {
    this.isDown = true;
    this.scroll.position = this.scroll.current;
    this.start = e.touches ? e.touches[0].clientX : e.clientX;
  }
  onTouchMove(e) {
    if (!this.isDown) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    this.scroll.target = this.scroll.position + (this.start - x) * (this.scrollSpeed * 0.025);
  }
  onTouchUp() { this.isDown = false; this.onCheck(); }
  onWheel(e) {
    this.scroll.target += (e.deltaY > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
    this.onCheckDebounce();
  }
  onCheck() {
    if (!this.medias || !this.medias[0]) return;
    const width = this.medias[0].width;
    const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
    this.scroll.target = this.scroll.target < 0 ? -(width * itemIndex) : width * itemIndex;
  }
  onResize() {
    this.screen = { width: this.container.clientWidth, height: this.container.clientHeight };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    this.viewport = { width: height * this.camera.aspect, height };
    if (this.medias) this.medias.forEach(media => media.onResize({ screen: this.screen, viewport: this.viewport }));
  }
  update() {
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? 'right' : 'left';
    if (this.medias) this.medias.forEach(media => media.update(this.scroll, direction));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = window.requestAnimationFrame(this.update.bind(this));
  }
  addEventListeners() {
    this.boundResize = this.onResize.bind(this);
    this.boundWheel = this.onWheel.bind(this);
    this.boundDown = this.onTouchDown.bind(this);
    this.boundMove = this.onTouchMove.bind(this);
    this.boundUp = this.onTouchUp.bind(this);
    window.addEventListener('resize', this.boundResize);
    window.addEventListener('wheel', this.boundWheel);
    window.addEventListener('mousedown', this.boundDown);
    window.addEventListener('mousemove', this.boundMove);
    window.addEventListener('mouseup', this.boundUp);
    window.addEventListener('touchstart', this.boundDown);
    window.addEventListener('touchmove', this.boundMove);
    window.addEventListener('touchend', this.boundUp);
  }
  destroy() {
    window.cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('wheel', this.boundWheel);
    window.removeEventListener('mousedown', this.boundDown);
    window.removeEventListener('mousemove', this.boundMove);
    window.removeEventListener('mouseup', this.boundUp);
    window.removeEventListener('touchstart', this.boundDown);
    window.removeEventListener('touchmove', this.boundMove);
    window.removeEventListener('touchend', this.boundUp);
    if (this.renderer?.gl?.canvas?.parentNode) {
      this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas);
    }
  }
}

function CircularGallery({ items, bend = 3, textColor = '#ffffff', borderRadius = 0.05, font = 'bold 30px Figtree', fontUrl }) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current) return;
    let app;
    let isMounted = true;
    resolveFont(font, fontUrl).then(resolvedFont => {
      if (!isMounted || !containerRef.current) return;
      app = new App(containerRef.current, { items, bend, textColor, borderRadius, font: resolvedFont });
    });
    return () => { isMounted = false; if (app) app.destroy(); };
  }, [items, bend, textColor, borderRadius, font, fontUrl]);
  return <div style={{ width: '100%', height: '100%', overflow: 'hidden', cursor: 'grab' }} ref={containerRef} />;
}

// ================= MAIN BIRTHDAY WEBSITE COMPONENT =================
interface FamilyMember {
  id: string;
  name: string;
  profile_image?: string;
  role?: string;
}

interface Guest {
  id: string;
  name: string;
  title_prefix?: string;
  rsvp_status?: 'pending' | 'attending' | 'not_attending' | 'maybe';
  phone?: string | null;
  token?: string;
}

interface WeddingDetails {
  id: string;
  groom_name: string;
  bride_name: string;
  mehndi_date?: string;
  barat_date?: string;
  walima_date?: string;
}

interface BirthdayWebsiteProps {
  familyMembers?: FamilyMember[];
  guests?: Guest[];
  wedding?: WeddingDetails | null;
}

export default function BirthdayWebsite({ familyMembers = [], guests = [], wedding = null }: BirthdayWebsiteProps) {
  const CORRECT_CODE = "123456"; 
  const [step, setStep] = useState('lock');
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const inputRefs = useRef([]);

  const [loadingIndex, setLoadingIndex] = useState(0);
  const loadingTexts = [
    `Welcome ${wedding?.groom_name || 'Guest'} & ${wedding?.bride_name || 'Guest'}! ❤️`,
    "Loading magical memories...",
    "Happy Celebration! 🎉"
  ];

  const [poppedBalloons, setPoppedBalloons] = useState([]);
  const [flashingMemory, setFlashingMemory] = useState(null);
  const [websiteClosed, setWebsiteClosed] = useState(false);

  // Create memories from family members with images
  const defaultMemories = [
    { id: 1, title: "Family & Friends", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=60" },
    { id: 2, title: "Celebration", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&auto=format&fit=crop&q=60" },
    { id: 3, title: "Memories", image: "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=500&auto=format&fit=crop&q=60" },
    { id: 4, title: "Together", image: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500&auto=format&fit=crop&q=60" },
    { id: 5, title: "Love", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=60" },
  ];

  // Create memories from family members with their images
  const familyMemories = familyMembers.length > 0 
    ? familyMembers.map((member, index) => ({
        id: index + 1,
        title: member.name,
        image: member.profile_image || defaultMemories[index % defaultMemories.length].image,
      }))
    : defaultMemories;

  const memories = familyMemories.length > 0 ? familyMemories : defaultMemories;

  // RSVP Statistics
  const rsvpStats = {
    attending: guests.filter(g => g.rsvp_status === 'attending').length,
    notAttending: guests.filter(g => g.rsvp_status === 'not_attending').length,
    maybe: guests.filter(g => g.rsvp_status === 'maybe').length,
    pending: guests.filter(g => g.rsvp_status === 'pending' || !g.rsvp_status).length,
  };

  const totalGuests = guests.length;

  // Sound Synthesizer via Web Audio API
  const playSound = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'pop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'sparkle' || type === 'gallery-click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type === 'gallery-click' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(type === 'gallery-click' ? 523.25 : 400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(type === 'gallery-click' ? 1046.50 : 1200, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const handleCodeChange = (value, index) => {
    if (isNaN(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(false);
    if (value !== '' && index < 5) inputRefs.current[index + 1].focus();
    if (newCode.every(d => d !== '')) {
      if (newCode.join('') === CORRECT_CODE) {
        playSound('sparkle');
        setStep('loading');
      } else setError(true);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && code[index] === '' && index > 0) inputRefs.current[index - 1].focus();
  };

  useEffect(() => {
    if (step === 'loading') {
      if (loadingIndex < loadingTexts.length - 1) {
        const timer = setTimeout(() => setLoadingIndex(prev => prev + 1), 2200);
        return () => clearTimeout(timer);
      } else {
        const finalTimer = setTimeout(() => setStep('balloons'), 2000);
        return () => clearTimeout(finalTimer);
      }
    }
  }, [step, loadingIndex]);

  const handleBalloonClick = (memory) => {
    if (!poppedBalloons.includes(memory.id)) {
      playSound('pop');
      setFlashingMemory(memory);
      setTimeout(() => {
        setFlashingMemory(null);
        const updated = [...poppedBalloons, memory.id];
        setPoppedBalloons(updated);
        if (updated.length === memories.length) setTimeout(() => setStep('museum'), 500);
      }, 1000);
    }
  };

  const handleStartVideo = () => {
    playSound('sparkle');
    setStep('video');
  };

  useEffect(() => {
    if (step === 'video') {
      const timer = setTimeout(() => {
        setStep('letter');
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#211110] overflow-x-hidden transition-colors duration-1000">
      
      {/* Website Closed Final Screen */}
      {websiteClosed && (
        <div className="fixed inset-0 bg-[#160a09] z-50 flex flex-col items-center justify-center text-center p-6 animate-fade-in">
          <div className="text-6xl mb-4 animate-bounce">💖</div>
          <h1 className="text-4xl md:text-6xl font-serif text-[#f3e9e1] mb-3">
            {wedding ? `${wedding.groom_name} & ${wedding.bride_name}'s Celebration!` : 'Happy Celebration! ❤️'}
          </h1>
          <p className="font-sans text-[#d4b5ad] text-sm md:text-base tracking-widest uppercase">
            {totalGuests} guests invited • {rsvpStats.attending} attending
          </p>
        </div>
      )}

      {/* 1. LOCK SCREEN */}
      {step === 'lock' && (
        <div className="relative bg-[#fffaf5] border border-[#e8d5cc] shadow-2xl rounded-2xl w-full max-w-md p-8 text-center flex flex-col items-center">
          <h1 className="font-serif text-3xl text-[#5c2c2c] mb-1">
            {wedding ? `${wedding.groom_name} & ${wedding.bride_name}` : 'Happy Celebration'}
          </h1>
          <p className="font-serif italic text-sm text-[#8b5a5a] mb-4">Welcome to our special day ❤️</p>
          
          {/* RSVP Stats on Lock Screen */}
          <div className="grid grid-cols-4 gap-2 w-full mb-6">
            <div className="bg-emerald-50 p-2 rounded-lg text-center">
              <p className="text-xs font-bold text-emerald-700">{rsvpStats.attending}</p>
              <p className="text-[8px] text-emerald-600">✅</p>
            </div>
            <div className="bg-red-50 p-2 rounded-lg text-center">
              <p className="text-xs font-bold text-red-700">{rsvpStats.notAttending}</p>
              <p className="text-[8px] text-red-600">❌</p>
            </div>
            <div className="bg-amber-50 p-2 rounded-lg text-center">
              <p className="text-xs font-bold text-amber-700">{rsvpStats.maybe}</p>
              <p className="text-[8px] text-amber-600">🤔</p>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg text-center">
              <p className="text-xs font-bold text-slate-700">{rsvpStats.pending}</p>
              <p className="text-[8px] text-slate-600">⏳</p>
            </div>
          </div>
          
          <p className="text-[11px] tracking-widest text-[#7a6262] uppercase mb-4 font-semibold">Enter code (123456)</p>
          
          <div className="flex justify-center gap-2.5 mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={digit}
                ref={(el) => (inputRefs.current[index] = el)}
                onChange={(e) => handleCodeChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`w-11 h-13 text-center text-xl font-medium rounded-lg border bg-white shadow-sm focus:outline-none ${error ? 'border-red-500 text-red-600' : 'border-[#d4b5ad] text-[#5c2c2c]'}`}
              />
            ))}
          </div>
          {error && <p className="text-xs text-red-500 mb-4">Incorrect code! Try 123456 ❤️</p>}
        </div>
      )}

      {/* 2. LOADING SCREEN */}
      {step === 'loading' && (
        <div className="flex flex-col items-center justify-center text-center font-serif">
          <div className="text-4xl mb-6 animate-bounce">✨</div>
          <h1 className="text-2xl md:text-3xl text-[#f3e9e1] font-light">{loadingTexts[loadingIndex]}</h1>
          {familyMembers.length > 0 && (
            <p className="text-sm text-[#d4b5ad] mt-4">{familyMembers.length} family members invited</p>
          )}
        </div>
      )}

      {/* 3. BALLOONS SCREEN */}
      {step === 'balloons' && (
        <div className="w-full max-w-lg flex flex-col items-center font-serif relative">
          <h1 className="text-3xl text-[#f3e9e1] font-normal mb-2">
            {wedding ? `${wedding.groom_name} & ${wedding.bride_name}` : 'Memory Balloons'}
          </h1>
          <p className="font-sans text-xs text-[#d4b5ad] italic mb-2">
            {familyMembers.length} family memories to pop! 🎈
          </p>
          <p className="font-sans text-xs text-[#d4b5ad] italic mb-10">Click each balloon to pop it & trigger audio sound! 🎈</p>

          <div className="relative w-full h-[350px] flex flex-wrap items-center justify-center gap-4 px-4">
            {memories.map((mem) => {
              if (poppedBalloons.includes(mem.id)) return null;
              return (
                <div 
                  key={mem.id} 
                  className="relative flex flex-col items-center cursor-pointer group hover:scale-110 transition-transform"
                  onClick={() => handleBalloonClick(mem)}
                >
                  <div className="w-14 h-20 rounded-[50%] bg-gradient-to-tr from-[#9c5c56] to-[#b8736d] shadow-xl flex items-center justify-center">
                    <span className="text-lg">❤️</span>
                  </div>
                  <span className="text-[8px] text-[#d4b5ad] mt-1 truncate max-w-[60px]">{mem.title}</span>
                </div>
              );
            })}
            {poppedBalloons.length === memories.length && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-[#f3e9e1] text-xl animate-pulse">All memories unlocked! ✨</p>
              </div>
            )}
          </div>

          {flashingMemory && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#fffaf5] p-3 rounded-xl max-w-xs w-full text-center">
                <img src={flashingMemory.image} alt={flashingMemory.title} className="w-full h-48 object-cover rounded-lg mb-2" />
                <p className="font-serif text-sm text-[#5c2c2c]">{flashingMemory.title} ✨</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. IMAGE GALLERY MUSEUM WITH INTERACTIVE AUDIO */}
      {step === 'museum' && (
        <div 
          className="w-full max-w-5xl h-[75vh] flex flex-col items-center font-serif py-4 px-4"
          onClick={() => playSound('gallery-click')}
        >
          <div className="text-center mb-2">
            <h1 className="text-2xl text-[#f3e9e1] font-normal">
              {wedding ? `${wedding.groom_name} & ${wedding.bride_name}'s Memories` : 'Our Memories Gallery'} ❤️
            </h1>
            <p className="text-xs text-[#d4b5ad]">{memories.length} special moments</p>
          </div>

          <div className="w-full h-[60vh] rounded-2xl overflow-hidden shadow-2xl border-4 border-[#1f100e] relative mb-4">
            <CircularGallery 
              items={memories.map(m => ({ image: m.image, text: m.title }))} 
              bend={3} 
              textColor="#f3e9e1" 
              borderRadius={0.05} 
            />
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); handleStartVideo(); }}
            className="px-6 py-2.5 bg-[#8b3a3a] text-[#f3e9e1] rounded-full font-sans text-sm tracking-wider uppercase shadow-lg hover:bg-[#a64444]"
          >
            Watch 15s Special Video 🎶
          </button>
        </div>
      )}

      {/* 5. 15-SECOND VIDEO SECTION */}
      {step === 'video' && (
        <div className="w-full flex flex-col items-center text-center font-serif animate-fade-in px-0 md:m-0">
          <h1 className="text-2xl md:text-3xl text-[#f3e9e1] mb-6 font-normal">
            {wedding ? `${wedding.groom_name} & ${wedding.bride_name}` : 'Happy Celebration'} Special Song 🎶
          </h1>
          
          <div className="w-full aspect-video overflow-hidden bg-black relative">
            <iframe 
              className="absolute inset-0 w-full h-[120%] -top-[10%] pointer-events-none"
              src="https://www.youtube.com/embed/OQHrMM9TV3M?autoplay=1&start=5&mute=0&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1" 
              title="Celebration Song"
              allow="autoplay"
            />
          </div>
        </div>
      )}

      {/* 6. AMAZING WISHES LETTER AFTER 15 SECONDS */}
      {step === 'letter' && (
        <div className="w-full max-w-lg bg-[#fffaf5] border-4 border-[#8c4e48] p-8 rounded-2xl shadow-2xl text-center font-serif animate-fade-in relative">
          <div className="text-4xl mb-3">💌</div>
          <h2 className="text-2xl text-[#5c2c2c] mb-4 font-normal">A Special Note For You</h2>
          <p className="font-sans text-sm md:text-base text-[#6b423e] leading-relaxed mb-6 italic">
            "Thank you for being part of our special celebration! Your presence means the world to us. 
            We are so grateful to have you in our lives. 
            May this day bring you as much joy as you bring to us!" ✨❤️
          </p>
          
          {/* RSVP Summary */}
          <div className="grid grid-cols-4 gap-2 mb-6 p-3 bg-slate-50 rounded-xl">
            <div className="text-center">
              <p className="text-sm font-bold text-emerald-700">{rsvpStats.attending}</p>
              <p className="text-[8px] text-emerald-600">Attending</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-red-700">{rsvpStats.notAttending}</p>
              <p className="text-[8px] text-red-600">Not Coming</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-amber-700">{rsvpStats.maybe}</p>
              <p className="text-[8px] text-amber-600">Maybe</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-700">{rsvpStats.pending}</p>
              <p className="text-[8px] text-slate-600">Pending</p>
            </div>
          </div>

          <button
            onClick={() => { playSound('sparkle'); setWebsiteClosed(true); }}
            className="px-6 py-2.5 bg-[#8b3a3a] text-[#f3e9e1] rounded-full font-sans text-sm tracking-widest uppercase shadow-lg hover:bg-[#a64444]"
          >
            Close & Finish ❤️
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </main>
  );
}