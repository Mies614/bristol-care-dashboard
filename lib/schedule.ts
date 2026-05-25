import { DAYS, type Course, type DayName } from "./types";

export function getCurrentDayName(date = new Date()): DayName {
  const index = date.getDay();
  return DAYS[index === 0 ? 6 : index - 1];
}

export function sortCourses(courses: Course[]) {
  return [...courses].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function getCoursesForDay(courses: Course[], day: DayName) {
  return sortCourses(courses.filter((course) => course.day === day));
}

export function getTodayCourses(courses: Course[], now = new Date()) {
  return getCoursesForDay(courses, getCurrentDayName(now));
}

export function getNextCourse(courses: Course[], now = new Date()) {
  const today = getCurrentDayName(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return getCoursesForDay(courses, today).find((course) => {
    const [hour, minute] = course.startTime.split(":").map(Number);
    return hour * 60 + minute >= currentMinutes;
  });
}

export function hasEveningClass(courses: Course[], now = new Date()) {
  return getTodayCourses(courses, now).some((course) => Number(course.startTime.slice(0, 2)) >= 18);
}

export function hasClassBefore10(courses: Course[], now = new Date()) {
  return getTodayCourses(courses, now).some((course) => course.startTime < "10:00");
}
