export type CampaignDeliveryMessage = Readonly<{
  to: string;
  subject: string;
  body: string;
  unsubscribeUrl: string;
  idempotencyKey: string;
}>;

export type CampaignDeliveryResult = Readonly<{ providerMessageId: string }>;

export interface CampaignEmailProvider {
  readonly id: string;
  send(message: CampaignDeliveryMessage): Promise<CampaignDeliveryResult>;
}

export class CampaignProviderError extends Error {
  constructor(readonly code: string, readonly retryable: boolean, message = "The email provider rejected the request.") {
    super(message);
    this.name = "CampaignProviderError";
  }
}

export const disabledCampaignProvider: CampaignEmailProvider = {
  id: "disabled",
  async send() {
    throw new CampaignProviderError("delivery_disabled", false, "Campaign delivery is disabled.");
  },
};
