"use client";

import { Settings2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { updateProfileAction } from "@/server/actions/students";
import { ProfileForm } from "./profile-form";

export function EditProfileDialog({
  defaults,
  takenColors,
}: {
  defaults: { name: string; targetBand: number; color: string };
  takenColors: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 aria-hidden /> Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Your name, target and colour are shown to everyone in the group.</DialogDescription>
        </DialogHeader>
        {open && (
          <ProfileForm
            action={updateProfileAction}
            defaults={defaults}
            takenColors={takenColors}
            submitLabel="Save profile"
            onSaved={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
