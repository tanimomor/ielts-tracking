import { redirect } from "next/navigation";

/** Old bookmarks: logging is now a quick-entry dialog available everywhere. */
export default function LogRedirect() {
  redirect("/attempts?log=1");
}
