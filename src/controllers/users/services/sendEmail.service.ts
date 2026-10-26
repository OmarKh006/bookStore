import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | undefined;

/** Created lazily so environment variables are read at first use (not import time). */
const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

/** Test helper: forget the cached transporter. */
export const resetTransporter = (): void => {
  transporter = undefined;
};

export const verifyTransporter = async (): Promise<void> => {
  try {
    await getTransporter().verify();
    console.log("Server is ready to take our messages");
  } catch (err) {
    console.error("Verification failed:", err);
  }
};

export interface SendEmailParams {
  to: string;
  link: string;
}

export const sendEmail = async ({ to, link }: SendEmailParams) => {
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: "Reset Password",
    html: `
      <div>
        <h4>Click on the link below to reset your password</h4>
        <a href="${link}">${link}</a>
      </div>
    `,
  };

  try {
    const info = await getTransporter().sendMail(mailOptions);
    console.log("Email sent:", info.response);

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log("Preview URL:", previewUrl);

    return info;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};
