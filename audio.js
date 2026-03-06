export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Simple in-memory cache for decoded AudioBuffers to avoid repeated fetch/decode
const audioCache = new Map();
let bgmAudio = null;
let bgmInitDone = false;

export async function playSound(url) {
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
    try {
        let audioBuffer = audioCache.get(url);
        if (!audioBuffer) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            audioCache.set(url, audioBuffer);
        }

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);

        return new Promise((resolve) => {
            source.onended = () => resolve();
            source.start();
        });
    } catch (e) {
        console.error('Audio error', e);
    }
}

export function initBackgroundMusic(url = 'byte04.mp3') {
    if (bgmInitDone) return;
    bgmInitDone = true;

    bgmAudio = new Audio(url);
    bgmAudio.loop = true;
    bgmAudio.volume = 0.35;

    const tryPlay = async () => {
        try {
            if (audioCtx.state === 'suspended') {
                await audioCtx.resume();
            }
            await bgmAudio.play();
            window.removeEventListener('pointerdown', tryPlay);
            window.removeEventListener('keydown', tryPlay);
        } catch (_e) {
            // Autoplay can be blocked; we retry on next user interaction.
        }
    };

    // Try autoplay immediately.
    tryPlay();

    // Fallback for browsers blocking autoplay until interaction.
    window.addEventListener('pointerdown', tryPlay, { passive: true });
    window.addEventListener('keydown', tryPlay);
}
