import express from "express";
import dotenv from "dotenv";
import axios from "axios";

import {
  getTimeGreeting,
  shouldGreet,
  shouldSendNewMonth
} from "./memory.js";

dotenv.config();

const app = express();
app.use(express.json());

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

// Send WhatsApp message function
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
      "Error sending WhatsApp message:",
      error.response?.data || error.message
    );
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

  // 🔔 New Month Greeting (once per month)
  if (shouldSendNewMonth(clientNumber)) {
    await sendWhatsAppMessage(
      clientNumber,
      "Happy new month 🎉 Wishing you a productive and successful month ahead."
    );
  }

  // 🌤️ Daily Time-based Greeting (once per day)
  if (shouldGreet(clientNumber)) {
    const greeting = getTimeGreeting();
    await sendWhatsAppMessage(clientNumber, greeting);
  }

  // 🧪 Temporary reply (will be replaced by AI later)
  await sendWhatsAppMessage(
    clientNumber,
    "Hello 👋 I’m here to help you with branding, apps, and digital services."
  );

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
