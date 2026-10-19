"use server";

import { redirect } from "next/navigation";
import { CampaignDeliveryError, consumeUnsubscribeToken } from "@/server/campaigns/delivery";

export async function confirmUnsubscribe(token: string) {
  let destination = "/unsubscribe/complete";
  try {
    await consumeUnsubscribeToken(token);
  } catch (error) {
    if (error instanceof CampaignDeliveryError) destination = "/unsubscribe/complete?status=invalid";
    else throw error;
  }
  redirect(destination);
}
