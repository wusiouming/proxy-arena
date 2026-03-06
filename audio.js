export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Simple in-memory cache for decoded AudioBuffers to avoid repeated fetch/decode
const audioCache = new Map();

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