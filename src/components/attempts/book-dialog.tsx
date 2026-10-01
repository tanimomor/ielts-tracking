"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { buildCode } from "@/lib/code";
import { suggestPrefix, type SeriesInfo } from "@/lib/books";
import type { FieldErrors } from "@/lib/validation";
import { createSeriesAction, updateSeriesAction } from "@/server/actions/books";

/**
 * Add a new book series (e.g. "Makkar") or edit one (e.g. Cambridge now has
 * 22 volumes). Shared by everyone in the group.
 */
export function BookDialog({
  open,
  onOpenChange,
  existing,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SeriesInfo[];
  editing?: SeriesInfo | null;
  onSaved: (series: SeriesInfo) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.name}` : "Add a book"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Changes apply for everyone. The short code can't change because existing entries use it."
              : "Books are shared with everyone in the group."}
          </DialogDescription>
        </DialogHeader>
        {open && <BookForm key={editing?.id ?? "new"} existing={existing} editing={editing ?? null} onSaved={onSaved} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function BookForm({
  existing,
  editing,
  onSaved,
  onCancel,
}: {
  existing: SeriesInfo[];
  editing: SeriesInfo | null;
  onSaved: (s: SeriesInfo) => void;
  onCancel: () => void;
}) {
  const taken = existing.filter((s) => s.id !== editing?.id).map((s) => s.prefix);
  const [name, setName] = useState(editing?.name ?? "");
  const [prefix, setPrefix] = useState(editing?.prefix ?? "");
  const [prefixTouched, setPrefixTouched] = useState(!!editing);
  const [hasVolumes, setHasVolumes] = useState(editing ? editing.volumes != null : false);
  const [volumes, setVolumes] = useState(String(editing?.volumes ?? 1));
  const [tests, setTests] = useState(String(editing?.testsPerBook ?? 4));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, start] = useTransition();

  const shownPrefix = prefixTouched ? prefix : suggestPrefix(name, taken);
  const example = buildCode(shownPrefix || "xx", hasVolumes ? 2 : null, 3, null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation(); // don't submit the attempt form underneath
    start(async () => {
      const payload = { name, prefix: shownPrefix, volumes: hasVolumes ? volumes : null, testsPerBook: tests };
      const res = editing ? await updateSeriesAction(editing.id, payload) : await createSeriesAction(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success(editing ? `Updated ${res.data.name}` : `Added ${res.data.name}`);
      onSaved(res.data);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <div className="grid gap-2">
        <Label htmlFor="book-name">Name</Label>
        <Input
          id="book-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Makkar"
          aria-invalid={!!errors.name}
          autoFocus
          required
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="book-prefix">Short code</Label>
        <div className="flex items-center gap-3">
          <Input
            id="book-prefix"
            value={shownPrefix}
            disabled={!!editing}
            onChange={(e) => {
              setPrefixTouched(true);
              setPrefix(e.target.value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 6));
            }}
            className="w-28 font-mono"
            aria-invalid={!!errors.prefix}
            aria-describedby="book-prefix-hint"
          />
          <span id="book-prefix-hint" className="text-sm text-muted-foreground">
            Codes look like <span className="font-mono font-medium text-foreground">{example}</span>
          </span>
        </div>
        {errors.prefix && <p className="text-sm text-destructive">{errors.prefix}</p>}
      </div>

      <div className="grid gap-2">
        <span className="text-sm font-medium" id="book-volumes-label">
          Volumes
        </span>
        <ToggleGroup
          type="single"
          value={hasVolumes ? "yes" : "no"}
          onValueChange={(v) => v && setHasVolumes(v === "yes")}
          aria-labelledby="book-volumes-label"
          className="grid grid-cols-2"
        >
          <ToggleGroupItem value="no">Single book</ToggleGroupItem>
          <ToggleGroupItem value="yes">Numbered volumes</ToggleGroupItem>
        </ToggleGroup>
        {hasVolumes && (
          <div className="flex items-center gap-3">
            <Label htmlFor="book-volume-count" className="text-sm font-normal text-muted-foreground">
              Volumes 1 to
            </Label>
            <Input
              id="book-volume-count"
              type="number"
              inputMode="numeric"
              min={1}
              max={200}
              value={volumes}
              onChange={(e) => setVolumes(e.target.value)}
              className="w-24"
              aria-invalid={!!errors.volumes}
            />
          </div>
        )}
        {errors.volumes && <p className="text-sm text-destructive">{errors.volumes}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="book-tests">Tests per book</Label>
        <Input
          id="book-tests"
          type="number"
          inputMode="numeric"
          min={1}
          max={200}
          value={tests}
          onChange={(e) => setTests(e.target.value)}
          className="w-24"
          aria-invalid={!!errors.testsPerBook}
        />
        {errors.testsPerBook && <p className="text-sm text-destructive">{errors.testsPerBook}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !name.trim() || !shownPrefix}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {editing ? "Save" : "Add book"}
        </Button>
      </DialogFooter>
    </form>
  );
}
