require('dotenv').config();
const { Telegraf } = require('telegraf');
const { OpenAI } = require('openai');

const bot = new Telegraf(process.env.BOT_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function isMostlyNonHebrew(text) {
    const hebChars = text.match(/[\u0590-\u05FF]/g) || [];
    return (hebChars.length / text.length) < 0.1;
}

async function translateToHebrew(text) {
    const prompt = `Translate the following message to Hebrew:\n\n"${text}"`;
    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
    });

    return response.choices[0].message.content.trim();
}

bot.on('message', async (ctx) => {
    const chatType = ctx.chat.type;
    if (chatType !== 'group' && chatType !== 'supergroup') return;

    let text = null;

    // Handle text messages
    if (ctx.message.text) {
        text = ctx.message.text;
    }

    // Handle captions (photo, video, etc.)
    else if (ctx.message.caption) {
        text = ctx.message.caption;
    }

    if (!text || text.length < 5) return;

    if (isMostlyNonHebrew(text)) {
        try {
            const translated = await translateToHebrew(text);
            await ctx.reply(`🔄 תרגום לעברית:\n${translated}`, {
                reply_to_message_id: ctx.message.message_id
            });
        } catch (err) {
            console.error('Translation failed:', err.message);
        }
    }
});

bot.launch();
