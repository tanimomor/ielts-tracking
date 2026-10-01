import { redirect } from "next/navigation";

/** Compare was replaced by the scoreboard. */
export default function CompareRedirect() {
  redirect("/scoreboard");
}
