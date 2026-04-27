import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendOrderConfirmationEmail(order: {
  orderNumber: string
  name: string
  email: string
  items: { name: string; quantity: number; price: number; unit: string }[]
  totalAmount: number
}) {
  const itemsHtml = order.items
    .map(i => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ebe3;">${i.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ebe3;text-align:center;">${i.quantity} ${i.unit}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ebe3;text-align:right;">£${(i.price * i.quantity).toFixed(2)}</td>
    </tr>`)
    .join('')

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: order.email,
    subject: `Order confirmed – ${order.orderNumber} | Fresh Picks`,
    html: `
      <div style="font-family:'Georgia',serif;max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #e8ddd0;border-radius:12px;overflow:hidden;">
        <div style="background:#2d5a27;padding:32px 32px 24px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🌿</div>
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:0.5px;">Fresh Picks</h1>
          <p style="color:#a8d5a2;margin:4px 0 0;font-size:13px;">Order Confirmed</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#5a4a3a;font-size:16px;margin:0 0 8px;">Hi ${order.name},</p>
          <p style="color:#8a7a6a;font-size:14px;margin:0 0 24px;">Your order has been received. We'll have it ready for collection.</p>
          <div style="background:#f8f4ef;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;color:#5a4a3a;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Order number</p>
            <p style="margin:4px 0 0;color:#2d5a27;font-size:20px;font-family:monospace;font-weight:bold;">${order.orderNumber}</p>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f0ebe3;">
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#8a7a6a;text-transform:uppercase;letter-spacing:0.5px;">Item</th>
                <th style="padding:8px 12px;text-align:center;font-size:12px;color:#8a7a6a;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
                <th style="padding:8px 12px;text-align:right;font-size:12px;color:#8a7a6a;text-transform:uppercase;letter-spacing:0.5px;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding:12px;font-weight:bold;color:#5a4a3a;">Total</td>
                <td style="padding:12px;font-weight:bold;color:#2d5a27;text-align:right;font-size:18px;">£${order.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          <div style="margin-top:24px;padding:16px;background:#edf7ec;border-radius:8px;border-left:4px solid #2d5a27;">
            <p style="margin:0;color:#2d5a27;font-size:14px;">📍 Collection details will be shared in the WhatsApp group.</p>
          </div>
        </div>
        <div style="padding:20px 32px;border-top:1px solid #e8ddd0;text-align:center;">
          <p style="margin:0;color:#b0a090;font-size:12px;">Fresh Picks · Questions? Reply to this email.</p>
        </div>
      </div>
    `,
  })
}

export async function sendNewOrderNotificationEmail(order: {
  orderNumber: string
  name: string
  phone: string
  items: { name: string; quantity: number }[]
  totalAmount: number
}) {
  const itemsList = order.items.map(i => `• ${i.name} × ${i.quantity}`).join('\n')
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `🛒 New order ${order.orderNumber} from ${order.name}`,
    html: `
      <div style="font-family:monospace;max-width:480px;margin:0 auto;padding:24px;background:#1a1a1a;color:#d4f7d4;border-radius:8px;">
        <h2 style="color:#4ade80;margin:0 0 16px;">New Order Received</h2>
        <p><strong>Order:</strong> ${order.orderNumber}</p>
        <p><strong>Customer:</strong> ${order.name}</p>
        <p><strong>Phone:</strong> ${order.phone}</p>
        <p><strong>Items:</strong><br><pre style="color:#a0f0a0;">${itemsList}</pre></p>
        <p><strong>Total:</strong> £${order.totalAmount.toFixed(2)}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#2d5a27;color:#fff;border-radius:6px;text-decoration:none;">View in Dashboard →</a>
      </div>
    `,
  })
}

export async function sendOtpEmail(email: string, otp: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: `${otp} – Fresh Picks Admin OTP`,
    html: `
      <div style="font-family:'Georgia',serif;max-width:400px;margin:0 auto;padding:32px;background:#fffdf9;border:1px solid #e8ddd0;border-radius:12px;text-align:center;">
        <div style="font-size:32px;margin-bottom:16px;">🔐</div>
        <h2 style="color:#2d5a27;margin:0 0 8px;">Admin Login OTP</h2>
        <p style="color:#8a7a6a;font-size:14px;">Your one-time password (valid for 10 minutes):</p>
        <div style="background:#f0ebe3;border-radius:8px;padding:20px;margin:16px 0;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2d5a27;font-family:monospace;">${otp}</span>
        </div>
        <p style="color:#b0a090;font-size:12px;margin:0;">Never share this code. Fresh Picks will never ask for it.</p>
      </div>
    `,
  })
}

export async function sendSecurityAlertEmail(event: string, details: string, ip: string, userAgent: string) {
  const adminEmail = process.env.SMTP_USER || process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const isCritical = event.includes('BLOCKED');
  const color = isCritical ? '#dc2626' : '#ea580c';

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: adminEmail,
    subject: `⚠️ Security Alert: ${event} – Fresh Picks`,
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:500px;margin:0 auto;padding:24px;border:2px solid ${color};border-radius:12px;background:#fef2f2;">
        <h2 style="color:${color};margin-top:0;">Security Event Detected</h2>
        <p style="font-size:14px;color:#333;"><strong>Event:</strong> ${event}</p>
        <p style="font-size:14px;color:#333;"><strong>Details:</strong> ${details}</p>
        <div style="background:#fee2e2;padding:16px;border-radius:8px;margin-top:16px;">
          <p style="margin:0 0 8px;font-size:12px;color:#7f1d1d;"><strong>IP Address:</strong> ${ip}</p>
          <p style="margin:0;font-size:12px;color:#7f1d1d;"><strong>Device:</strong> ${userAgent}</p>
        </div>
        <p style="font-size:12px;color:#666;margin-top:24px;">If this was you, you can safely ignore this email. If not, your security systems successfully intercepted the event.</p>
      </div>
    `
  })
}

export async function sendOrderStatusUpdateEmail(
  toEmail: string,
  name: string,
  orderNumber: string,
  status: string,
  origin: string = 'http://localhost:3000',
  enableFeedback: boolean = true
) {
  if (!toEmail) return;
  
  const statusColors: Record<string, string> = {
    'pending': '#ea580c',
    'collected': '#2d5a27',
    'cancelled': '#dc2626'
  };
  const color = statusColors[status.toLowerCase()] || '#5a4a3a';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Georgia', serif; background-color: #f8f0e3; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background-color: #fffdf9; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2ccb0; text-align: center; }
        .header { background-color: #2d5a27; color: #fff; padding: 20px; }
        .content { padding: 30px; color: #3a2a1a; }
        .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; background-color: ${color}; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0; }
        .feedback-btn { display: inline-block; padding: 12px 24px; border-radius: 12px; background-color: #f59e0b; color: #78350f; font-weight: bold; text-decoration: none; margin-top: 15px; border: 1px solid #d97706; }
        .footer { padding: 20px; font-size: 14px; color: #8a7a6a; border-top: 1px solid #e2ccb0; font-family: sans-serif; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0; font-weight: normal;">🌿 Fresh Picks</h2>
        </div>
        <div class="content">
          <p style="font-size: 18px; margin-top: 0;">Hello ${name},</p>
          <p>The status of your order <strong>#${orderNumber}</strong> has been updated to:</p>
          <div class="status-badge">${status}</div>
          ${status === 'collected' ? '<p>Thank you for picking up your fresh produce. See you next week!</p>' : ''}
          ${status === 'collected' && enableFeedback ? `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px dashed #e2ccb0;">
              <p style="margin-bottom: 10px;"><strong>How did we do?</strong> Rate your fresh picks!</p>
              <a href="${origin}/feedback?orderId=${orderNumber}" class="feedback-btn">Leave Feedback ⭐</a>
            </div>
          ` : ''}
          ${status === 'cancelled' ? '<p>If you have any questions, please reply to this email.</p>' : ''}
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Fresh Picks. Farm fresh, delivered with love.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Fresh Picks" <noreply@freshpicks.com>',
      to: toEmail,
      subject: `Order Update #${orderNumber} - ${status.toUpperCase()}`,
      html: html,
    });
    console.log(`Order status email sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending order status email:', error);
  }
}

export async function sendOrderCancellationEmail(order: {
  orderNumber: string;
  name: string;
  email: string;
  items: { name: string; quantity: number; price: number; unit: string }[];
  totalAmount: number;
}) {
  const itemsHtml = order.items
    .map(i => `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ebe3;">${i.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ebe3;text-align:center;">${i.quantity} ${i.unit}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0ebe3;text-align:right;">£${(i.price * i.quantity).toFixed(2)}</td>
    </tr>`)
    .join('');

  const customerHtml = `
    <div style="font-family:'Georgia',serif;max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #e8ddd0;border-radius:12px;overflow:hidden;">
      <div style="background:#dc2626;padding:32px 32px 24px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🌿</div>
        <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:0.5px;">Fresh Picks</h1>
        <p style="color:#fca5a5;margin:4px 0 0;font-size:13px;">Order Cancelled</p>
      </div>
      <div style="padding:32px;">
        <p style="color:#5a4a3a;font-size:16px;margin:0 0 8px;">Hi ${order.name},</p>
        <p style="color:#8a7a6a;font-size:14px;margin:0 0 24px;">Your order has been <strong style="color:#dc2626;">cancelled</strong> as per your request. If this was a mistake, please contact us immediately.</p>
        <div style="background:#fff5f5;border-radius:8px;padding:16px;margin-bottom:24px;border-left:4px solid #dc2626;">
          <p style="margin:0;color:#5a4a3a;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Cancelled Order</p>
          <p style="margin:4px 0 0;color:#dc2626;font-size:20px;font-family:monospace;font-weight:bold;">${order.orderNumber}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f0ebe3;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#8a7a6a;text-transform:uppercase;letter-spacing:0.5px;">Item</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px;color:#8a7a6a;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
              <th style="padding:8px 12px;text-align:right;font-size:12px;color:#8a7a6a;text-transform:uppercase;letter-spacing:0.5px;">Price</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="text-align:right;padding:12px;font-weight:bold;color:#5a4a3a;font-size:15px;">
          Total: £${order.totalAmount.toFixed(2)}
        </div>
        <p style="color:#8a7a6a;font-size:13px;margin-top:24px;">Questions? Just reply to this email.</p>
      </div>
      <div style="padding:20px;font-size:12px;color:#8a7a6a;border-top:1px solid #e8ddd0;text-align:center;font-family:sans-serif;">
        © ${new Date().getFullYear()} Fresh Picks — Farm fresh, delivered with love.
      </div>
    </div>
  `;

  if (order.email) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: order.email,
      subject: `Order Cancelled – ${order.orderNumber} | Fresh Picks`,
      html: customerHtml,
    });
  }

  // Also notify admin
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (adminEmail) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: adminEmail,
      subject: `⚠️ Customer Cancelled Order ${order.orderNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;">
          <h2 style="color:#dc2626;margin-top:0;">Order Cancelled by Customer</h2>
          <p><strong>Order:</strong> ${order.orderNumber}</p>
          <p><strong>Customer:</strong> ${order.name}</p>
          <p><strong>Email:</strong> ${order.email || 'N/A'}</p>
          <p><strong>Total:</strong> £${order.totalAmount.toFixed(2)}</p>
          <p style="color:#6b7280;font-size:13px;">Stock has been restored automatically.</p>
        </div>
      `,
    });
  }
}

