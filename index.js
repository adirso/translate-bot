require('dotenv').config();
const { Telegraf } = require('telegraf');
const { OpenAI } = require('openai');

const bot = new Telegraf(process.env.BOT_TOKEN);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function isMostlyNonHebrew(text) {
    const hebChars = text.match(/[\u0590-\u05FF]/g) || [];
    return (hebChars.length / text.length) < 0.1;
}

function isOnlyLink(text) {
    const trimmed = text.trim();
    const urlPattern = /^(https?:\/\/)?[\w\-]+(\.[\w\-]+)+[/#?]?.*$/i;
    return urlPattern.test(trimmed);
}

function isEnglish(text) {
    // Check if >80% of the characters are A-Z or common English punctuation
    const enChars = text.match(/[a-zA-Z]/g) || [];
    return (enChars.length / text.length) > 0.8;
}

function isMostlyEmoji(text) {
    const emojiRegex = /\p{Emoji}/gu;
    const emojis = (text.match(emojiRegex) || []).length;
    return emojis / text.length > 0.7;
}

function isTelegramCommand(text) {
    return text.trim().startsWith('/');
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

    const text = ctx.message.text || ctx.message.caption;
    if (!text || text.length < 5) return;

    if (isTelegramCommand(text)) return;
    if (isOnlyLink(text)) return;
    if (isMostlyEmoji(text)) return;
    if (isEnglish(text)) return;
    if (!isMostlyNonHebrew(text)) return;

    try {
        const translated = await translateToHebrew(text);
        await ctx.reply(`🔄 תרגום לעברית:\n${translated}`, {
            reply_to_message_id: ctx.message.message_id
        });
    } catch (err) {
        console.error('Translation failed:', err.message);
    }
});


bot.launch();
