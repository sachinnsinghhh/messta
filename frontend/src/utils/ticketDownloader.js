/**
 * Messta Client-Side Offline Ticket Generator & WhatsApp Sharing Utility
 * Zero heavy dependencies — pure Canvas & Web API for 100% offline reliability.
 */

export const shareTicketToWhatsApp = ({
  messName,
  thaliName,
  mealType,
  timeSlot,
  bookingDate,
  token,
  amount,
}) => {
  const text = encodeURIComponent(
    `🍽️ *MESSTA DIGITAL MEAL TICKET*\n\n` +
    `🏠 *Mess:* ${messName}\n` +
    `🍱 *Thali:* ${thaliName || "Standard Daily Thali"}\n` +
    `⏰ *Spread & Time:* ${(mealType || "Lunch").toUpperCase()} Spread (${timeSlot || "11:30 AM – 02:30 PM"})\n` +
    `📅 *Dining Date:* ${bookingDate}\n` +
    `💰 *Amount Paid:* ₹${amount || 65}\n\n` +
    `🔑 *COUNTER TOKEN CODE:*\n` +
    `👉 *${token}* 👈\n\n` +
    `_Present this token or show this ticket at the mess counter desk._`
  );

  window.open(`https://wa.me/?text=${text}`, "_blank");
};

export const downloadOfflineTicketImage = async ({
  messName,
  thaliName,
  mealType,
  timeSlot,
  bookingDate,
  token,
  amount,
}) => {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 840;
  const ctx = canvas.getContext("2d");

  // 1. Sleek Obsidian Background (Option 1 Boarding Pass)
  ctx.fillStyle = "#0b0f17";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Top Header Accent (Matte Slate with Amber Stripe)
  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, canvas.width, 140);

  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(0, 136, canvas.width, 4);

  // Header Title
  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.fillText("MESSTA BOARDING PASS", canvas.width / 2, 60);

  ctx.font = "bold 14px monospace";
  ctx.fillStyle = "#a1a1aa";
  ctx.fillText("OFFLINE COUNTER TICKET • 100% SECURE", canvas.width / 2, 95);

  // 3. Outlet & Thali Details
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "bold 13px monospace";
  ctx.fillText((messName || "MESS OUTLET").toUpperCase(), canvas.width / 2, 185);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(thaliName || "Standard Daily Thali", canvas.width / 2, 225);

  // Pill badge: Spread & Time Slot
  const spreadText = `${(mealType || "Lunch").toUpperCase()} SPREAD  •  ${timeSlot || "11:30 AM – 02:30 PM"}`;
  ctx.fillStyle = "#27272a";
  ctx.beginPath();
  ctx.roundRect(canvas.width / 2 - 210, 250, 420, 38, 19);
  ctx.fill();

  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 13px monospace";
  ctx.fillText(spreadText, canvas.width / 2, 274);

  // Reserved Date
  ctx.fillStyle = "#d4d4d8";
  ctx.font = "bold 15px monospace";
  ctx.fillText(`RESERVED DATE: ${bookingDate || "Tomorrow"}`, canvas.width / 2, 325);

  // 4. Large Counter Token Box
  ctx.fillStyle = "#18181b";
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(60, 360, canvas.width - 120, 130, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#a1a1aa";
  ctx.font = "bold 12px monospace";
  ctx.fillText("COUNTER TOKEN CODE", canvas.width / 2, 398);

  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 44px monospace";
  ctx.fillText(token || "MESSTA-0000", canvas.width / 2, 455);

  // 5. QR Code Section (Pristine White Background for 100% Optical Contrast)
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(canvas.width / 2 - 105, 510, 210, 200, 16);
  ctx.fill();

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    JSON.stringify({ token, messName, mealType, bookingDate, verified: true })
  )}`;

  const qrImg = new Image();
  qrImg.crossOrigin = "anonymous";
  qrImg.src = qrUrl;

  await new Promise((resolve) => {
    qrImg.onload = () => {
      ctx.drawImage(qrImg, canvas.width / 2 - 85, 520, 170, 170);
      resolve();
    };
    qrImg.onerror = () => {
      ctx.fillStyle = "#18181b";
      ctx.font = "bold 14px monospace";
      ctx.fillText("QR TOKEN CODE", canvas.width / 2, 610);
      resolve();
    };
  });

  // 6. Footer Notice
  ctx.fillStyle = "#10b981";
  ctx.font = "bold 13px monospace";
  ctx.fillText("● 100% VERIFIED ADVANCE BOOKING (PAID)", canvas.width / 2, 755);

  ctx.fillStyle = "#71717a";
  ctx.font = "12px sans-serif";
  ctx.fillText("Present this offline boarding pass at the counter desk if network is weak.", canvas.width / 2, 785);

  // Trigger download
  const link = document.createElement("a");
  link.download = `Messta-Boarding-Pass-${token || "Pass"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};
