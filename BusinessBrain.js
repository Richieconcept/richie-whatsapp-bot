import { getSession, updateSession, getAllSessions } from "./memory.js";

const FULL_PACKAGE_DETAILS = `
Here are our available branding packages:

—Promo Package—
✔ One logo design
✔ No revision
✔ 12 hours delivery
₦3,000 (Full payment)

—Starter Branding Package—
✔ 2 logo designs
✔ Unlimited revision
✔ 24 hours delivery
₦5,000 (50% deposit)

—Basic Branding Package—
✔ Logo + Letterhead
✔ 24 hours delivery
₦7,000 (50% deposit)

—Standard Branding Package—
✔ Logo + Letterhead + Business Card + ID Card + Company QR Code
✔ 48 hours delivery
₦15,000 (50% deposit)

—Professional Branding Package—
✔ Logo + Letterhead + Business Card + ID Card + Flyer + Receipt + Invoice + Large Envelope + QR Code
✔ 48 hours delivery
₦30,000 (50% deposit)

—Premium Branding Package—
✔ Logo + Letterhead + Business Card + ID Card + Flyer + Invoice + Receipt + Large & Small Envelope + Company Profile (up to 12 pages)
✔ 48 hours delivery
₦60,000 (50% deposit)

—Elite Branding Package—
✔ Multiple brand assets + Corporate Emails + Basic Website
₦120,000

—Full Branding Package—
✔ Full branding + Website + Social Media + Google Business Listing
₦300,000
`;

const BUSINESS_INFO = `
Richie Digital Creations
Phone: 08125128766
Office Address:
B3 Diwani Plaza, 14 Akufor Along Aso Savings Road,
Before Byazhin Junction, Kubwa, Abuja.

Walk-ins are allowed.
Location is never a barrier as we deliver all designs in soft copy with printable formats.
`;

export async function processMessage({
  clientNumber,
  message,
  messageType,
  groq
}) {
  const session = getSession(clientNumber);
  updateSession(clientNumber, { lastInteraction: Date.now() });

  if (messageType !== "text") {
    return { action: "reply", message: "Message received." };
  }

  const intent = await classifyIntent(message, groq);
  const lower = message.toLowerCase();

  // SILENCE RULES
  if (
    intent === "PriceNegotiation" ||
    intent === "CustomRequest" ||
    intent === "HighValuePackage"
  ) {
    return { action: "silent" };
  }

  // LOCATION ENQUIRY
  if (lower.includes("location") || lower.includes("office")) {
    return { action: "reply", message: BUSINESS_INFO };
  }

  // SAMPLE REQUEST
  if (intent === "SampleRequest") {
    return {
      action: "reply",
      message:
        "Kindly go through our design samples here 👇👇\nhttps://web.facebook.com/profile.php?id=100092567179199&sk=photos"
    };
  }

  // PRICE / COST ENQUIRY → SHOW FULL PACKAGE
  if (
    lower.includes("how much") ||
    lower.includes("price") ||
    lower.includes("cost")
  ) {
    return {
      action: "reply",
      message:
        FULL_PACKAGE_DETAILS +
        "\nKindly select the package that best suits your needs and budget."
    };
  }

  // GREETING OR GENERAL ENQUIRY → AI HUMAN RESPONSE
  const response = await generateHumanResponse(message, groq);

  return {
    action: "reply",
    message: response
  };
}

// AI Intent Classification
async function classifyIntent(message, groq) {
  try {
    const result = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "Classify the message into ONE word only: Greeting, GeneralEnquiry, PackageSelection, PriceNegotiation, SampleRequest, PaymentConfirmation, HighValuePackage, CustomRequest, Irrelevant."
        },
        { role: "user", content: message }
      ],
      temperature: 0
    });

    return result.choices[0].message.content.trim();
  } catch {
    return "GeneralEnquiry";
  }
}

// AI Human Corporate Response Generator
async function generateHumanResponse(message, groq) {
  try {
    const result = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `
You are a corporate customer service officer for Richie Digital Creations.

Respond briefly and professionally.
Maximum 4 short lines.
Do not negotiate price.
Do not explain internal policies.
Do not oversell.
Act like a trained Nigerian corporate staff.
`
        },
        { role: "user", content: message }
      ],
      temperature: 0.5
    });

    return result.choices[0].message.content.trim();
  } catch {
    return "Kindly let us know how we may assist you.";
  }
}

// 1-Hour Follow-Up Scheduler
export function startFollowUpScheduler(sendWhatsAppMessage) {
  setInterval(async () => {
    const sessions = getAllSessions();
    const now = Date.now();

    for (const [client, data] of sessions.entries()) {
      const oneHour = 60 * 60 * 1000;

      if (
        data.stage === "idle" &&
        !data.selectedPackage &&
        !data.followUpSent &&
        now - data.lastInteraction > oneHour
      ) {
        await sendWhatsAppMessage(
          client,
          "Good day. We are following up to confirm if you would like to proceed with any of our branding packages."
        );

        updateSession(client, { followUpSent: true });
      }
    }
  }, 5 * 60 * 1000);
}