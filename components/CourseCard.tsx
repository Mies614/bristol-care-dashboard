import type { Course } from "@/lib/types";

export function CourseCard({ course, compact = false }: { course: Course; compact?: boolean }) {
  return (
    <article className="rounded-[1.35rem] border border-white/80 bg-white/70 p-3 shadow-sm backdrop-blur">
      <div className="flex gap-3">
        <div className="mt-1 h-11 w-2 rounded-full shadow-sm" style={{ backgroundColor: course.color || "#f7b6a6" }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-cocoa">{course.name}</h3>
            <span className="shrink-0 rounded-full bg-cream/80 px-2.5 py-1 text-xs text-cocoa/60">
              {course.startTime}-{course.endTime}
            </span>
          </div>
          {course.location ? <p className="mt-1 text-sm text-cocoa/65">{course.location}</p> : null}
          {!compact && course.teacher ? <p className="mt-1 text-xs text-cocoa/55">{course.teacher}</p> : null}
          {!compact && course.note ? <p className="mt-2 rounded-2xl bg-cream/80 px-3 py-2 text-sm text-cocoa/70">{course.note}</p> : null}
        </div>
      </div>
    </article>
  );
}
