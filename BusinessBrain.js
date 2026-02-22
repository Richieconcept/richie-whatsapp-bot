import { getSession, updateSession } from "./memory.js";

const PACKAGES_MESSAGE = `
—Promo Package—
✔ One logo design
✔ No revision
✔ 12 hours delivery
₦3,000 (FULL PAYMENT ONLY)

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

Which of these is suitable for your needs?
`;

export async function processMessage({
  clientNumber,
  message,
  messageType,
  rawMessage,
}) {
  const session = getSession(clientNumber);
  updateSession(clientNumber, { lastInteraction: Date.now() });

  // =========================
  // IMAGE HANDLING
  // =========================
  if (messageType === "image") {
    return {
      action: "reply",
      message: "Image received. Processing...",
    };
  }

  const text = message.toLowerCase();

  // =========================
  // SILENCE RULES
  // =========================
  if (
    text.includes("discount") ||
    text.includes("reduce") ||
    text.includes("cheaper")
  ) {
    return { action: "silent" };
  }

  if (text.includes("elite") || text.includes("full branding")) {
    return { action: "silent" };
  }

  // =========================
  // ASK FOR SAMPLES
  // =========================
  if (text.includes("sample")) {
    return {
      action: "reply",
      message:
        "Kindly go through our design samples here 👇👇\nhttps://web.facebook.com/profile.php?id=100092567179199&sk=photos",
    };
  }

  // =========================
  // ASK FOR LOGO OR BRANDING
  // =========================
  if (text.includes("logo") || text.includes("branding")) {
    updateSession(clientNumber, { stage: "collecting_details" });

    return {
      action: "reply",
      message:
        "Kindly provide:\n- Company Name\n- Slogan (optional)\n- Phone Number (optional)",
    };
  }

  // =========================
  // RECEIVE COMPANY NAME
  // =========================
  if (session.stage === "collecting_details") {
    updateSession(clientNumber, {
      stage: "show_packages",
      details: { ...session.details, companyName: message },
    });

    return {
      action: "reply",
      message: PACKAGES_MESSAGE,
    };
  }

  // =========================
  // PACKAGE SELECTION
  // =========================
  if (text.includes("promo")) {
    updateSession(clientNumber, {
      selectedPackage: "Promo",
      stage: "awaiting_payment",
    });

    return {
      action: "reply",
      message:
        "Promo Package selected.\nFull payment required before work begins.\n\nBank: Access Bank\nAccount Number: 1882633537\nAccount Name: Richie Digital Creations",
    };
  }

  if (
    text.includes("starter") ||
    text.includes("basic") ||
    text.includes("standard") ||
    text.includes("professional") ||
    text.includes("premium")
  ) {
    updateSession(clientNumber, {
      selectedPackage: message,
      stage: "awaiting_payment",
    });

    return {
      action: "reply",
      message:
        "50% deposit required to begin work.\n\nBank: Access Bank\nAccount Number: 1882633537\nAccount Name: Richie Digital Creations",
    };
  }

  return {
    action: "reply",
    message: "Kindly select a branding package.",
  };
}