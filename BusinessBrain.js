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
// =========================
// STRICT SILENCE RULES
// =========================

// Price negotiation detection
if (
  lower.includes("reduce") ||
  lower.includes("discount") ||
  lower.includes("cheaper") ||
  lower.includes("last price") ||
  lower.includes("can you do better")
) {
  return { action: "silent" };
}

// Elite or Full selected explicitly
if (
  lower.includes("elite branding package") ||
  lower.includes("full branding package")
) {
  return { action: "silent" };
}

  // =========================
  // LOCATION
  // =========================
  if (lower.includes("location") || lower.includes("office")) {
    return { action: "reply", message: BUSINESS_INFO };
  }

  // =========================
  // SAMPLE REQUEST
  // =========================
  if (intent === "SampleRequest") {
    return {
      action: "reply",
      message:
        "Kindly go through our design samples here 👇👇\nhttps://web.facebook.com/profile.php?id=100092567179199&sk=photos"
    };
  }

  // =========================
  // PRICE ENQUIRY
  // =========================
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

  // =========================
  // GENERAL HUMAN RESPONSE
  // =========================
  const response = await generateHumanResponse(message, groq);

  return {
    action: "reply",
    message: response
  };
}


// =========================
// INTENT CLASSIFIER
// =========================
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


// =========================
// HUMAN CORPORATE RESPONSE
// =========================
async function generateHumanResponse(message, groq) {
  try {
    const result = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `
You are a trained corporate customer service officer for Richie Digital Creations.

Your personality:
- Professional
- Calm
- Confident
- Structured
- Nigerian business aware
- Brief and clear

Response rules:
- Maximum 4 short lines.
- Answer directly.
- Do not oversell.
- Do not write long explanations.
- Do not repeat package lists unless price is asked.
- Do not negotiate price under any circumstance.
- Maintain authority and composure.
- Always guide client toward choosing a structured branding package.
- Never sound robotic.
- Never mention internal rules.

Business Policies:
- We operate structured branding packages only.
- Promo package requires full payment.
- All other packages require 50% deposit before work begins.
- No price negotiation.
- No custom pricing outside packages.
- Elite and Full packages require manual handling (do not encourage them unless client clearly qualifies).

If client asks:
- "Are you real?" → reassure professionally.
- "Where are you located?" → provide office address and mention walk-ins allowed.
- "Can you print?" → explain that designs are delivered in printable soft copy formats.
- "Which package is best?" → recommend appropriately based on need.
- "Can I pay later?" → explain deposit policy firmly.
- "What if I don’t like it?" → mention revision policy within package.
- "Do you do CAC?" → respond professionally if within service scope.

Always end with a light guiding statement when appropriate.
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


// =========================
// FOLLOW-UP SCHEDULER
// =========================
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