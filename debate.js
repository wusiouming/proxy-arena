import { emojis } from './physics.js';

let isDebating = false;

export async function startDebate(topic) {
    if (isDebating || emojis.length < 2) return;
    isDebating = true;

    const participants = emojis.slice(-8); 
    const participantChars = participants.map(e => e.char);

    try {
        const response = await fetch('/api/debate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic,
                participants: participantChars
            })
        });

        if (!response.ok) {
            throw new Error(`Debate API failed: ${response.status}`);
        }

        const debateData = await response.json();
        
        for (const line of debateData.debate) {
            let speaker = emojis.find(e => e.char === line.emoji) || emojis[Math.floor(Math.random() * emojis.length)];
            if (speaker) {
                await speaker.say(line.text);
            }
            await new Promise(r => setTimeout(r, 500));
        }

        // After all generated audio has finished, wait 10s then archive session
        if (typeof window !== 'undefined' && typeof window.triggerSessionArchive === 'function') {
            await new Promise(r => setTimeout(r, 10000));
            window.triggerSessionArchive(topic);
        }
    } catch (err) {
        console.error("Debate AI error:", err);
    } finally {
        isDebating = false;
    }
}
