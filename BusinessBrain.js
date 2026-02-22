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
Location is never a barrier as we deliver in soft copy with printable formats.
`;

const COMPANY_DETAILS_REQUEST = `
To proceed with branding, kindly send your 👇

✅ Company Name  
✅ Slogan (Optional)  
✅ Phone Number (Optional)
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

  const lower = message.toLowerCase();

  // =========================
  // LOCATION REQUEST
  // =========================
  if (lower.includes("location") || lower.includes("office")) {
    return { action: "reply", message: BUSINESS_INFO };
  }

  // =========================
  // SAMPLE REQUEST
  // =========================
  if (lower.includes("sample") || lower.includes("previous work")) {
    return {
      action: "reply",
      message:
        "Kindly view our design samples here 👇👇\nhttps://web.facebook.com/profile.php?id=100092567179199&sk=photos"
    };
  }

  // =========================
  // PRICE ENQUIRY (EXCEPTION RULE)
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
        "\nKindly select the package that best suits your business."
    };
  }

  // =========================
  // NEGOTIATION HANDLING
  // =========================
  if (
    lower.includes("discount") ||
    lower.includes("reduce") ||
    lower.includes("cheaper") ||
    lower.includes("last price")
  ) {
    return {
      action: "reply",
      message:
        "Our pricing is structured to reflect the quality and value we deliver.\nKindly select the package that fits your budget."
    };
  }

  // =========================
  // COMPANY DETAILS COLLECTION
  // =========================
  if (!session.companyDetailsCollected) {
    updateSession(clientNumber, {
      companyDetailsCollected: true,
      stage: "awaiting_details"
    });

    return {
      action: "reply",
      message: COMPANY_DETAILS_REQUEST
    };
  }

  // =========================
  // PACKAGE SELECTION DETECTION
  // =========================
  if (lower.includes("promo") ||
      lower.includes("starter") ||
      lower.includes("basic") ||
      lower.includes("standard") ||
      lower.includes("professional") ||
      lower.includes("premium") ||
      lower.includes("elite") ||
      lower.includes("full")
  ) {
    updateSession(clientNumber, {
      selectedPackage: message,
      stage: "package_selected"
    });

    return {
      action: "reply",
      message:
        "Thank you for selecting your preferred package.\nTo proceed, kindly make the required deposit.\nWork begins immediately after confirmation."
    };
  }

  // =========================
  // HUMAN CORPORATE RESPONSE
  // =========================
  const response = await generateHumanResponse(message, groq);

  return {
    action: "reply",
    message: response + "\nKindly let us know how you would like to proceed."
  };
}

// =========================
// HUMAN-LIKE RESPONSE ENGINE
// =========================
async function generateHumanResponse(message, groq) {
  try {
    const result = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `
You are the official corporate customer service executive of Richie Digital Creations.

You behave like a trained Nigerian business professional.

BUSINESS KNOWLEDGE:
- Structured branding packages only.
- Work starts after required deposit.
- No custom pricing outside packages.
- Designs delivered in soft copy & printable format.
- Office in Kubwa, Abuja.
- Location is never a barrier.

BEHAVIOR RULES:
- Maximum 4 short lines.
- Clear, confident, professional.
- Do not oversell.
- Do not negotiate.
- If confused, clarify briefly.
- Guide client toward selecting a package.
- Maintain authority.
`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.6
    });

    return result.choices[0].message.content.trim();
  } catch {
    return "Kindly clarify your request so we may assist you properly.";
  }
}

// =========================
// FOLLOW-UP SYSTEM
// =========================
export function startFollowUpScheduler(sendWhatsAppMessage) {
  setInterval(async () => {
    const sessions = getAllSessions();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const [client, data] of sessions.entries()) {
      if (
        data.stage === "awaiting_details" &&
        !data.followUpSent &&
        now - data.lastInteraction > oneHour
      ) {
        await sendWhatsAppMessage(
          client,
          "Kindly send your company details so we may proceed with your branding."
        );

        updateSession(client, { followUpSent: true });
      }
    }
  }, 5 * 60 * 1000);
}