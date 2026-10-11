import { getAppBaseUrl } from './client';

export interface EmailTemplateData {
  welcomeAccount?: {
    name: string;
    email: string;
    role: string;
    loginUrl?: string;
  };
  partnerAssignment?: {
    partnerName: string;
    displayId: string;
    customerName?: string;
    city?: string;
    dashboardUrl?: string;
  };
  technicianAssignment?: {
    technicianName: string;
    displayId: string;
    customerName?: string;
    customerAddress?: string;
    city?: string;
    trackingUrl?: string;
    dashboardUrl?: string;
  };
  installationSubmitted?: {
    reviewerName: string;
    displayId: string;
    technicianName?: string;
    reviewUrl?: string;
  };
  revisitRequested?: {
    technicianName: string;
    displayId: string;
    reason: string;
    jobUrl?: string;
  };
  installationVerified?: {
    recipientName: string;
    displayId: string;
    customerName?: string;
  };
}

function getBaseLayout(title: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f6f8;
      color: #1f2937;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6f8;
      padding: 30px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
      border: 1px solid #e5e7eb;
    }
    .header {
      background-color: #243B36;
      padding: 24px 32px;
      text-align: left;
    }
    .header-logo {
      color: #ffffff;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      text-decoration: none;
      display: inline-block;
    }
    .header-accent {
      color: #D6A84F;
    }
    .content {
      padding: 32px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .text {
      font-size: 15px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 20px;
    }
    .info-card {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      margin-bottom: 8px;
    }
    .info-row:last-child {
      margin-bottom: 0;
    }
    .info-label {
      font-weight: 600;
      color: #374151;
      width: 140px;
      font-size: 14px;
    }
    .info-value {
      color: #111827;
      font-size: 14px;
    }
    .btn-container {
      margin: 28px 0 16px 0;
    }
    .btn {
      display: inline-block;
      background-color: #243B36;
      color: #ffffff !important;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      background-color: #e0e7ff;
      color: #3730a3;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px 32px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="#" class="header-logo">ACS <span class="header-accent">ENERGY</span></a>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ACS Energy. All rights reserved.</p>
        <p>This is an automated notification from the ACS Energy Platform.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export function renderWelcomeAccountEmail(data: NonNullable<EmailTemplateData['welcomeAccount']>) {
  const loginUrl = data.loginUrl || `${getAppBaseUrl()}/login`;
  const subject = `Welcome to ACS Energy — Account Created (${data.role})`;

  const htmlBody = getBaseLayout(
    subject,
    `
    <h1 class="title">Welcome to ACS Energy</h1>
    <p class="text">Hello <strong>${data.name}</strong>,</p>
    <p class="text">An account has been created for you on the ACS Energy installation management portal.</p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Account Role:</span>
        <span class="info-value"><span class="badge">${data.role}</span></span>
      </div>
      <div class="info-row">
        <span class="info-label">Email Address:</span>
        <span class="info-value"><strong>${data.email}</strong></span>
      </div>
    </div>

    <p class="text">You can now access your dashboard using your registered credentials.</p>

    <div class="btn-container">
      <a href="${loginUrl}" class="btn">Log In to ACS Portal</a>
    </div>

    <p class="text" style="font-size: 13px; color: #6b7280;">If you did not request this account or have questions, please contact your organization administrator.</p>
    `
  );

  return { subject, htmlBody };
}

export function renderPartnerAssignmentEmail(data: NonNullable<EmailTemplateData['partnerAssignment']>) {
  const dashboardUrl = data.dashboardUrl || `${getAppBaseUrl()}/partner/dashboard`;
  const subject = `New Installation Order Assigned: ${data.displayId}`;

  const htmlBody = getBaseLayout(
    subject,
    `
    <h1 class="title">New Installation Order Assigned</h1>
    <p class="text">Hello <strong>${data.partnerName}</strong>,</p>
    <p class="text">A new EV charger installation order has been assigned to your organization.</p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Order ID:</span>
        <span class="info-value"><strong>${data.displayId}</strong></span>
      </div>
      ${data.customerName ? `
      <div class="info-row">
        <span class="info-label">Customer Name:</span>
        <span class="info-value">${data.customerName}</span>
      </div>` : ''}
      ${data.city ? `
      <div class="info-row">
        <span class="info-label">Location:</span>
        <span class="info-value">${data.city}</span>
      </div>` : ''}
    </div>

    <p class="text">Please log in to your partner dashboard to assign a qualified technician to execute this order.</p>

    <div class="btn-container">
      <a href="${dashboardUrl}" class="btn">View Order in Partner Dashboard</a>
    </div>
    `
  );

  return { subject, htmlBody };
}

export function renderTechnicianAssignmentEmail(data: NonNullable<EmailTemplateData['technicianAssignment']>) {
  const actionUrl = data.trackingUrl || data.dashboardUrl || `${getAppBaseUrl()}/technician/dashboard`;
  const subject = `New Job Assigned: ${data.displayId}`;

  const htmlBody = getBaseLayout(
    subject,
    `
    <h1 class="title">New Job Assigned</h1>
    <p class="text">Hello <strong>${data.technicianName}</strong>,</p>
    <p class="text">You have been assigned a new EV charger installation job.</p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Installation ID:</span>
        <span class="info-value"><strong>${data.displayId}</strong></span>
      </div>
      ${data.customerName ? `
      <div class="info-row">
        <span class="info-label">Customer Name:</span>
        <span class="info-value">${data.customerName}</span>
      </div>` : ''}
      ${data.customerAddress ? `
      <div class="info-row">
        <span class="info-label">Address:</span>
        <span class="info-value">${data.customerAddress}${data.city ? `, ${data.city}` : ''}</span>
      </div>` : ''}
    </div>

    <p class="text">Please open the link below to access your job checklist, submit evidence photos, and complete the installation.</p>

    <div class="btn-container">
      <a href="${actionUrl}" class="btn">Open Technician Job Workflow</a>
    </div>
    `
  );

  return { subject, htmlBody };
}

export function renderInstallationSubmittedEmail(data: NonNullable<EmailTemplateData['installationSubmitted']>) {
  const reviewUrl = data.reviewUrl || `${getAppBaseUrl()}/partner/dashboard`;
  const subject = `Installation Submitted for Review: ${data.displayId}`;

  const htmlBody = getBaseLayout(
    subject,
    `
    <h1 class="title">Installation Ready for Verification</h1>
    <p class="text">Hello <strong>${data.reviewerName}</strong>,</p>
    <p class="text">Technician ${data.technicianName ? `<strong>${data.technicianName}</strong>` : ''} has submitted the installation checklist and evidence photos for review.</p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Order ID:</span>
        <span class="info-value"><strong>${data.displayId}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Current Status:</span>
        <span class="info-value"><span class="badge" style="background-color: #fef3c7; color: #92400e;">UNDER VERIFICATION</span></span>
      </div>
    </div>

    <p class="text">Please inspect the submitted checklist items and evidence photos to verify or request a revisit.</p>

    <div class="btn-container">
      <a href="${reviewUrl}" class="btn">Review Installation Evidence</a>
    </div>
    `
  );

  return { subject, htmlBody };
}

export function renderRevisitRequestedEmail(data: NonNullable<EmailTemplateData['revisitRequested']>) {
  const actionUrl = data.jobUrl || `${getAppBaseUrl()}/technician/dashboard`;
  const subject = `Revisit Required for Installation: ${data.displayId}`;

  const htmlBody = getBaseLayout(
    subject,
    `
    <h1 class="title" style="color: #dc2626;">Revisit Required</h1>
    <p class="text">Hello <strong>${data.technicianName}</strong>,</p>
    <p class="text">Your submission for installation <strong>${data.displayId}</strong> requires corrections or a revisit.</p>

    <div class="info-card" style="border-left: 4px solid #dc2626; background-color: #fef2f2;">
      <div class="info-row">
        <span class="info-label" style="color: #991b1b;">Revisit Reason:</span>
      </div>
      <p style="margin-top: 8px; font-size: 14px; color: #7f1d1d; font-style: italic;">"${data.reason}"</p>
    </div>

    <p class="text">Please address the remarks above, update the required checklist/photos, and resubmit for verification.</p>

    <div class="btn-container">
      <a href="${actionUrl}" class="btn" style="background-color: #dc2626;">Open Job & Update Submission</a>
    </div>
    `
  );

  return { subject, htmlBody };
}

export function renderInstallationVerifiedEmail(data: NonNullable<EmailTemplateData['installationVerified']>) {
  const subject = `Installation Verified: ${data.displayId}`;

  const htmlBody = getBaseLayout(
    subject,
    `
    <h1 class="title" style="color: #16a34a;">Installation Verified & Completed</h1>
    <p class="text">Hello <strong>${data.recipientName}</strong>,</p>
    <p class="text">Installation order <strong>${data.displayId}</strong> has been successfully reviewed and verified.</p>

    <div class="info-card" style="border-left: 4px solid #16a34a;">
      <div class="info-row">
        <span class="info-label">Order ID:</span>
        <span class="info-value"><strong>${data.displayId}</strong></span>
      </div>
      ${data.customerName ? `
      <div class="info-row">
        <span class="info-label">Customer Name:</span>
        <span class="info-value">${data.customerName}</span>
      </div>` : ''}
      <div class="info-row">
        <span class="info-label">Status:</span>
        <span class="info-value"><span class="badge" style="background-color: #dcfce7; color: #166534;">VERIFIED</span></span>
      </div>
    </div>

    <p class="text">All checklist items and quality standards have been satisfied. No further action is required for this installation.</p>
    `
  );

  return { subject, htmlBody };
}
