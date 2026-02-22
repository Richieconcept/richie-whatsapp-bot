import { getSession, updateSession, getAllSessions } from "./memory.js";

const BUSINESS_INFO = `
Richie Digital Creations
Phone: 08125128766
Office Address:
B3 Diwani Plaza, 14 Akufor Along Aso Savings Road,
Before Byazhin Junction, Kubwa, Abuja.

Walk-ins are allowed.
Location is never a barrier.
All designs are delivered in soft copy with printable formats.
`;

const PACKAGES = `
—Promo Package— ₦3,000 (Full Payment Only)
—Starter Branding Package— ₦5,000 (50% deposit)
—Basic Branding Package— ₦7,000 (50% deposit)
—Standard Branding Package— ₦15,000 (50% deposit)
—Professional Branding Package— ₦30,000 (50% deposit)
—Premium Branding Package— ₦60,000 (50% deposit)
—Elite Branding Package— ₦120,000
—Full Branding Package— ₦300,000

Kindly indicate your preferred package.
`;

export async function processMessage({
  clientNumber,
  message,
  messageType,
  groq,
  sendWhatsAppMessage
}) {
  const session = getSession(clientNumber);
  updateSession(clientNumber, { lastInteraction: Date.now() });

  if (messageType !== "text") {
    return { action: "reply", message: "Message received." };
  }

  const intent = await classifyIntent(message, groq);

  // Silence Rules
  if (
    intent === "PriceNegotiation" ||
    intent === "HighValuePackage" ||
    intent === "CustomRequest"
  ) {
    return { action: "silent" };
  }

  if (intent === "Greeting") {
    return {
      action: "reply",
      message:
        "Good day. Welcome to Richie Digital Creations.\n\nWe specialize in professional branding solutions.\n\n" +
        PACKAGES
    };
  }

  if (intent === "SampleRequest") {
    return {
      action: "reply",
      message:
        "Kindly go through our design samples here 👇👇\nhttps://web.facebook.com/profile.php?id=100092567179199&sk=photos"
    };
  }

  if (intent === "GeneralEnquiry") {
    if (message.toLowerCase().includes("location")) {
      return { action: "reply", message: BUSINESS_INFO };
    }

    return {
      action: "reply",
      message:
        "We provide structured corporate branding solutions including logo design, identity systems, and complete brand packages.\n\n" +
        PACKAGES
    };
  }

  if (intent === "PackageSelection") {
    updateSession(clientNumber, {
      selectedPackage: message,
      stage: "awaiting_payment"
    });

    return {
      action: "reply",
      message:
        "Kindly proceed with payment to begin work.\n\nBank: Access Bank\nAccount Number: 1882633537\nAccount Name: Richie Digital Creations"
    };
  }

  if (intent === "PaymentConfirmation") {
    return {
      action: "reply",
      message: "Payment confirmation received. Our team will verify and revert shortly."
    };
  }

  return {
    action: "reply",
    message:
      "Kindly let us know how we may assist you regarding our branding packages."
  };
}

// AI Intent Classifier
async function classifyIntent(message, groq) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "Classify the user message into ONE word only: Greeting, GeneralEnquiry, PackageSelection, PriceNegotiation, SampleRequest, PaymentConfirmation, HighValuePackage, CustomRequest, Irrelevant."
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0
    });

    return response.choices[0].message.content.trim();
  } catch {
    return "GeneralEnquiry";
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