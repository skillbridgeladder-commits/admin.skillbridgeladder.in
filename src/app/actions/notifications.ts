"use server";

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a security threat alert to the platform administrator.
 */
export async function sendThreatAlert(data: {
    threatType: string;
    ip: string;
    location: string;
    path: string;
    adminEmail: string;
}) {
    if (!process.env.RESEND_API_KEY || !data.adminEmail) {
        console.log("Resend API Key or Admin Email missing. Alert logged:", data);
        return;
    }

    try {
        await resend.emails.send({
            from: 'SBL Security <security@skillbridgeladder.in>',
            to: data.adminEmail,
            subject: `🚨 Security Threat Detected: ${data.threatType.toUpperCase()}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ff4444; border-radius: 12px; background: #fff;">
                    <img src="https://hire.skillbridgeladder.in/logo.jpg" alt="SBL Logo" style="width: 120px; margin-bottom: 20px;" />
                    <h2 style="color: #ff4444; margin-top: 0;">SBL Security Alert</h2>
                    <p>A high-severity threat has been detected on the platform.</p>
                    <hr style="border: none; border-top: 1px solid #eee;" />
                    <p><strong>Type:</strong> ${data.threatType.replace(/_/g, ' ').toUpperCase()}</p>
                    <p><strong>Source IP:</strong> ${data.ip}</p>
                    <p><strong>Location:</strong> ${data.location}</p>
                    <p><strong>Path:</strong> ${data.path}</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    <hr style="border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 12px; color: #777;">Please log into the Security Dashboard to resolve this threat.</p>
                </div>
            `
        });
    } catch (err) {
        console.error("Failed to send threat alert:", err);
    }
}

/**
 * Sends a job status update notification to a candidate.
 */
export async function sendJobStatusAlert(data: {
    userEmail: string;
    userName: string;
    jobTitle: string;
    newStatus: string;
}) {
    if (!process.env.RESEND_API_KEY || !data.userEmail) {
        console.log("Resend API Key or User Email missing. Status update logged:", data);
        return;
    }

    try {
        await resend.emails.send({
            from: 'SkillBridge Ladder <onboard@hire.skillbridgeladder.in>',
            to: data.userEmail,
            subject: `Update on your application for ${data.jobTitle}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #3b82f6; border-radius: 12px; background: #fff;">
                    <img src="https://hire.skillbridgeladder.in/logo.jpg" alt="SBL Logo" style="width: 120px; margin-bottom: 20px;" />
                    <h2 style="color: #3b82f6; margin-top: 0;">Application Update</h2>
                    <p>Hello ${data.userName},</p>
                    <p>The status of your application for <strong>${data.jobTitle}</strong> has been updated to:</p>
                    <div style="background: #eff6ff; padding: 12px; border-radius: 8px; font-weight: 800; color: #1e40af; display: inline-block;">
                        ${data.newStatus.toUpperCase()}
                    </div>
                    <p style="margin-top: 20px;">Please log into the portal to see more details or take next steps.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #777;">Best regards,<br/>The SkillBridge Ladder Team</p>
                </div>
            `
        });
    } catch (err) {
        console.error("Failed to send job status alert:", err);
    }
}

/**
 * Sends a test email to verify configuration.
 */
export async function sendTestEmail(targetEmail: string) {
    if (!process.env.RESEND_API_KEY) {
        return { success: false, error: "Missing RESEND_API_KEY in environment" };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'SBL Test <security@skillbridgeladder.in>',
            to: targetEmail,
            subject: '🔔 SBL Notification Test',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 12px; background: #fff;">
                    <img src="https://hire.skillbridgeladder.in/logo.jpg" alt="SBL Logo" style="width: 120px; margin-bottom: 20px;" />
                    <h2 style="color: #10b981; margin-top: 0;">Configuration Success</h2>
                    <p>This is a test email from <strong>SkillBridge Ladder</strong>.</p>
                    <p>If you received this, your email notification system is correctly configured and live.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #777;">Time: ${new Date().toLocaleString()}</p>
                </div>
            `
        });

        if (error) throw error;
        return { success: true, data };
    } catch (err: any) {
        console.error("Test email failed:", err);
        return { success: false, error: err.message };
    }
}
/**
 * Sends a detailed application alert to the admin with all form fields.
 */
export async function sendApplicationAlert(data: {
    adminEmail: string;
    jobTitle: string;
    candidateName: string;
    candidateEmail: string;
    formData: any;
}) {
    if (!process.env.RESEND_API_KEY || !data.adminEmail) return;

    const formFieldsHtml = Object.entries(data.formData)
        .filter(([key]) => !key.startsWith('_')) // Hide internal fields
        .map(([key, value]) => `
            <div style="margin-bottom: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase;">${key.replace(/_/g, ' ')}</div>
                <div style="font-size: 14px; color: #1e293b; margin-top: 4px; font-weight: 600;">${Array.isArray(value) ? value.join(', ') : value}</div>
            </div>
        `).join('');

    try {
        await resend.emails.send({
            from: 'SBL Notifications <onboard@hire.skillbridgeladder.in>',
            to: data.adminEmail,
            subject: `💼 New Application: ${data.candidateName} for ${data.jobTitle}`,
            html: `
                <div style="font-family: sans-serif; padding: 24px; border: 1px solid #3b82f6; border-radius: 20px; background: #fff; max-width: 600px; margin: 0 auto;">
                    <img src="https://hire.skillbridgeladder.in/logo.jpg" alt="SBL Logo" style="width: 100px; margin-bottom: 24px;" />
                    <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">New Application Received</h2>
                    <p style="color: #475569;">A new candidate has applied for <strong>${data.jobTitle}</strong>.</p>
                    
                    <div style="margin: 24px 0; padding: 16px; background: #eff6ff; border-radius: 12px;">
                        <div style="font-size: 13px; color: #1e40af;"><strong>Candidate:</strong> ${data.candidateName}</div>
                        <div style="font-size: 13px; color: #1e40af; margin-top: 4px;"><strong>Email:</strong> ${data.candidateEmail}</div>
                    </div>

                    <h3 style="font-size: 14px; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">Application Details</h3>
                    ${formFieldsHtml}

                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                    <p style="font-size: 12px; color: #64748b;">This alert was generated automatically by SBL Hire.</p>
                </div>
            `
        });
    } catch (err) {
        console.error("Failed to send application alert:", err);
    }
}

/**
 * Sends a submission confirmation email to the user.
 */
export async function sendSubmissionConfirmation(data: {
    userEmail: string;
    userName: string;
    jobTitle: string;
}) {
    if (!process.env.RESEND_API_KEY || !data.userEmail) return;

    try {
        await resend.emails.send({
            from: 'SkillBridge Ladder <onboard@hire.skillbridgeladder.in>',
            to: data.userEmail,
            subject: `Application Submitted: ${data.jobTitle}`,
            html: `
                <div style="font-family: sans-serif; padding: 24px; border: 1px solid #10b981; border-radius: 20px; background: #fff; max-width: 600px; margin: 0 auto;">
                    <img src="https://hire.skillbridgeladder.in/logo.jpg" alt="SBL Logo" style="width: 100px; margin-bottom: 24px;" />
                    <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">Application Received! 🎉</h2>
                    <p style="color: #475569;">Hello ${data.userName},</p>
                    <p style="color: #475569;">Your application for <strong>${data.jobTitle}</strong> has been successfully submitted to the SkillBridge Ladder team.</p>
                    
                    <div style="margin: 24px 0; padding: 20px; background: #f0fdf4; border-radius: 12px; border: 1px solid #dcfce7;">
                        <p style="margin: 0; color: #166534; font-size: 14px;"><strong>Next Steps:</strong> Our team will review your profile and application details. You will receive an email update if you are shortlisted for the next round.</p>
                    </div>

                    <p style="color: #475569;">Good luck!</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                    <p style="font-size: 12px; color: #64748b;">Best regards,<br/>The SkillBridge Ladder Team</p>
                </div>
            `
        });
    } catch (err) {
        console.error("Failed to send submission confirmation:", err);
    }
}
