import { EMOJI_MAP, ALL_EMOJIS } from './constants.js';
import { initBackground, getBackgroundMesh, getBgTextures } from './background.js';
import { emojis, EmojiEntity, checkCollisions, interactionStats } from './physics.js';
import { startDebate } from './debate.js';
import { initBackgroundMusic } from './audio.js';

 // --- Constants & State ---

const TEXT_INPUT = document.getElementById('text-input');
const SEND_BTN = document.getElementById('send-btn');
const TOGGLE_UI_BTN = document.getElementById('toggle-ui-btn');
const UI_CONTAINER = document.getElementById('ui-container');
const RANKING_PANEL = document.getElementById('ranking-panel');
const RANKING_BODY = document.getElementById('ranking-body');
const RANKING_META = document.getElementById('ranking-meta');
const ARCHIVE_PANEL = document.getElementById('archive-panel');
const ARCHIVE_CONTENT = document.getElementById('archive-content');

function processText(text) {
    const words = text.toLowerCase().split(/\s+/);
    let outputEmojis = [];

    words.forEach(word => {
        let found = false;
        for (const [key, list] of Object.entries(EMOJI_MAP)) {
            if (word.includes(key)) {
                outputEmojis.push(...list.slice(0, 2));
                found = true;
            }
        }
        if (!found && word.length > 0) {
            outputEmojis.push(ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)]);
            outputEmojis.push(ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)]);
        }
    });

    const perInputLimit = 40;
    const targetCount = Math.max(words.length, Math.ceil(text.length * 0.8));
    while (outputEmojis.length < targetCount && outputEmojis.length < perInputLimit) {
        outputEmojis.push(ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)]);
    }

    const backgroundMesh = getBackgroundMesh();
    const bgTextures = getBgTextures();
    if (backgroundMesh && bgTextures.length > 0) {
        const randomIndex = Math.floor(Math.random() * bgTextures.length);
        backgroundMesh.material.map = bgTextures[randomIndex];
        backgroundMesh.material.needsUpdate = true;
        
        backgroundMesh.material.opacity = 0.7;
        let fadeOut = setInterval(() => {
            backgroundMesh.material.opacity += 0.03;
            if (backgroundMesh.material.opacity >= 1.0) {
                backgroundMesh.material.opacity = 1.0;
                clearInterval(fadeOut);
            }
        }, 30);
    }

    outputEmojis.forEach((char, index) => {
        setTimeout(() => {
            if (emojis.length > 200) {
                const oldest = emojis.shift();
                if (oldest) oldest.destroy();
            }

            const entity = new EmojiEntity(char);
            emojis.push(entity);
            
            if (window.create3DBurst) {
                window.create3DBurst(entity.x, entity.y, 0xff00ff);
            }
            
            if (index === outputEmojis.length - 1) {
                setTimeout(() => startDebate(text), 1000);
            }
        }, index * 50);
    });
}

function gameLoop() {
    emojis.forEach(e => e.update());
    checkCollisions();
    requestAnimationFrame(gameLoop);
}

// --- Arena statistics HUD ---
const ARENA_STATS_EL = document.getElementById('arena-stats');

function restoreUI() {
    UI_CONTAINER.classList.remove('minimized');
    TOGGLE_UI_BTN.textContent = '↙️';
    TEXT_INPUT.focus();
}

function showSessionArchive(inputText) {
    if (!ARCHIVE_PANEL || !ARCHIVE_CONTENT) return;

    // Generate a pseudo-random arena id
    const arenaId = 20000 + Math.floor(Math.random() * 900);

    // Pick some emojis to represent dominant/suppressed/fragmented
    const pickEmoji = () => ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
    const dominantEmoji = '🔥';
    const suppressedEmoji = '😶';
    const fragmentedEmoji = '🤖';

    // Simple fake accuracy split
    const algorithmShare = 50 + Math.floor(Math.random() * 41); // 50–90
    const humanShare = 100 - algorithmShare;

    // Snapshot some arena stats for this archive
    const totalEvents = interactionStats.totalInteractions || 0;
    const counts = interactionStats.counts || {};
    const uniqueSignals = Object.keys(counts).length;

    let dominantSignal = '-';
    let dominantCount = 0;
    Object.entries(counts).forEach(([emoji, count]) => {
        if (count > dominantCount) {
            dominantCount = count;
            dominantSignal = emoji;
        }
    });

    const activeEntities = emojis.length;
    const signalDensity = (totalEvents / Math.max(1, activeEntities)).toFixed(2);

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    let rankingLinesHtml = '';

    if (!entries.length) {
        rankingLinesHtml = `
        <div class="archive-result-line">
            <div class="left">Top Signals</div>
            <div class="right">No interactions yet</div>
        </div>`;
    } else {
        const top = entries.slice(0, 3);
        rankingLinesHtml = top.map(([emoji, count], idx) => `
        <div class="archive-result-line">
            <div class="left">Top ${idx + 1}</div>
            <div class="right">${idx + 1}. ${emoji}  ${count} interactions</div>
        </div>`).join('');
    }

    ARCHIVE_CONTENT.innerHTML = `
        <div class="archive-title">SESSION ARCHIVED</div>
        <div class="archive-id">Proxy Arena #${arenaId}</div>
        <div class="archive-label">Input signal</div>
        <div class="archive-input"><span>"${inputText}"</span></div>
        <div class="archive-label">Result</div>
        ${rankingLinesHtml}
        <div class="archive-metrics">
            <span>Human message accuracy: ${humanShare}%</span>
            <span>Algorithm interpretation: ${algorithmShare}%</span>
            <span>Signals tracked this session: ${uniqueSignals}</span>
            <span>Total signals processed today: ${totalEvents}</span>
            <span>Total collision events: ${totalEvents}</span>
            <span>Signal density (events per active emoji): ${signalDensity}</span>
        </div>
        <div class="archive-footer" id="archive-footer">ARCHIVING SIGNAL...</div>
    `;

    ARCHIVE_PANEL.classList.add('visible');

    // After a short beat, mark ready for next signal
    setTimeout(() => {
        const footer = document.getElementById('archive-footer');
        if (footer) {
            footer.textContent = 'READY FOR NEXT SIGNAL';
            footer.classList.add('ready');
            footer.setAttribute('role', 'button');
            footer.setAttribute('tabindex', '0');

            const triggerClose = () => {
                ARCHIVE_PANEL.classList.remove('visible');
                restoreUI();
            };

            footer.addEventListener('click', triggerClose, { once: true });
            footer.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerClose();
                }
            }, { once: true });
        }
    }, 2000);
}

function updateArenaStats() {
    if (!ARENA_STATS_EL) return;

    if (emojis.length === 0) {
        ARENA_STATS_EL.textContent = ' DOMINANCE_INDEX: --   VISIBILITY_BIAS: --   SURVIVAL_SIGNALS: 0   TRENDING_ENTITY: - ';
        return;
    }

    let totalSize = 0;
    let maxSize = 0;
    let maxSizeEmoji = null;

    let maxSpeed = 0;
    let minSpeed = Infinity;

    const freq = {};

    emojis.forEach(e => {
        const size = e.sizeMultiplier || 1;
        const speed = e.speedMultiplier || 1;

        totalSize += size;
        if (size > maxSize) {
            maxSize = size;
            maxSizeEmoji = e;
        }

        if (speed > maxSpeed) maxSpeed = speed;
        if (speed < minSpeed) minSpeed = speed;

        const c = e.char || '?';
        freq[c] = (freq[c] || 0) + 1;
    });

    const dominanceIndex = totalSize > 0 ? (maxSize / totalSize) * 100 : 0;
    const rawBias = (maxSpeed - minSpeed) * 10;
    const biasSign = rawBias >= 0 ? '+' : '-';
    const visibilityBias = `${biasSign}${Math.abs(rawBias).toFixed(1)}`;
    const survivalSignals = emojis.length;

    let trending = '-';
    let bestCount = 0;
    Object.entries(freq).forEach(([char, count]) => {
        if (count > bestCount) {
            bestCount = count;
            trending = char;
        }
    });

    ARENA_STATS_EL.textContent =
        ` DOMINANCE_INDEX: ${dominanceIndex.toFixed(1)}% ` +
        ` VISIBILITY_BIAS: ${visibilityBias} ` +
        ` SURVIVAL_SIGNALS: ${survivalSignals} ` +
        ` TRENDING_ENTITY: ${trending} `;
}

function updateRankingPanel() {
    if (!RANKING_BODY || !RANKING_META || !RANKING_PANEL) return;

    const counts = interactionStats.counts || {};
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    if (!entries.length) {
        RANKING_BODY.innerHTML = '<div class="ranking-empty">Waiting for interactions...</div>';
        RANKING_META.innerHTML = '';
        RANKING_PANEL.classList.remove('hidden');
        return;
    }

    // Build TOP SIGNALS list
    const top = entries.slice(0, 5);
    RANKING_BODY.innerHTML = top.map(([emoji, count], idx) => {
        return `
            <div class="ranking-row">
                <span class="left">
                    <span class="rank-index">${idx + 1}.</span>
                    <span class="emoji-symbol">${emoji}</span>
                </span>
                <span class="count">${count} interactions</span>
            </div>
        `;
    }).join('');

    // Meta stats
    const total = interactionStats.totalInteractions || 0;
    const uniqueSignals = entries.length;

    const topEmoji = top[0]?.[0] ?? '-';
    const topCount = top[0]?.[1] ?? 0;
    const dominance = total > 0 ? (topCount / total) * 100 : 0;

    RANKING_META.innerHTML = [
        `<span>Dominance Index: ${dominance.toFixed(1)}%</span>`,
        `<span>Signals Tracked: ${uniqueSignals}</span>`,
        `<span>Total Events: ${total}</span>`,
        `<span>Trending Entity: ${topEmoji}</span>`
    ].join('');

    RANKING_PANEL.classList.remove('hidden');
}

setInterval(() => {
    updateArenaStats();
    updateRankingPanel();
}, 700);

// Expose archive trigger for debate module
window.triggerSessionArchive = showSessionArchive;

// --- Initialization ---
initBackground();
initBackgroundMusic('byte04.mp3');
gameLoop();

SEND_BTN.addEventListener('click', () => {
    const text = TEXT_INPUT.value.trim();
    if (text) {
        processText(text);
        TEXT_INPUT.value = '';

        // Automatically shrink UI to bottom-right corner after generate
        UI_CONTAINER.classList.add('minimized');
        TOGGLE_UI_BTN.textContent = '↗️';
    }
});

TEXT_INPUT.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        SEND_BTN.click();
    }
});

TEXT_INPUT.addEventListener('focus', () => {
    window.scrollTo(0, 0);
});

TOGGLE_UI_BTN.addEventListener('click', () => {
    UI_CONTAINER.classList.toggle('minimized');
    if (UI_CONTAINER.classList.contains('minimized')) {
        TOGGLE_UI_BTN.textContent = '↗️';
    } else {
        TOGGLE_UI_BTN.textContent = '↙️';
        TEXT_INPUT.focus();
    }
});
