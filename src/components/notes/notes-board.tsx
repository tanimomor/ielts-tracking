"use client";

import { Lock, Palette, Pin, PinOff, Search, Trash2, Users } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/dates";
import { NOTE_COLORS, NOTE_COLOR_KEYS, type NoteColor } from "@/lib/notes";
import { cn } from "@/lib/utils";
import { createNoteAction, deleteNoteAction, updateNoteAction } from "@/server/actions/notes";

export type BoardNote = {
  id: string;
  studentId: string;
  title: string;
  body: string;
  color: string;
  pinned: boolean;
  shared: boolean;
  updatedAt: Date | string;
  authorName: string;
  authorColor: string;
};

type Draft = { title: string; body: string; color: NoteColor; pinned: boolean; shared: boolean };
const EMPTY: Draft = { title: "", body: "", color: "default", pinned: false, shared: false };

const colorOf = (c: string) => NOTE_COLORS[(NOTE_COLOR_KEYS as readonly string[]).includes(c) ? (c as NoteColor) : "default"];

function ColorPicker({ value, onChange }: { value: NoteColor; onChange: (c: NoteColor) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Note colour">
          <Palette />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div role="radiogroup" aria-label="Note colour" className="flex gap-1.5">
          {NOTE_COLOR_KEYS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={value === c}
              aria-label={NOTE_COLORS[c].label}
              title={NOTE_COLORS[c].label}
              onClick={() => onChange(c)}
              className={cn(
                "size-7 cursor-pointer rounded-full border-2 transition-transform hover:scale-110 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                NOTE_COLORS[c].swatch,
                value === c ? "border-foreground" : "border-border",
              )}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Toolbar({ draft, set }: { draft: Draft; set: (patch: Partial<Draft>) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      <ColorPicker value={draft.color} onChange={(color) => set({ color })} />
      <Button type="button" variant="ghost" size="icon-sm" aria-pressed={draft.pinned} aria-label={draft.pinned ? "Unpin" : "Pin"} onClick={() => set({ pinned: !draft.pinned })}>
        {draft.pinned ? <PinOff /> : <Pin />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={draft.shared}
        onClick={() => set({ shared: !draft.shared })}
        className={cn("gap-1.5 text-xs", draft.shared && "text-primary")}
      >
        {draft.shared ? <Users className="size-3.5" /> : <Lock className="size-3.5" />}
        {draft.shared ? "Shared with group" : "Only me"}
      </Button>
    </div>
  );
}

/** Keep-style "Take a note…" box: expands on focus, saves when you close it. */
function Composer() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  function close() {
    if (!draft.title.trim() && !draft.body.trim()) {
      setOpen(false);
      setDraft(EMPTY);
      return;
    }
    start(async () => {
      const res = await createNoteAction(draft);
      if (res.ok) {
        setDraft(EMPTY);
        setOpen(false);
      } else toast.error(res.error);
    });
  }

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        close();
      }}
      onBlur={(e) => {
        if (open && !ref.current?.contains(e.relatedTarget as Node) && !(e.relatedTarget as HTMLElement | null)?.closest("[data-radix-popper-content-wrapper]")) close();
      }}
      className={cn("mx-auto w-full max-w-xl rounded-xl border shadow-sm transition-colors", colorOf(draft.color).card)}
    >
      {open && (
        <Input
          value={draft.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Title"
          aria-label="Title"
          className="h-11 border-0 bg-transparent px-4 text-base font-semibold shadow-none focus-visible:ring-0"
        />
      )}
      <Textarea
        value={draft.body}
        onFocus={() => setOpen(true)}
        onChange={(e) => set({ body: e.target.value })}
        placeholder="Take a note…"
        aria-label="Note"
        rows={open ? 3 : 1}
        className="min-h-11 resize-none border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0"
      />
      {open && (
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <Toolbar draft={draft} set={set} />
          <Button type="submit" variant="ghost" size="sm" disabled={pending}>
            Close
          </Button>
        </div>
      )}
    </form>
  );
}

function NoteCard({ note, mine, onOpen }: { note: BoardNote; mine: boolean; onOpen: () => void }) {
  const [pending, start] = useTransition();
  const tone = colorOf(note.color);

  function patch(p: Partial<Draft>) {
    start(async () => {
      const res = await updateNoteAction(note.id, p);
      if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <article
      className={cn(
        "group relative mb-4 break-inside-avoid rounded-xl border p-4 shadow-xs transition-shadow hover:shadow-md",
        tone.card,
        pending && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full cursor-pointer text-left focus-visible:outline-none"
        aria-label={`Open note ${note.title || note.body.slice(0, 30)}`}
      >
        {note.title && <h3 className="mb-1.5 pr-6 font-semibold break-words">{note.title}</h3>}
        {note.body && <p className="line-clamp-[12] text-sm break-words whitespace-pre-wrap">{note.body}</p>}
      </button>
      {note.pinned && <Pin className="absolute top-3 right-3 size-4 text-muted-foreground" aria-label="Pinned" />}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {!mine && (
            <>
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: note.authorColor }} />
              <span className="truncate">{note.authorName}</span>
            </>
          )}
          {mine && note.shared && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" aria-hidden /> Shared
                </span>
              </TooltipTrigger>
              <TooltipContent>Everyone in the group can read this</TooltipContent>
            </Tooltip>
          )}
        </span>
        {mine && (
          <div className="flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
            <ColorPicker value={note.color as NoteColor} onChange={(color) => patch({ color })} />
            <Button type="button" variant="ghost" size="icon-sm" aria-label={note.pinned ? "Unpin" : "Pin"} onClick={() => patch({ pinned: !note.pinned })}>
              {note.pinned ? <PinOff /> : <Pin />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Delete note"
              onClick={() =>
                start(async () => {
                  const res = await deleteNoteAction(note.id);
                  if (res.ok) toast.success("Note deleted");
                  else toast.error(res.error);
                })
              }
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

function EditDialog({ note, mine, onClose }: { note: BoardNote | null; mine: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, start] = useTransition();
  const current: Draft | null = note
    ? (draft ?? { title: note.title, body: note.body, color: note.color as NoteColor, pinned: note.pinned, shared: note.shared })
    : null;
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...(d ?? current!), ...patch }));

  function close() {
    if (!note || !mine || !draft) {
      setDraft(null);
      onClose();
      return;
    }
    start(async () => {
      const res = await updateNoteAction(note.id, draft);
      if (!res.ok) toast.error(res.error);
      setDraft(null);
      onClose();
    });
  }

  return (
    <Dialog open={!!note} onOpenChange={(o) => !o && close()}>
      {note && current && (
        <DialogContent className={cn("gap-3 p-0 sm:max-w-xl", colorOf(current.color).card)} showCloseButton={false}>
          <DialogTitle className="sr-only">{note.title || "Note"}</DialogTitle>
          <DialogDescription className="sr-only">{mine ? "Edit your note" : `Shared by ${note.authorName}`}</DialogDescription>
          {mine ? (
            <>
              <Input
                value={current.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="Title"
                aria-label="Title"
                className="h-12 border-0 bg-transparent px-5 pt-4 text-lg font-semibold shadow-none focus-visible:ring-0"
              />
              <Textarea
                value={current.body}
                onChange={(e) => set({ body: e.target.value })}
                placeholder="Note"
                aria-label="Note"
                className="max-h-[60dvh] min-h-40 border-0 bg-transparent px-5 shadow-none focus-visible:ring-0"
                autoFocus
              />
            </>
          ) : (
            <div className="px-5 pt-5">
              {note.title && <h2 className="mb-2 text-lg font-semibold">{note.title}</h2>}
              <p className="max-h-[60dvh] overflow-y-auto text-sm whitespace-pre-wrap">{note.body}</p>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 px-3 pb-3">
            {mine ? <Toolbar draft={current} set={set} /> : <span className="px-2 text-xs text-muted-foreground">Shared by {note.authorName}</span>}
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">Edited {formatDateTime(new Date(note.updatedAt))}</span>
              <Button type="button" variant="ghost" size="sm" onClick={close} disabled={pending}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

export function NotesBoard({ notes, me }: { notes: BoardNote[]; me: string }) {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? notes.filter((n) => `${n.title}\n${n.body}\n${n.authorName}`.toLowerCase().includes(s)) : notes;
  }, [notes, q]);
  const pinned = filtered.filter((n) => n.pinned && n.studentId === me);
  const others = filtered.filter((n) => !(n.pinned && n.studentId === me));
  const open = notes.find((n) => n.id === openId) ?? null;

  const grid = (list: BoardNote[]) => (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
      {list.map((n) => (
        <NoteCard key={n.id} note={n} mine={n.studentId === me} onOpen={() => setOpenId(n.id)} />
      ))}
    </div>
  );

  return (
    <div className="grid gap-8">
      <div className="grid gap-4">
        <Composer />
        {notes.length > 0 && (
          <div className="relative mx-auto w-full max-w-xl">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" aria-label="Search notes" className="pl-9" />
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Notes you add appear here. Share one to show it to the group.</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No notes match “{q}”.</p>
      ) : (
        <>
          {pinned.length > 0 && (
            <section aria-labelledby="pinned-heading" className="grid gap-3">
              <h2 id="pinned-heading" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Pinned
              </h2>
              {grid(pinned)}
            </section>
          )}
          {others.length > 0 && (
            <section aria-labelledby="others-heading" className="grid gap-3">
              {pinned.length > 0 && (
                <h2 id="others-heading" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Others
                </h2>
              )}
              {grid(others)}
            </section>
          )}
        </>
      )}

      <EditDialog key={openId ?? "none"} note={open} mine={open?.studentId === me} onClose={() => setOpenId(null)} />
    </div>
  );
}
