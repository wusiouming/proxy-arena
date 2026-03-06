import { ALL_EMOJIS } from './constants.js';
import { playSound } from './audio.js';
import { eatCameraGlitchesAt } from './background.js';

const EMOJI_LAYER = document.getElementById('emoji-layer');
export const emojis = [];

// Track interaction counts per emoji for rankings
export const interactionStats = {
    counts: {},          // { '🔥': 12, '💎': 5, ... }
    totalInteractions: 0 // total collision/evolution events
};

const FENCE_PADDING = 60; // Distance from screen edge to inner fence boundary

function applyRadarZoneEffects(entity) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!w || !h) return;

    // Define three circular zones in screen space
    const baseR = Math.min(w, h);
    const zones = [
        {
            type: 'grow', // center: gradually enlarge
            cx: w * 0.5,
            cy: h * 0.5,
            r: baseR * 0.16
        },
        {
            type: 'accelerate', // left: speed up
            cx: w * 0.18,
            cy: h * 0.5,
            r: baseR * 0.12
        },
        {
            type: 'decelerate', // right: slow down
            cx: w * 0.82,
            cy: h * 0.5,
            r: baseR * 0.12
        }
    ];

    const centerX = entity.x + entity.width / 2;
    const centerY = entity.y + entity.height / 2;

    zones.forEach(zone => {
        const dx = centerX - zone.cx;
        const dy = centerY - zone.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > zone.r) return;

        if (zone.type === 'grow') {
            const before = entity.sizeMultiplier;
            entity.sizeMultiplier = Math.min(entity.sizeMultiplier + 0.003, 3);
            if (entity.sizeMultiplier !== before) {
                entity.width = entity.baseSize * entity.sizeMultiplier;
                entity.height = entity.baseSize * entity.sizeMultiplier;
            }
        } else if (zone.type === 'accelerate') {
            const before = entity.speedMultiplier;
            entity.speedMultiplier = Math.min(entity.speedMultiplier + 0.02, 3);
            if (entity.vx !== 0 || entity.vy !== 0) {
                const len = Math.hypot(entity.vx, entity.vy) || 1;
                const speed = entity.baseSpeed * entity.speedMultiplier;
                entity.vx = (entity.vx / len) * speed;
                entity.vy = (entity.vy / len) * speed;
            }
        } else if (zone.type === 'decelerate') {
            const before = entity.speedMultiplier;
            entity.speedMultiplier = Math.max(entity.speedMultiplier - 0.02, 0.3);
            if (entity.vx !== 0 || entity.vy !== 0) {
                const len = Math.hypot(entity.vx, entity.vy) || 1;
                const speed = entity.baseSpeed * entity.speedMultiplier;
                entity.vx = (entity.vx / len) * speed;
                entity.vy = (entity.vy / len) * speed;
            }
        }
    });
}

export class EmojiEntity {
    constructor(char) {
        this.char = char;
        this.element = document.createElement('div');
        this.element.className = 'emoji-entity';
        this.element.textContent = char;
        EMOJI_LAYER.appendChild(this.element);

        // Base size and speed
        this.baseSize = window.innerWidth < 600 ? 45 : 56;
        this.baseSpeed = window.innerWidth < 600 ? 1.5 : 2.5;

        // Multipliers that grow as emojis "get stronger"
        this.sizeMultiplier = 1;
        this.speedMultiplier = 1;

        this.width = this.baseSize * this.sizeMultiplier;
        this.height = this.baseSize * this.sizeMultiplier;
        
        // Spawn within the fence bounds
        this.x = FENCE_PADDING + Math.random() * (window.innerWidth - this.width - FENCE_PADDING * 2);
        this.y = FENCE_PADDING + Math.random() * (window.innerHeight - this.height - FENCE_PADDING * 2);
        
        this.vx = 0;
        this.vy = 0;
        this.setRandomDirection();
        this.updateView();
    }

    setRandomDirection() {
        const speed = this.baseSpeed * this.speedMultiplier;
        // Cardinal directions only: Right, Left, Down, Up
        let possibleDirs = [
            [speed, 0],  // Right
            [-speed, 0], // Left
            [0, speed],  // Down
            [0, -speed]  // Up
        ];

        // Avoid directions that go further outside the fence
        if (this.x <= FENCE_PADDING) possibleDirs = possibleDirs.filter(d => d[0] >= 0);
        if (this.x >= window.innerWidth - this.width - FENCE_PADDING) possibleDirs = possibleDirs.filter(d => d[0] <= 0);
        if (this.y <= FENCE_PADDING) possibleDirs = possibleDirs.filter(d => d[1] >= 0);
        if (this.y >= window.innerHeight - this.height - FENCE_PADDING) possibleDirs = possibleDirs.filter(d => d[1] <= 0);

        // Filter out current direction to ensure a change if possible
        const changeDirs = possibleDirs.filter(d => d[0] !== this.vx || d[1] !== this.vy);
        const finalPool = changeDirs.length > 0 ? changeDirs : possibleDirs;

        const choice = finalPool[Math.floor(Math.random() * finalPool.length)];
        this.vx = choice[0];
        this.vy = choice[1];
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        let hit = false;
        const minX = FENCE_PADDING;
        const maxX = window.innerWidth - this.width - FENCE_PADDING;
        const minY = FENCE_PADDING;
        const maxY = window.innerHeight - this.height - FENCE_PADDING;

        if (this.x <= minX || this.x >= maxX) {
            this.x = Math.max(minX, Math.min(this.x, maxX));
            hit = true;
        }
        if (this.y <= minY || this.y >= maxY) {
            this.y = Math.max(minY, Math.min(this.y, maxY));
            hit = true;
        }

        if (hit) {
            this.setRandomDirection();
        }

        // Apply radar zone effects (grow / accelerate / decelerate)
        applyRadarZoneEffects(this);

        // Let emoji "eat" through any camera glitch canvases it passes over
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const eatRadius = (this.width * this.sizeMultiplier) * 0.6;
        eatCameraGlitchesAt(centerX, centerY, eatRadius);

        this.updateView();
    }

    updateView() {
        this.element.style.transform = `translate(${this.x}px, ${this.y}px) scale(${this.sizeMultiplier})`;
    }

    evolve() {
        const newEmoji = ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
        this.char = newEmoji;
        this.element.textContent = newEmoji;

        // Increase strength: grow in size and speed, with sensible caps
        this.sizeMultiplier = Math.min(this.sizeMultiplier * 1.2, 3);
        this.speedMultiplier = Math.min(this.speedMultiplier * 1.15, 3);

        this.width = this.baseSize * this.sizeMultiplier;
        this.height = this.baseSize * this.sizeMultiplier;

        // Refresh direction based on new speed
        this.setRandomDirection();
        this.updateView();

        playSound('evolve.mp3');
    }

    async say(text) {
        const existing = this.element.querySelector('.speech-bubble');
        if (existing) existing.remove();

        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.textContent = text;
        this.element.appendChild(bubble);

        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    voice: Math.random() > 0.5 ? 'en-male' : 'en-female'
                })
            });

            if (!response.ok) {
                throw new Error(`TTS API failed: ${response.status}`);
            }

            const speech = await response.json();
            await playSound(speech.audioUrl);
        } catch (e) {
            console.error("TTS error", e);
        }

        return new Promise(resolve => {
            setTimeout(() => {
                bubble.style.opacity = '0';
                bubble.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    if (bubble.parentNode) bubble.remove();
                    resolve();
                }, 500);
            }, Math.max(2000, text.length * 50));
        });
    }

    destroy() {
        this.element.style.opacity = '0';
        this.element.style.transform += ' scale(0)';
        setTimeout(() => {
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }, 300);
    }
}

export function checkCollisions() {
    for (let i = 0; i < emojis.length; i++) {
        for (let j = i + 1; j < emojis.length; j++) {
            const a = emojis[i];
            const b = emojis[j];

            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Collision radius scales with emoji size so stronger = bigger hitbox
            const collisionRadius = ((a.width + b.width) / 2) * 0.8;

            if (distance < collisionRadius) { // Adjusted collision radius for dynamic sizing
                playSound('collision.mp3');
                
                // Track interactions for ranking
                const aChar = a.char || '?';
                const bChar = b.char || '?';
                interactionStats.counts[aChar] = (interactionStats.counts[aChar] || 0) + 1;
                interactionStats.counts[bChar] = (interactionStats.counts[bChar] || 0) + 1;
                interactionStats.totalInteractions += 1;

                if (window.create3DBurst) {
                    window.create3DBurst((a.x + b.x) / 2, (a.y + b.y) / 2, 0x00ffff);
                }

                const outcome = Math.random();

                if (outcome < 0.7) { // 70% chance to bounce
                    a.vx *= -1;
                    a.vy *= -1;
                    b.vx *= -1;
                    b.vy *= -1;
                    a.x += a.vx * 2;
                    a.y += a.vy * 2;
                    b.x += b.vx * 2;
                    b.y += b.vy * 2;
                } else if (outcome < 0.85) { // 15% chance for one to disappear
                    const survivor = Math.random() > 0.5 ? a : b;
                    const victim = survivor === a ? b : a;
                    victim.destroy();
                    const victimIndex = emojis.indexOf(victim);
                    if (victimIndex > -1) emojis.splice(victimIndex, 1);
                } else { // 15% chance to evolve/merge
                    const survivor = Math.random() > 0.5 ? a : b;
                    const victim = survivor === a ? b : a;
                    survivor.evolve();
                    victim.destroy();
                    const victimIndex = emojis.indexOf(victim);
                    if (victimIndex > -1) emojis.splice(victimIndex, 1);
                }
                return; 
            }
        }
    }
}
