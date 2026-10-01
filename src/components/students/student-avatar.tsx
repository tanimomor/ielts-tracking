import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, initials, readableTextOn } from "@/lib/utils";

type StudentLike = { name: string; color: string; avatarUrl?: string | null };

const SIZES = { xs: "size-5 text-[9px]", sm: "size-7 text-[10px]", md: "size-9 text-xs", lg: "size-14 text-base", xl: "size-20 text-xl" };

/** Google photo with the student's colour as a ring. */
export function StudentAvatar({
  student,
  size = "md",
  className,
}: {
  student: StudentLike;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <Avatar
      className={cn(SIZES[size], "ring-2 ring-offset-2 ring-offset-background", className)}
      style={{ "--tw-ring-color": student.color } as React.CSSProperties}
    >
      {student.avatarUrl && <AvatarImage src={student.avatarUrl} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback style={{ backgroundColor: student.color, color: readableTextOn(student.color) }}>
        {initials(student.name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Inline name chip with a colour dot (colour is never the only signal: the name is always shown). */
export function StudentChip({ student, className }: { student: StudentLike; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: student.color }} />
      <span className="truncate">{student.name}</span>
    </span>
  );
}
