"use client";

import { Check, Loader2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STUDENT_COLORS } from "@/lib/constants";
import { cn, readableTextOn } from "@/lib/utils";
import type { ActionResult } from "@/lib/validation";

const TARGETS = Array.from({ length: 11 }, (_, i) => (4 + i * 0.5).toFixed(1));

type Props = {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  defaults: { name: string; targetBand: number; color: string };
  takenColors?: string[];
  callbackUrl?: string;
  submitLabel: string;
  onSaved?: () => void;
};

export function ProfileForm({ action, defaults, takenColors = [], callbackUrl, submitLabel, onSaved }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [color, setColor] = useState(defaults.color);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) {
      toast.success("Profile saved");
      onSaved?.();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, onSaved]);

  return (
    <form action={formAction} className="grid gap-6">
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      <div className="grid gap-2">
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaults.name}
          autoComplete="nickname"
          aria-invalid={!!errors?.name}
          aria-describedby={errors?.name ? "name-error" : undefined}
          required
        />
        {errors?.name && (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="targetBand">Target band</Label>
        <Select name="targetBand" defaultValue={defaults.targetBand.toFixed(1)}>
          <SelectTrigger id="targetBand" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TARGETS.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Chart colour</legend>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Chart colour">
          {STUDENT_COLORS.map((c) => {
            const selected = c === color;
            const taken = takenColors.includes(c) && c !== defaults.color;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Colour ${STUDENT_COLORS.indexOf(c) + 1}${taken ? " (used by another student)" : ""}`}
                onClick={() => setColor(c)}
                className={cn(
                  "relative grid size-9 cursor-pointer place-items-center rounded-full ring-offset-2 transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  selected && "ring-2 ring-foreground",
                  taken && !selected && "opacity-40",
                )}
                style={{ backgroundColor: c }}
              >
                {selected && <Check className="size-4" style={{ color: readableTextOn(c) }} aria-hidden />}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Used for your lines, badges and avatar ring everywhere.</p>
      </fieldset>

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {submitLabel}
      </Button>
    </form>
  );
}
