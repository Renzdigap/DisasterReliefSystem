import nodemailer from "nodemailer";

export interface VerificationEmailParams {
  toEmail: string;
  fullName: string;
  username: string;
  role: string;
  code: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isEmailConfigured(): boolean {
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  return user.length > 0 && pass.length > 0;
}

export async function sendVerificationOtpEmail({
  toEmail,
  fullName,
  username,
  role,
  code,
}: VerificationEmailParams): Promise<void> {
  if (/[\r\n]/.test(toEmail)) {
    throw new Error("Invalid recipient email address.");
  }

  const smtpUser = (process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  if (!smtpUser || !smtpPass) {
    throw new Error(
      "Email verification service is not configured yet (missing SMTP_USER / SMTP_PASS)."
    );
  }

  const smtpHost = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const smtpPort = Number(process.env.SMTP_PORT || 465);
  const secure = smtpPort === 465;
  const fromAddress = (
    process.env.SMTP_FROM || `"Disaster Relief System (DRRMS)" <${smtpUser}>`
  ).trim();

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  const safeName = escapeHtml(fullName);
  const safeUser = escapeHtml(username);
  const safeRole = escapeHtml(role);
  const safeCode = escapeHtml(code);

  const textBody = [
    `Hello ${fullName},`,
    "",
    `Use this 6-digit verification code to activate your Disaster Relief System (${role}) account:`,
    "",
    `Verification Code: ${code}`,
    `Username: ${username}`,
    "",
    "This code expires in 10 minutes. If you did not request this account, you can safely ignore this email.",
  ].join("\n");

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0f172a; background-color: #f8fafc;">
      <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px;">
        <h2 style="margin: 0 0 8px; font-size: 20px; color: #0f172a;">Verify your DRRMS Email</h2>
        <p style="margin: 0 0 18px; font-size: 14px; color: #475569; line-height: 1.5;">
          Hi <strong>${safeName}</strong>, thank you for registering as a <strong>${safeRole}</strong> (username: <code>${safeUser}</code>).
        </p>
        <p style="margin: 0 0 10px; font-size: 13px; color: #475569;">
          Enter this 6-digit verification code on the Sign Up screen:
        </p>
        <div style="margin: 12px 0 20px; padding: 16px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; text-align: center;">
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 28px; font-weight: 700; letter-spacing: 8px; color: #1d4ed8;">
            ${safeCode}
          </span>
        </div>
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          This code is valid for <strong>10 minutes</strong>. If you did not request this registration, you may safely ignore this message.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: fromAddress,
    to: toEmail,
    subject: `${code} is your Disaster Relief System verification code`,
    text: textBody,
    html: htmlBody,
  });
}
