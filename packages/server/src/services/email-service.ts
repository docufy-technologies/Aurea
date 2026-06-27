import fs from "fs";
import path from "path";

export class EmailService {
  private logFilePath: string;

  constructor() {
    // Save verification logs inside project scratch folder for automated reading
    const scratchDir = path.join(__dirname, "../../../../scratch");
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }
    this.logFilePath = path.join(scratchDir, "verification-emails.log");
  }

  /**
   * Simulates sending a verification email by printing it to the console
   * and writing it to a local debug log file for verification.
   * @param email Destination email
   * @param fullName User's name
   * @param token Verification token UUID
   */
  async sendVerificationEmail(
    email: string,
    fullName: string,
    token: string,
  ): Promise<void> {
    const confirmLink = `http://localhost:5173/confirm-email?token=${token}`;
    const emailContent = `
========================================================================
[AUREA MOCK EMAIL SERVICE]
Timestamp: ${new Date().toISOString()}
To: ${email} (${fullName})
Subject: Complete your Aurea Account Verification
Message:
Welcome to Aurea, the premium luxury experience.
To complete your registration and verify your account, click the link below:

${confirmLink}

This link is valid for 24 hours.
========================================================================
`;

    // Print to server standard output
    console.log(emailContent);

    // Append to local log file for testing assertions
    try {
      fs.appendFileSync(this.logFilePath, emailContent + "\n", "utf-8");
    } catch (err) {
      console.error("[EmailService] Failed to write mock email log:", err);
    }
  }
}
