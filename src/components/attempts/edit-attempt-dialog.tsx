"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { AttemptFormValues } from "@/lib/attempt-values";
import type { SeriesInfo } from "@/lib/books";
import { AttemptForm } from "./attempt-form";

export function EditAttemptDialog({
  id,
  label,
  values,
  maxDate,
  tagSuggestions,
  series,
}: {
  id: string;
  label: string;
  values: AttemptFormValues;
  maxDate: string;
  tagSuggestions: string[];
  series: SeriesInfo[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${label}`}>
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1rem)] bg-surface p-4 sm:max-w-2xl sm:p-6">
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
            series={series}
            onSaved={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
