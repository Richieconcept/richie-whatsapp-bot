import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import Groq from "groq-sdk";

import { processMessage } from "./BusinessBrain.js";

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Groq (used later for vision or formatting)
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// =============================
// HEALTH CHECK
// =============================
app.get("/", (req, res) => {
  res.send("Richie Digital Creations Bot Running");
});

// =============================
// WEBHOOK VERIFICATION
// =============================
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// =============================
// SEND WHATSAPP MESSAGE
// =============================
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
    console.error("WhatsApp Error:", error.response?.data || error.message);
  }
}

// =============================
// INCOMING WEBHOOK
// =============================
app.post("/webhook", async (req, res) => {
  const entry = req.body.entry?.[0];
  const change = entry?.changes?.[0];
  const messageObj = change?.value?.messages?.[0];

  if (!messageObj) {
    return res.sendStatus(200);
  }

  const clientNumber = messageObj.from;
  const messageType = messageObj.type;

  let messageText = "";

  if (messageType === "text") {
    messageText = messageObj.text.body;
  }

  console.log("Client:", clientNumber);
  console.log("Type:", messageType);
  console.log("Message:", messageText);

  const result = await processMessage({
    clientNumber,
    message: messageText,
    messageType,
    rawMessage: messageObj,
  });

  if (result?.action === "reply") {
    await sendWhatsAppMessage(clientNumber, result.message);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});