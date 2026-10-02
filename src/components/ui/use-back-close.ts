"use client";

import { useEffect } from "react";

/*
 * Makes the browser/phone Back button close an open dialog instead of leaving
 * the page (or closing the browser when there is no history).
 *
 * Each open dialog owns one extra history entry at the same URL. Back pops it
 * and the top-most dialog closes. Closing a dialog any other way (X, Esc,
 * Save) removes its entry again, so Back keeps working normally afterwards.
 *
 * Open dialogs are tracked in memory rather than in history.state, because
 * Next.js rewrites the current entry's state whenever it refreshes data.
 */

const stack: number[] = [];
const closers = new Map<number, () => void>();
let nextId = 0;
let ignorePops = 0;
let listening = false;

function onPopState() {
  if (ignorePops > 0) {
    ignorePops--; // our own cleanup's history.back()
    return;
  }
  const top = stack.pop();
  if (top != null) closers.get(top)?.();
}

/** Render inside the dialog's content (mounted only while open), never in a wrapper. */
export function BackButtonClose() {
  useBackButtonClose();
  return null;
}

function useBackButtonClose() {
  useEffect(() => {
    const id = ++nextId;
    let pushed = false;
    let poppedByBack = false;
    let hrefAtPush = "";

    // Deferred so React StrictMode's mount→unmount→mount in development
    // doesn't push and immediately pop an entry.
    const timer = setTimeout(() => {
      hrefAtPush = window.location.href;
      window.history.pushState({ __modal: id }, ""); // same URL: no navigation
      pushed = true;
      stack.push(id);
      closers.set(id, () => {
        poppedByBack = true;
        // Radix closes only the top-most layer on Escape — the dialog that
        // owned this entry — and its onOpenChange runs as usual.
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
      if (!listening) {
        window.addEventListener("popstate", onPopState);
        listening = true;
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      closers.delete(id);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
      // Closed with X / Esc / Save while still on the same page: drop our entry.
      // (If the user navigated elsewhere meanwhile, leave history alone.)
      if (pushed && !poppedByBack && window.location.href === hrefAtPush) {
        ignorePops++;
        window.history.back();
      }
    };
  }, []);
}
