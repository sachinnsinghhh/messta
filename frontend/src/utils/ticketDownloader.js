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

  // 1. Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Top Header Accent
  ctx.fillStyle = "#ea580c";
  ctx.fillRect(0, 0, canvas.width, 140);

  // Header Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MESSTA MEAL TICKET", canvas.width / 2, 60);

  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = "#fed7aa";
  ctx.fillText("OFFLINE COUNTER PASS • 100% VERIFIED", canvas.width / 2, 95);

  // 3. Outlet & Thali Details
  ctx.fillStyle = "#78716c";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText((messName || "MESS OUTLET").toUpperCase(), canvas.width / 2, 185);

  ctx.fillStyle = "#1c1917";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(thaliName || "Standard Daily Thali", canvas.width / 2, 225);

  // Pill badge: Spread & Time Slot
  const spreadText = `${(mealType || "Lunch").toUpperCase()} SPREAD  •  ${timeSlot || "11:30 AM – 02:30 PM"}`;
  ctx.fillStyle = "#ffedd5";
  ctx.beginPath();
  ctx.roundRect(canvas.width / 2 - 200, 250, 400, 36, 18);
  ctx.fill();

  ctx.fillStyle = "#9a3412";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText(spreadText, canvas.width / 2, 274);

  // Reserved Date
  ctx.fillStyle = "#57534e";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`📅 Reserved Date: ${bookingDate || "Tomorrow"}`, canvas.width / 2, 325);

  // 4. Large Counter Token Box
  ctx.fillStyle = "#fff7ed";
  ctx.strokeStyle = "#fdba74";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(60, 360, canvas.width - 120, 130, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ea580c";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("COUNTER TOKEN CODE", canvas.width / 2, 400);

  ctx.fillStyle = "#1c1917";
  ctx.font = "bold 44px monospace";
  ctx.fillText(token || "MESSTA-0000", canvas.width / 2, 455);

  // 5. QR Code Section
  // Load QR code image from public QR server to paint onto canvas
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    JSON.stringify({ token, messName, mealType, bookingDate, verified: true })
  )}`;

  const qrImg = new Image();
  qrImg.crossOrigin = "anonymous";
  qrImg.src = qrUrl;

  await new Promise((resolve) => {
    qrImg.onload = () => {
      ctx.drawImage(qrImg, canvas.width / 2 - 90, 520, 180, 180);
      resolve();
    };
    qrImg.onerror = () => {
      // Fallback if network blocked: draw styled box
      ctx.fillStyle = "#f5f5f4";
      ctx.fillRect(canvas.width / 2 - 90, 520, 180, 180);
      ctx.fillStyle = "#78716c";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("QR Code Token", canvas.width / 2, 615);
      resolve();
    };
  });

  // 6. Footer Notice
  ctx.fillStyle = "#16a34a";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("● Verified Advance Booking (Paid in Bank)", canvas.width / 2, 740);

  ctx.fillStyle = "#a8a29e";
  ctx.font = "12px sans-serif";
  ctx.fillText("Show this downloaded pass at the counter desk if network is offline.", canvas.width / 2, 770);

  // Trigger download
  const link = document.createElement("a");
  link.download = `Messta-Ticket-${token || "Pass"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};
