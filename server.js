import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY in environment.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/debate', async (req, res) => {
  try {
    const topic = String(req.body?.topic || '').trim();
    const participants = Array.isArray(req.body?.participants)
      ? req.body.participants.map((x) => String(x)).filter(Boolean).slice(0, 20)
      : [];

    if (!topic) {
      return res.status(400).json({ error: 'topic is required' });
    }

    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are orchestrating a short, funny debate between living emojis. The user provides a topic and available emojis. Keep each line to max 10 words. Return valid JSON only in this shape: {"debate":[{"emoji":"string","text":"string"}]}. Generate exactly 10 dialogue lines.'
        },
        {
          role: 'user',
          content: `Topic: "${topic}". Available Emojis: ${participants.join(', ')}`
        }
      ]
    });

    const content = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed.debate)) {
      return res.status(502).json({ error: 'Invalid model response' });
    }

    const debate = parsed.debate.slice(0, 10).map((line) => ({
      emoji: String(line?.emoji || ''),
      text: String(line?.text || '').slice(0, 160)
    }));

    return res.json({ debate });
  } catch (error) {
    console.error('/api/debate error:', error);
    return res.status(500).json({ error: 'Failed to generate debate' });
  }
});

app.post('/api/tts', async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    const voiceInput = String(req.body?.voice || '').trim().toLowerCase();
    const voiceMap = {
      'en-male': 'alloy',
      'en-female': 'nova'
    };
    const voice = voiceMap[voiceInput] || 'alloy';

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const speech = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice,
      input: text,
      response_format: 'mp3'
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    const base64 = audioBuffer.toString('base64');

    return res.json({
      audioUrl: `data:audio/mpeg;base64,${base64}`
    });
  } catch (error) {
    console.error('/api/tts error:', error);
    return res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

app.listen(port, () => {
  console.log(`Proxy Arena server running at http://localhost:${port}`);
});
