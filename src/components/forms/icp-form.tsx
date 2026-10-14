"use client";

import { useActionState } from "react";
import { updateIcpAction, type FormState } from "@/app/app/actions";
import { FormMessage, SubmitButton } from "./form-parts";
import { Input, Label, Textarea } from "@/components/ui/form-controls";

const initialState: FormState = { status: "idle" };

export function IcpForm({ cities, industries, minimumBudget, maximumBudget }: { cities: string[]; industries: string[]; minimumBudget: number; maximumBudget: number }) {
  const [state, action] = useActionState(updateIcpAction, initialState);
  return <form action={action} className="grid gap-5"><div className="grid gap-5 md:grid-cols-2"><div className="grid gap-2"><Label htmlFor="icp-cities">Target cities</Label><Textarea defaultValue={cities.join("\n")} id="icp-cities" name="cities" required /></div><div className="grid gap-2"><Label htmlFor="icp-industries">Target industries</Label><Textarea defaultValue={industries.join("\n")} id="icp-industries" name="industries" required /></div></div><div className="grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="icp-min">Minimum project value (R)</Label><Input defaultValue={minimumBudget} id="icp-min" min="0" name="minimumBudget" required type="number" /></div><div className="grid gap-2"><Label htmlFor="icp-max">Maximum project value (R)</Label><Input defaultValue={maximumBudget} id="icp-max" min="0" name="maximumBudget" required type="number" /></div></div><FormMessage state={state} /><SubmitButton>Save ICP</SubmitButton></form>;
}
