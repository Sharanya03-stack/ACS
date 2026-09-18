export interface SendWhatsAppTemplateOptions {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters: string[];
  buttonUrlParameter?: string;
}

/**
 * Sends a message template using Meta's official WhatsApp Business Cloud API.
 * Safely no-ops if WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID environment variables are missing.
 */
export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode = 'en',
  bodyParameters,
  buttonUrlParameter,
}: SendWhatsAppTemplateOptions): Promise<{ success: boolean; error?: unknown; skipped?: boolean }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    // Safely no-op if WhatsApp credentials are not configured
    return { success: false, skipped: true };
  }

  // Clean phone number: remove non-digit characters and leading zeroes
  const cleaned = to.replace(/\D/g, '').replace(/^0+/, '');
  if (!cleaned) {
    console.error('[WhatsApp Client] Invalid phone number provided');
    return { success: false, error: 'Invalid phone number' };
  }

  // Normalize Indian 10-digit numbers to country code 91XXXXXXXXXX, while preserving existing international numbers
  const recipient = cleaned.length === 10 ? `91${cleaned}` : cleaned;

  const components: Array<{
    type: string;
    sub_type?: string;
    index?: string;
    parameters: Array<{ type: string; text: string }>;
  }> = [
    {
      type: 'body',
      parameters: bodyParameters.map((param) => ({ type: 'text', text: param })),
    },
  ];

  if (buttonUrlParameter) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: buttonUrlParameter }],
    });
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp Client] Meta Cloud API error:', {
        status: response.status,
        statusText: response.statusText,
        error: data?.error || data,
      });
      return { success: false, error: data?.error || data };
    }

    return { success: true };
  } catch (error) {
    console.error('[WhatsApp Client] Exception sending WhatsApp message:', error);
    return { success: false, error };
  }
}
