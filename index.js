import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import Groq from "groq-sdk";

import {
  getTimeGreeting,
  shouldGreet
} from "./memory.js";

dotenv.config();

const app = express();
app.use(express.json());

// ✅ Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Health check
app.get("/", (req, res) => {
  res.send("Richie WhatsApp Bot is running");
});

// Webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// Send WhatsApp message
async function sendWhatsAppMessage(to, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: text }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error(
      "WhatsApp Error:",
      error.response?.data || error.message
    );
  }
}

// ✅ AI Reply Function
async function generateAIReply(userMessage) {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a professional Nigerian business assistant for IBSK World Services Ltd. You help customers with branding, printing, digital services and business registrations. Keep replies short, clear and professional."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      temperature: 0.6
    });

    return (
      completion.choices[0]?.message?.content ||
      "How may I assist you today?"
    );
  } catch (error) {
    console.error(
      "AI Error:",
      error.response?.data || error.message
    );
    return "Please hold on while we process your request.";
  }
}

// Incoming messages
app.post("/webhook", async (req, res) => {
  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const message = change?.value?.messages?.[0];

  if (!message || !message.text) {
    return res.sendStatus(200);
  }

  const clientNumber = message.from;
  const text = message.text.body;

  console.log("From:", clientNumber);
  console.log("Message:", text);

  // 🌤️ Daily Greeting Only
  if (shouldGreet(clientNumber)) {
    const greeting = getTimeGreeting();
    await sendWhatsAppMessage(clientNumber, greeting);
  }

  // 🤖 AI Response
  const aiReply = await generateAIReply(text);
  await sendWhatsAppMessage(clientNumber, aiReply);

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});