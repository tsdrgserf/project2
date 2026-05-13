const { Telegraf, Markup } = require("telegraf");
const db = require("./db");

const bot = new Telegraf("8913981888:AAHWkw3BNK-E3PN-vpWZVH6ds-25YOmAZd8");

// стани
const waitingMeal = new Map();
const waitingProfile = new Map();

/* ===================== MENU ===================== */
function mainMenu() {
  return Markup.keyboard([
    ["🍽 Додати їжу", "📊 Сьогодні"],
    ["👤 Профіль"]
  ]).resize();
}

/* ===================== START ===================== */
bot.start((ctx) => {
  ctx.reply("Привіт! 🍽 Я бот для харчування", mainMenu());
});

/* ===================== ADD MEAL BUTTON ===================== */
bot.hears("🍽 Додати їжу", (ctx) => {
  waitingMeal.set(ctx.from.id, true);
  ctx.reply("Що ви їли? Напиши текст 👇");
});

/* ===================== PROFILE BUTTON ===================== */
bot.hears("👤 Профіль", (ctx) => {
  waitingProfile.set(ctx.from.id, { step: 1, data: {} });
  ctx.reply("Введи вік:");
});

/* ===================== TODAY ===================== */
bot.hears("📊 Сьогодні", (ctx) => {
  const userId = ctx.from.id;

  db.all(
    `SELECT * FROM meals WHERE user_id = ?`,
    [userId],
    (err, rows) => {
      if (!rows || rows.length === 0) {
        return ctx.reply("Сьогодні ще немає записів 😕", mainMenu());
      }

      let text = "📊 Сьогодні ви зʼїли:\n\n";
      let sum = 0;

      rows.forEach((m, i) => {
        text += `${i + 1}. ${m.raw_text}\n🕒 ${new Date(m.timestamp).toLocaleString()}\n\n`;
        sum += m.calories_estimated;
      });

      text += `🔥 Всього: ${sum} kcal`;

      ctx.reply(text, mainMenu());
    }
  );
});

/* ===================== TEXT HANDLER ===================== */
bot.on("text", (ctx, next) => {
  const text = ctx.message.text;
  const userId = ctx.from.id;

  /* ===== MEAL ===== */
  if (waitingMeal.get(userId)) {
    db.run(
      `INSERT INTO meals (user_id, raw_text, calories_estimated, timestamp)
       VALUES (?, ?, ?, ?)`,
      [userId, text, 0, new Date().toISOString()]
    );

    waitingMeal.delete(userId);
    return ctx.reply("✅ Їжу збережено!", mainMenu());
  }

  /* ===== PROFILE FLOW ===== */
  const profile = waitingProfile.get(userId);

  if (profile) {
    if (profile.step === 1) {
      profile.data.age = text;
      profile.step = 2;
      waitingProfile.set(userId, profile);
      return ctx.reply("Вага (кг):");
    }

    if (profile.step === 2) {
      profile.data.weight = text;
      profile.step = 3;
      waitingProfile.set(userId, profile);
      return ctx.reply("Зріст (см):");
    }

    if (profile.step === 3) {
      profile.data.height = text;
      profile.step = 4;
      waitingProfile.set(userId, profile);
      return ctx.reply("Стать (male / female):");
    }

    if (profile.step === 4) {
      profile.data.sex = text;
      profile.step = 5;
      waitingProfile.set(userId, profile);
      return ctx.reply("Активність (1.2 / 1.55 / 1.9):");
    }

    if (profile.step === 5) {
      profile.data.activity = text;

      const { age, weight, height, sex, activity } = profile.data;

      const bmr =
        10 * weight +
        6.25 * height -
        5 * age +
        (sex === "male" ? 5 : -161);

      const tdee = bmr * parseFloat(activity);

      db.run(
        `INSERT OR REPLACE INTO users 
        (telegram_id, age, weight, height, sex, activity_level, bmr, tdee)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, age, weight, height, sex, activity, bmr, tdee]
      );

      waitingProfile.delete(userId);

      return ctx.reply(
        `✅ Профіль збережено\nBMR: ${bmr.toFixed(1)}\nTDEE: ${tdee.toFixed(1)}`,
        mainMenu()
      );
    }
  }

  next();
});

/* ===================== START BOT ===================== */
bot.launch();

console.log("Bot is running...");