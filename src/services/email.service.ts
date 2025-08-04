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
} 