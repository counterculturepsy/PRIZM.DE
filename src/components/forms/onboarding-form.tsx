"use client";

import { useActionState } from "react";
import { completeOnboardingAction, type FormState } from "@/app/app/actions";
import { FormMessage, SubmitButton } from "./form-parts";
import { Input, Label, Textarea } from "@/components/ui/form-controls";

const initialState: FormState = { status: "idle" };

export function OnboardingForm() {
  const [state, action] = useActionState(completeOnboardingAction, initialState);
  return (
    <form action={action} className="grid gap-8">
      <fieldset className="grid gap-5">
        <legend className="text-lg font-semibold">1. What do you sell?</legend>
        <div className="grid gap-2">
          <Label htmlFor="services">Services</Label>
          <Textarea id="services" name="services" placeholder={"Website Design\nEcommerce\nBusiness Automation"} required />
          <p className="text-xs text-muted-foreground">One per line or comma-separated.</p>
        </div>
      </fieldset>
      <fieldset className="grid gap-5">
        <legend className="text-lg font-semibold">2. Where and to whom do you sell?</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="cities">Target cities</Label>
            <Textarea id="cities" name="cities" placeholder={"Cape Town\nStellenbosch\nSomerset West"} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="industries">Target industries</Label>
            <Textarea id="industries" name="industries" placeholder={"Hospitality\nProfessional services\nProperty"} required />
          </div>
        </div>
      </fieldset>
      <fieldset className="grid gap-5">
        <legend className="text-lg font-semibold">3. What project range fits?</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="minimum-budget">Minimum project value (ZAR)</Label>
            <Input id="minimum-budget" min="0" name="minimumBudget" required step="100" type="number" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="maximum-budget">Maximum project value (ZAR)</Label>
            <Input id="maximum-budget" min="0" name="maximumBudget" required step="100" type="number" />
          </div>
        </div>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving your profile…">Complete onboarding</SubmitButton>
    </form>
  );
}
