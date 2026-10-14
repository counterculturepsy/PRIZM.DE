"use client";

import { useActionState } from "react";
import { addServiceAction, type FormState } from "@/app/app/actions";
import { FormMessage, SubmitButton } from "./form-parts";
import { Input, Label, Textarea } from "@/components/ui/form-controls";

const initialState: FormState = { status: "idle" };

export function ServiceForm() {
  const [state, action] = useActionState(addServiceAction, initialState);
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2"><Label htmlFor="service-name">Service name</Label><Input id="service-name" maxLength={80} name="name" required /></div>
      <div className="grid gap-2"><Label htmlFor="service-description">Description</Label><Textarea id="service-description" maxLength={500} name="description" /></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2"><Label htmlFor="starting-price">Starting price (R)</Label><Input id="starting-price" min="0" name="startingPrice" step="100" type="number" /></div>
        <div className="grid gap-2"><Label htmlFor="average-price">Average price (R)</Label><Input id="average-price" min="0" name="averagePrice" step="100" type="number" /></div>
        <div className="grid gap-2"><Label htmlFor="delivery-days">Delivery days</Label><Input id="delivery-days" min="1" name="deliveryTimeDays" type="number" /></div>
      </div>
      <FormMessage state={state} />
      <SubmitButton>Add service</SubmitButton>
    </form>
  );
}
