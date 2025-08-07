import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP connection failed:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    otp: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@seniorcare.com',
      to: email,
      subject: 'Password Reset Request - Senior Care Platform',
      html: this.getPasswordResetEmailTemplate(firstName, otp),
      text: this.getPasswordResetEmailText(firstName, otp),
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendMedicationReminder(
    userId: string,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user details from database
      const user = await this.getUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || 'noreply@seniorcare.com',
        to: user.email,
        subject: title,
        html: this.getMedicationReminderEmailTemplate(user.firstName, message, metadata),
        text: this.getMedicationReminderEmailText(user.firstName, message, metadata),
      };

      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Failed to send medication reminder email:', error);
      return { success: false, error: error.message };
    }
  }

  private async getUserById(userId: string) {
    // This is a placeholder - in a real implementation, you'd inject PrismaService
    // For now, we'll return a mock user to avoid circular dependencies
    return {
      id: userId,
      email: 'user@example.com',
      firstName: 'User',
      lastName: 'Name',
    };
  }

  private getPasswordResetEmailTemplate(firstName: string, otp: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
          }
          
          .header p {
            font-size: 16px;
            opacity: 0.9;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #2c3e50;
          }
          
          .message {
            font-size: 16px;
            margin-bottom: 30px;
            color: #555;
            line-height: 1.8;
          }
          
          .otp-container {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
          }
          
          .otp-label {
            color: white;
            font-size: 16px;
            margin-bottom: 15px;
            font-weight: 500;
          }
          
          .otp-code {
            font-size: 36px;
            font-weight: bold;
            color: white;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            background: rgba(255, 255, 255, 0.2);
            padding: 15px 25px;
            border-radius: 8px;
            display: inline-block;
          }
          
          .instructions {
            background-color: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            margin: 30px 0;
            border-radius: 0 8px 8px 0;
          }
          
          .instructions h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 18px;
          }
          
          .instructions ul {
            list-style: none;
            padding-left: 0;
          }
          
          .instructions li {
            margin-bottom: 10px;
            padding-left: 25px;
            position: relative;
            color: #555;
          }
          
          .instructions li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #28a745;
            font-weight: bold;
          }
          
          .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
          }
          
          .footer p {
            color: #6c757d;
            font-size: 14px;
            margin-bottom: 10px;
          }
          
          .footer .expiry {
            color: #dc3545;
            font-weight: 500;
          }
          
          .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          
          @media (max-width: 600px) {
            .container {
              margin: 10px;
              border-radius: 8px;
            }
            
            .header, .content, .footer {
              padding: 20px;
            }
            
            .otp-code {
              font-size: 28px;
              letter-spacing: 4px;
              padding: 12px 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🏥 Senior Care</div>
            <h1>Password Reset Request</h1>
            <p>Secure your account with a new password</p>
          </div>
          
          <div class="content">
            <div class="greeting">Hello ${firstName},</div>
            
            <div class="message">
              We received a request to reset your password for your Senior Care Platform account. 
              To proceed with the password reset, please use the verification code below.
            </div>
            
            <div class="otp-container">
              <div class="otp-label">Your Verification Code</div>
              <div class="otp-code">${otp}</div>
            </div>
            
            <div class="instructions">
              <h3>How to reset your password:</h3>
              <ul>
                <li>Enter the verification code above in the password reset form</li>
                <li>Create a new strong password</li>
                <li>Confirm your new password</li>
                <li>Click "Reset Password" to complete the process</li>
              </ul>
            </div>
            
            <div class="message">
              <strong>Security Note:</strong> This verification code will expire in 10 minutes for your security. 
              If you didn't request this password reset, please ignore this email and your password will remain unchanged.
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated message from Senior Care Platform</p>
            <p class="expiry">⏰ Verification code expires in 10 minutes</p>
            <p>If you have any questions, please contact our support team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetEmailText(firstName: string, otp: string): string {
    return `
Hello ${firstName},

We received a request to reset your password for your Senior Care Platform account.

Your verification code is: ${otp}

This code will expire in 10 minutes for your security.

If you didn't request this password reset, please ignore this email and your password will remain unchanged.

Best regards,
Senior Care Platform Team
    `;
  }

  private getMedicationReminderEmailTemplate(
    firstName: string,
    message: string,
    metadata?: Record<string, any>,
  ): string {
    const medicationName = metadata?.medicationName || 'Medication';
    const dosage = metadata?.dosage || '1 dose';
    const instructions = metadata?.instructions || '';
    const scheduledTime = metadata?.scheduledTime ? new Date(metadata.scheduledTime).toLocaleString() : 'now';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Medication Reminder</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8f9fa;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          
          .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          
          .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
          }
          
          .header p {
            font-size: 16px;
            opacity: 0.9;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .greeting {
            font-size: 20px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 20px;
          }
          
          .message {
            font-size: 16px;
            color: #555;
            margin-bottom: 25px;
            line-height: 1.8;
          }
          
          .medication-info {
            background-color: #f8f9fa;
            border-left: 4px solid #4CAF50;
            padding: 20px;
            margin: 25px 0;
            border-radius: 0 8px 8px 0;
          }
          
          .medication-info h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 18px;
          }
          
          .medication-detail {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
          }
          
          .medication-detail:last-child {
            border-bottom: none;
          }
          
          .detail-label {
            font-weight: 600;
            color: #495057;
          }
          
          .detail-value {
            color: #6c757d;
          }
          
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
            transition: all 0.3s ease;
          }
          
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
          }
          
          .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
          }
          
          .footer p {
            color: #6c757d;
            font-size: 14px;
            margin-bottom: 10px;
          }
          
          .logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          
          @media (max-width: 600px) {
            .container {
              margin: 10px;
              border-radius: 8px;
            }
            
            .header, .content, .footer {
              padding: 20px;
            }
            
            .medication-detail {
              flex-direction: column;
              gap: 5px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">💊 Senior Care</div>
            <h1>Medication Reminder</h1>
            <p>Time to take your medication</p>
          </div>
          
          <div class="content">
            <div class="greeting">Hello ${firstName},</div>
            
            <div class="message">
              ${message}
            </div>
            
            <div class="medication-info">
              <h3>Medication Details</h3>
              <div class="medication-detail">
                <span class="detail-label">Medication:</span>
                <span class="detail-value">${medicationName}</span>
              </div>
              <div class="medication-detail">
                <span class="detail-label">Dosage:</span>
                <span class="detail-value">${dosage}</span>
              </div>
              <div class="medication-detail">
                <span class="detail-label">Scheduled Time:</span>
                <span class="detail-value">${scheduledTime}</span>
              </div>
              ${instructions ? `
              <div class="medication-detail">
                <span class="detail-label">Instructions:</span>
                <span class="detail-value">${instructions}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="message">
              <strong>Important:</strong> Please take your medication as prescribed. 
              If you have any questions or concerns, please contact your healthcare provider.
            </div>
            
            <a href="#" class="cta-button">Confirm Medication Taken</a>
          </div>
          
          <div class="footer">
            <p>This is an automated reminder from Senior Care Platform</p>
            <p>If you have any questions, please contact our support team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getMedicationReminderEmailText(
    firstName: string,
    message: string,
    metadata?: Record<string, any>,
  ): string {
    const medicationName = metadata?.medicationName || 'Medication';
    const dosage = metadata?.dosage || '1 dose';
    const instructions = metadata?.instructions || '';
    const scheduledTime = metadata?.scheduledTime ? new Date(metadata.scheduledTime).toLocaleString() : 'now';

    return `
Hello ${firstName},

${message}

Medication Details:
- Medication: ${medicationName}
- Dosage: ${dosage}
- Scheduled Time: ${scheduledTime}
${instructions ? `- Instructions: ${instructions}` : ''}

Important: Please take your medication as prescribed. If you have any questions or concerns, please contact your healthcare provider.

Best regards,
Senior Care Platform Team
    `;
  }
} 