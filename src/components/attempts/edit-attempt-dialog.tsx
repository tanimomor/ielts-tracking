"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { AttemptFormValues } from "@/lib/attempt-values";
import { AttemptForm } from "./attempt-form";

export function EditAttemptDialog({
  id,
  label,
  values,
  maxDate,
  tagSuggestions,
}: {
  id: string;
  label: string;
  values: AttemptFormValues;
  maxDate: string;
  tagSuggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${label}`}>
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit attempt</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        {open && (
          <AttemptForm
            mode="edit"
            attemptId={id}
            initial={values}
            maxDate={maxDate}
            tagSuggestions={tagSuggestions}
            onSaved={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
