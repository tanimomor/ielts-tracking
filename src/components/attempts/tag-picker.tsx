"use client";

import { Plus, Tag, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  max?: number;
  placeholder?: string;
  allowCreate?: boolean;
  className?: string;
};

function normalize(tag: string) {
  return tag.trim().replace(/\s+/g, " ").slice(0, 40);
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Multi-select with type-to-create. */
export function TagPicker({
  id,
  value,
  onChange,
  suggestions,
  max = 15,
  placeholder = "Add mistake tags",
  allowCreate = true,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = normalize(query);
  const canCreate = allowCreate && q.length > 0 && !suggestions.some((s) => same(s, q)) && !value.some((v) => same(v, q));

  function toggle(tag: string) {
    const typed = normalize(tag);
    if (!typed) return;
    // Reuse the existing spelling of a tag so "t/f/ng" and "T/F/NG" don't split.
    const t = suggestions.find((s) => same(s, typed)) ?? typed;
    if (value.some((v) => same(v, t))) onChange(value.filter((v) => !same(v, t)));
    else if (value.length < max) onChange([...value, t]);
    setQuery("");
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-auto min-h-9 w-full justify-start px-3 py-1.5 font-normal"
          >
            <Tag className="text-muted-foreground" aria-hidden />
            {value.length ? (
              <span className="text-sm">{value.length} selected</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder={allowCreate ? "Search or create…" : "Search tags…"} value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>{q && allowCreate ? "No match — press Enter to create it." : "No matching tags."}</CommandEmpty>
              {canCreate && (
                <CommandGroup>
                  <CommandItem value={`__create__${q}`} onSelect={() => toggle(q)}>
                    <Plus aria-hidden /> Create “{q}”
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup heading="Tags">
                {suggestions.map((tag) => {
                  const selected = value.includes(tag);
                  return (
                    <CommandItem key={tag} value={tag} onSelect={() => toggle(tag)}>
                      <span
                        aria-hidden
                        className={cn(
                          "grid size-4 place-items-center rounded-[4px] border border-input",
                          selected && "border-primary bg-primary text-primary-foreground",
                        )}
                      >
                        {selected && <span className="text-[10px] leading-none">✓</span>}
                      </span>
                      <span className="sr-only">{selected ? "Selected: " : ""}</span>
                      {tag}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected tags">
          {value.map((tag) => (
            <li key={tag}>
              <span className="inline-flex items-center gap-1 rounded-md bg-primary-soft py-0.5 pr-1 pl-2 text-xs font-medium text-primary">
                {tag}
                <button
                  type="button"
                  onClick={() => toggle(tag)}
                  className="grid size-4 cursor-pointer place-items-center rounded-sm hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
