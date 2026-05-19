const nodemailer = require("nodemailer");

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE || "false") === "true";

  if (!host || !user || !pass) {
    throw new Error("SMTP config missing (SMTP_HOST/SMTP_USER/SMTP_PASS)");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendOtpEmail({ to, code, expiresMinutes }) {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const subject = "Ma xac thuc dang ky EcoTechStore";
  const text = `Ma xac thuc cua ban la: ${code}. Ma co hieu luc trong ${expiresMinutes} phut.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>EcoTechStore</h2>
      <p>Ma xac thuc dang ky cua ban la:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</p>
      <p>Ma co hieu luc trong ${expiresMinutes} phut.</p>
    </div>
  `;

  await transporter.sendMail({ from, to, subject, text, html });
}

module.exports = { sendOtpEmail };
