import * as THREE from 'three';
import { GLITCH_SNIPPETS } from './constants.js';
import { emojis } from './physics.js';

let backgroundMesh;
let gridHelper;
let bgTextures = [];
const particleBursts = [];

// Track persistent camera glitch canvases so emojis can "eat" them
const cameraGlitchCanvases = [];

// Allow other modules to punch holes through camera glitch canvases
export function eatCameraGlitchesAt(screenX, screenY, radiusPx) {
    cameraGlitchCanvases.forEach(({ canvas, ctx }) => {
        const rect = canvas.getBoundingClientRect();
        if (
            screenX < rect.left ||
            screenX > rect.right ||
            screenY < rect.top ||
            screenY > rect.bottom
        ) {
            return;
        }

        const localX = ((screenX - rect.left) / rect.width) * canvas.width;
        const localY = ((screenY - rect.top) / rect.height) * canvas.height;

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(localX, localY, radiusPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// Generate an abstract "virtual city interface" texture using canvas
function createVirtualCityTexture(variant = 0) {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, size, size);
    bgGrad.addColorStop(0, '#050510');
    bgGrad.addColorStop(0.4, '#0b1020');
    bgGrad.addColorStop(1, '#050818');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);

    // Helper for neon strokes
    function neonStroke(color, width) {
        ctx.shadowBlur = width * 2;
        ctx.shadowColor = color;
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
    }

    function neonFill(color) {
        ctx.shadowBlur = 18;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
    }

    // Draw "blocks" as abstract buildings (rectangles)
    const blockCount = 32;
    for (let i = 0; i < blockCount; i++) {
        const w = 40 + Math.random() * 120;
        const h = 40 + Math.random() * 140;
        const x = Math.random() * (size - w);
        const y = Math.random() * (size - h);

        const baseHue = variant * 40 + 180;
        const hue = (baseHue + Math.random() * 40) % 360;
        const color = `hsl(${hue}, 80%, ${40 + Math.random() * 25}%)`;

        ctx.save();
        ctx.globalAlpha = 0.18 + Math.random() * 0.2;
        neonStroke(color, 2);
        ctx.strokeRect(x, y, w, h);

        // inner grid
        ctx.beginPath();
        const cols = 2 + (Math.random() * 3) | 0;
        const rows = 2 + (Math.random() * 3) | 0;
        for (let c = 1; c < cols; c++) {
            const gx = x + (w / cols) * c;
            ctx.moveTo(gx, y);
            ctx.lineTo(gx, y + h);
        }
        for (let r = 1; r < rows; r++) {
            const gy = y + (h / rows) * r;
            ctx.moveTo(x, gy);
            ctx.lineTo(x + w, gy);
        }
        ctx.stroke();
        ctx.restore();
    }

    // Draw "data highways" as glowing lines
    const highwayCount = 18;
    for (let i = 0; i < highwayCount; i++) {
        const vertical = Math.random() > 0.5;
        const start = Math.random() * size;
        const offset = (Math.random() * 0.4 + 0.1) * size;
        const color = Math.random() > 0.5 ? '#00f6ff' : '#ff4dff';

        ctx.save();
        ctx.globalAlpha = 0.25 + Math.random() * 0.25;
        neonStroke(color, 3);

        ctx.beginPath();
        if (vertical) {
            ctx.moveTo(start, 0);
            ctx.lineTo(start, size);
        } else {
            ctx.moveTo(0, start);
            ctx.lineTo(size, start);
        }
        ctx.stroke();
        ctx.restore();

        // segmented "packets"
        const packetCount = 6;
        for (let p = 0; p < packetCount; p++) {
            const t = Math.random();
            ctx.save();
            neonFill(color);
            ctx.globalAlpha = 0.4 + Math.random() * 0.4;
            ctx.beginPath();
            if (vertical) {
                const py = t * size;
                ctx.rect(start - 3, py, 6, 18);
            } else {
                const px = t * size;
                ctx.rect(px, start - 3, 18, 6);
            }
            ctx.fill();
            ctx.restore();
        }
    }

    // Draw "nodes" as circles, triangles, and squares
    const nodeCount = 80;
    for (let i = 0; i < nodeCount; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 3 + Math.random() * 7;
        const pick = Math.random();
        const color = pick < 0.33 ? '#00ffc6' : pick < 0.66 ? '#ffd600' : '#ff4dff';

        ctx.save();
        ctx.globalAlpha = 0.4 + Math.random() * 0.4;
        neonFill(color);

        if (pick < 0.33) {
            // circle
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        } else if (pick < 0.66) {
            // triangle
            ctx.beginPath();
            ctx.moveTo(x, y - r);
            ctx.lineTo(x + r, y + r);
            ctx.lineTo(x - r, y + r);
            ctx.closePath();
            ctx.fill();
        } else {
            // square
            ctx.beginPath();
            ctx.rect(x - r, y - r, r * 2, r * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // Soft vignette
    const vignette = ctx.createRadialGradient(
        size / 2,
        size / 2,
        size / 4,
        size / 2,
        size / 2,
        size / 1.1
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Live camera frame for AR-like glitch imagery
let cameraFrameDataUrl = null;

export function getBackgroundMesh() { return backgroundMesh; }
export function getBgTextures() { return bgTextures; }

export function initBackground() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a0b2e);
    scene.fog = new THREE.FogExp2(0x1a0b2e, 0.02);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const loader = new THREE.TextureLoader();
    const particleTextures = [
        loader.load('glow_particle.png'),
        loader.load('triangle_particle.png'),
        loader.load('star_particle.png'),
        loader.load('ring_particle.png'),
        loader.load('square_particle.png')
    ];
    
    // Create a flat plane that fills the background view
    const geometry = new THREE.PlaneGeometry(80, 60);
    const material = new THREE.MeshBasicMaterial({ 
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide
    });
    
    backgroundMesh = new THREE.Mesh(geometry, material);
    backgroundMesh.position.z = -10; // Positioned behind the scene
    scene.add(backgroundMesh);

    // Flatten grid against the background plane
    const gridGeometry = new THREE.PlaneGeometry(80, 60, 40, 30);
    const gridMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, 
        wireframe: true, 
        transparent: true, 
        opacity: 0.1 
    });
    gridHelper = new THREE.Mesh(gridGeometry, gridMaterial);
    gridHelper.position.z = -9.9;
    scene.add(gridHelper);

    // Create several procedural "virtual city interface" variants
    for (let i = 0; i < 3; i++) {
        const tex = createVirtualCityTexture(i);
        bgTextures.push(tex);
    }

    backgroundMesh.material.map = bgTextures[0];

    const totalParticleCount = 160;
    const particleSystems = [];
    const particlesPerType = totalParticleCount / particleTextures.length;

    particleTextures.forEach((tex, texIndex) => {
        const pGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particlesPerType * 3);
        const colors = new Float32Array(particlesPerType * 3);
        
        for (let i = 0; i < particlesPerType; i++) {
            positions[i * 3] = (THREE.MathUtils.randFloatSpread(60));
            positions[i * 3 + 1] = Math.random() * 30 - 10;
            positions[i * 3 + 2] = (THREE.MathUtils.randFloatSpread(60));
            
            const type = Math.random();
            if (type > 0.6) { // Cold
                colors[i * 3] = 0.2 + Math.random() * 0.4;
                colors[i * 3 + 1] = 0.5 + Math.random() * 0.5;
                colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
            } else if (type > 0.2) { // Warm
                colors[i * 3] = 0.9 + Math.random() * 0.1;
                colors[i * 3 + 1] = 0.4 + Math.random() * 0.4;
                colors[i * 3 + 2] = 0.6 + Math.random() * 0.4;
            } else { // Neutral/White
                colors[i * 3] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
                colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
            }
        }
        
        pGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        pGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const pMaterial = new THREE.PointsMaterial({
            size: 0.4 + Math.random() * 0.3,
            map: tex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            vertexColors: true,
            depthWrite: false,
            sizeAttenuation: true,
            opacity: 0.8
        });
        
        const pSystem = new THREE.Points(pGeometry, pMaterial);
        scene.add(pSystem);
        particleSystems.push(pSystem);
    });

    camera.position.set(0, 0, 15);
    camera.lookAt(0, 0, 0);

    const clock = new THREE.Clock();
    let glitchTimer = 0;
    let isGlitching = false;
    const glitchOverlay = document.getElementById('glitch-overlay');

    // Radar scanning overlay state
    const radarLabels = [
        'SCANNING SIGNAL',
        'SENTIMENT ANALYSIS',
        'PRIORITY SORTING'
    ];
    let radarAngle = 0;
    let radarLabelIndex = 0;
    let radarLabelTimer = 0;
    const radarConfigs = [];

    // Throttle how often new camera glitch images appear so they don't crowd the screen
    let lastGlitchImageTime = 0;

    function createRadarOverlay() {
        // Add explicit labelText for each radar position so all three circles can show a center label
        const positions = [
            { id: 'center', left: '50%', sizeVmin: 60, labelText: 'Efficient Operation' },
            { id: 'left', left: '18%', sizeVmin: 40, labelText: 'Strengthen Right' },
            { id: 'right', left: '82%', sizeVmin: 40, labelText: 'Reduce Presence' }
        ];

        positions.forEach((pos, idx) => {
            const radarContainer = document.createElement('div');
            radarContainer.className = 'radar-scan';
            radarContainer.style.left = pos.left;
            radarContainer.style.top = '50%';
            radarContainer.style.width = `${pos.sizeVmin}vmin`;
            radarContainer.style.height = `${pos.sizeVmin}vmin`;

            const ring = document.createElement('div');
            ring.className = 'radar-ring';
            radarContainer.appendChild(ring);

            const beam = document.createElement('div');
            beam.className = 'radar-beam';
            radarContainer.appendChild(beam);

            // create a center label when labelText is provided; center radar will still cycle through radarLabels
            let label = null;
            if (pos.labelText) {
                label = document.createElement('div');
                label.className = 'radar-label';
                label.textContent = pos.labelText;
                radarContainer.appendChild(label);
            }

            glitchOverlay.appendChild(radarContainer);
            radarContainer.style.opacity = '0.9';

            radarConfigs.push({
                id: pos.id,
                container: radarContainer,
                ring,
                beam,
                label
            });
        });
    }

    createRadarOverlay();

    // --- Camera setup for AR-like glitch imagery ---
    const cameraVideo = document.createElement('video');
    cameraVideo.setAttribute('playsinline', 'true');
    cameraVideo.muted = true;
    cameraVideo.autoplay = true;
    cameraVideo.style.position = 'fixed';
    cameraVideo.style.opacity = '0';
    cameraVideo.style.pointerEvents = 'none';
    cameraVideo.style.width = '0';
    cameraVideo.style.height = '0';
    document.body.appendChild(cameraVideo);

    const cameraCanvas = document.createElement('canvas');
    cameraCanvas.width = 800;
    cameraCanvas.height = 600;
    const cameraCtx = cameraCanvas.getContext('2d');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        }).then(stream => {
            cameraVideo.srcObject = stream;
            cameraVideo.play().catch(() => {});
        }).catch(err => {
            console.warn('Camera access denied or unavailable:', err);
        });
    }

    // Periodically grab a frame from the live camera feed
    setInterval(() => {
        if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) return;
        cameraCanvas.width = cameraVideo.videoWidth;
        cameraCanvas.height = cameraVideo.videoHeight;
        cameraCtx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
        cameraFrameDataUrl = cameraCanvas.toDataURL('image/png');
    }, 150);

    function spawnGlitchText() {
        const text = GLITCH_SNIPPETS[Math.floor(Math.random() * GLITCH_SNIPPETS.length)];
        const el = document.createElement('div');
        el.className = 'glitch-code';
        el.textContent = text;
        el.style.left = Math.random() * 80 + 10 + '%';
        el.style.top = Math.random() * 80 + 10 + '%';
        el.style.color = Math.random() > 0.5 ? '#00ff00' : '#ff00ff';
        el.style.fontSize = (Math.random() * 10 + 10) + 'px';
        glitchOverlay.appendChild(el);
        
        setTimeout(() => {
            if (el.parentNode) el.remove();
        }, 1000 + Math.random() * 3000);
    }

    function spawnGlitchImage() {
        // Create a persistent canvas instead of a transient div so we can "erase" it
        const canvas = document.createElement('canvas');
        canvas.className = 'glitch-image';

        const w = 100 + Math.random() * 200;
        const h = 70 + Math.random() * 150;

        canvas.width = w;
        canvas.height = h;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        canvas.style.left = Math.random() * 80 + 10 + '%';
        canvas.style.top = Math.random() * 80 + 10 + '%';

        glitchOverlay.appendChild(canvas);

        const ctx = canvas.getContext('2d');

        // Draw latest camera frame (or fallback image) into the canvas
        const fallbackUrl = 'https://images.pexels.com/photos/672673/pexels-photo-672673.jpeg';
        const src = cameraFrameDataUrl || fallbackUrl;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // Random crop region
            const cropW = img.width * 0.6;
            const cropH = img.height * 0.6;
            const sx = Math.random() * (img.width - cropW);
            const sy = Math.random() * (img.height - cropH);
            ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, w, h);
        };
        img.src = src;

        // Track this canvas so emojis can "eat" it; limit to a small number on screen
        cameraGlitchCanvases.push({ canvas, ctx });
        const maxGlitchCanvases = 8;
        while (cameraGlitchCanvases.length > maxGlitchCanvases) {
            const old = cameraGlitchCanvases.shift();
            if (old && old.canvas && old.canvas.parentNode) {
                old.canvas.parentNode.removeChild(old.canvas);
            }
        }
    }

    function createBurst(x, y, colorHex = 0xffffff) {
        const count = 15;
        const burstGeometry = new THREE.BufferGeometry();
        const bPositions = new Float32Array(count * 3);
        const bVelocities = [];
        
        const wx = ((x / window.innerWidth) - 0.5) * 40;
        const wz = ((y / window.innerHeight) - 0.5) * 40;

        for (let i = 0; i < count; i++) {
            bPositions[i * 3] = wx;
            bPositions[i * 3 + 1] = 0;
            bPositions[i * 3 + 2] = wz;
            bVelocities.push({
                x: (Math.random() - 0.5) * 0.25,
                y: Math.random() * 0.4,
                z: (Math.random() - 0.5) * 0.25
            });
        }
        
        burstGeometry.setAttribute('position', new THREE.BufferAttribute(bPositions, 3));
        const randomTex = particleTextures[Math.floor(Math.random() * particleTextures.length)];
        
        const bMaterial = new THREE.PointsMaterial({
            size: 0.7,
            map: randomTex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            color: colorHex,
            depthWrite: false
        });
        
        const burstPoints = new THREE.Points(burstGeometry, bMaterial);
        scene.add(burstPoints);
        particleBursts.push({ mesh: burstPoints, velocities: bVelocities, life: 1.0 });
    }

    window.create3DBurst = createBurst;

    function animate() {
        requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        const delta = clock.getDelta();

        // Measure emoji motion intensity (speed, size, count)
        let motionIntensity = 0;
        if (emojis && emojis.length > 0) {
            let velSum = 0;
            let strongestSize = 0;
            emojis.forEach(e => {
                const speed = Math.hypot(e.vx || 0, e.vy || 0) * (e.speedMultiplier || 1);
                velSum += speed;
                if ((e.sizeMultiplier || 1) > strongestSize) strongestSize = e.sizeMultiplier || 1;
            });
            const avgSpeed = velSum / emojis.length;
            const sizeFactor = (strongestSize - 1) * 0.6;
            const countFactor = Math.min(emojis.length / 40, 1); // saturate around 40 emojis
            motionIntensity = Math.min(1, avgSpeed * 0.15 + sizeFactor + countFactor * 0.5);
        }

        // Gentle camera float
        camera.position.x = Math.sin(elapsed * 0.3) * 0.5;
        camera.position.y = Math.cos(elapsed * 0.2) * 0.5;
        camera.lookAt(0, 0, 0);

        // Glitch Logic
        glitchTimer -= 0.016;
        if (glitchTimer <= 0) {
            isGlitching = !isGlitching;
            glitchTimer = isGlitching ? Math.random() * 0.2 : Math.random() * 3 + 1;
        }

        if (isGlitching) {
            backgroundMesh.position.x = (Math.random() - 0.5) * 0.5;
            backgroundMesh.position.y = (Math.random() - 0.5) * 0.5;
            const jitterScale = 1 + Math.random() * 0.05 + motionIntensity * 0.1;
            backgroundMesh.scale.set(jitterScale, jitterScale, 1);
            
            if (Math.random() > 0.3) {
                spawnGlitchText();
            }
            
            // Spawn camera glitch images less frequently to avoid crowding
            const nowSeconds = elapsed;
            if (Math.random() > 0.6 && nowSeconds - lastGlitchImageTime > 2.5) {
                lastGlitchImageTime = nowSeconds;
                spawnGlitchImage();
            }

            if (Math.random() > 0.8) {
                backgroundMesh.material.color.setHex(Math.random() > 0.5 ? 0xff00ff : 0x00ffff);
            }
        } else {
            backgroundMesh.position.x = 0;
            backgroundMesh.position.y = 0;
            const calmScale = 1 + motionIntensity * 0.08;
            backgroundMesh.scale.set(calmScale, calmScale, 1);
            backgroundMesh.material.color.setHex(0xffffff);
        }

        // Radar scan logic - always active, continuous sweep
        if (radarConfigs.length > 0) {
            // Sweep speed and size react to emoji motion
            radarAngle += delta * (1.5 + motionIntensity * 4);
            const deg = radarAngle * (180 / Math.PI);
            const baseScale = 0.8 + motionIntensity * 0.5 + 0.05 * Math.sin(elapsed * 3);
            const ringPulse = 0.25 + motionIntensity * 0.4 + 0.15 * Math.sin(elapsed * 4);
            const boxShadow = `0 0 ${10 + motionIntensity * 25}px rgba(0, 255, 255, ${0.2 + motionIntensity * 0.5})`;

            radarConfigs.forEach((cfg, idx) => {
                if (cfg.beam) {
                    cfg.beam.style.transform = `translate(0, -50%) rotate(${deg}deg)`;
                }
                if (cfg.container) {
                    cfg.container.style.transform = `translate(-50%, -50%) scale(${baseScale})`;
                    cfg.container.style.opacity = String(0.5 + motionIntensity * 0.5);
                }
                if (cfg.ring) {
                    cfg.ring.style.opacity = String(ringPulse);
                    cfg.ring.style.boxShadow = boxShadow;
                }
            });
        }

        // Cycle radar label every few seconds (center radar only)
        radarLabelTimer += delta;
        const centerRadar = radarConfigs[0];
        if (radarLabelTimer > 3 && centerRadar && centerRadar.label) {
            radarLabelTimer = 0;
            radarLabelIndex = (radarLabelIndex + 1) % radarLabels.length;
            centerRadar.label.textContent = radarLabels[radarLabelIndex];
        }

        particleSystems.forEach((system, systemIndex) => {
            const posArray = system.geometry.attributes.position.array;
            const count = posArray.length / 3;
            for (let i = 0; i < count; i++) {
                const idx = i * 3;
                // Unique movement patterns per system index
                const offset = i + systemIndex * 10;
                posArray[idx + 1] += Math.sin(elapsed * 0.5 + offset) * 0.008;
                posArray[idx] += Math.cos(elapsed * 0.3 + offset) * 0.004;
                posArray[idx + 2] += Math.sin(elapsed * 0.2 + offset) * 0.004;
            }
            system.geometry.attributes.position.needsUpdate = true;
            system.rotation.y = elapsed * (0.02 + systemIndex * 0.01);
        });

        backgroundMesh.rotation.z = Math.sin(elapsed * 0.1 + motionIntensity) * (0.01 + motionIntensity * 0.03);

        // Subtle grid movement – distort more as emojis get wilder
        gridHelper.position.x = Math.sin(elapsed * 0.5) * (0.2 + motionIntensity * 0.6);
        gridHelper.position.y = Math.cos(elapsed * 0.7) * (0.1 + motionIntensity * 0.4);
        gridHelper.rotation.z = Math.sin(elapsed * 0.3) * motionIntensity * 0.3;

        const baseOpacity = isGlitching ? 0.3 : 0.1;
        gridHelper.material.opacity = baseOpacity + motionIntensity * 0.25 + Math.sin(elapsed * 5) * 0.05;

        for (let i = particleBursts.length - 1; i >= 0; i--) {
            const b = particleBursts[i];
            const positions = b.mesh.geometry.attributes.position.array;
            b.life -= 0.02;
            b.mesh.material.opacity = b.life;
            
            for (let j = 0; j < 12; j++) {
                positions[j * 3] += b.velocities[j].x;
                positions[j * 3 + 1] += b.velocities[j].y;
                positions[j * 3 + 2] += b.velocities[j].z;
                b.velocities[j].y -= 0.01;
            }
            b.mesh.geometry.attributes.position.needsUpdate = true;
            
            if (b.life <= 0) {
                scene.remove(b.mesh);
                particleBursts.splice(i, 1);
            }
        }

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}