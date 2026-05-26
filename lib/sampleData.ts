import type { AppData, Course, Deadline, CommonLink, LoveNote } from "./types";
import { defaultBackgroundSettings } from "./background";
import { DEFAULT_PERIOD_SETTINGS } from "./period";

export const sampleCourses: Course[] = [
  {
    id: "sample-course-1",
    name: "Data Analysis Seminar",
    day: "Monday",
    startTime: "09:30",
    endTime: "11:00",
    location: "Senate House",
    teacher: "Dr. Taylor",
    color: "#f7b6a6"
  },
  {
    id: "sample-course-2",
    name: "Research Methods",
    day: "Tuesday",
    startTime: "14:00",
    endTime: "16:00",
    location: "Wills Memorial Building",
    color: "#8ea89b"
  },
  {
    id: "sample-course-3",
    name: "Group Project",
    day: "Thursday",
    startTime: "18:15",
    endTime: "20:00",
    location: "Bristol SU",
    note: "晚课结束记得慢慢回家",
    color: "#d9b08c"
  },
  {
    id: "sample-course-4",
    name: "Library Study Block",
    day: "Friday",
    startTime: "10:00",
    endTime: "12:00",
    location: "Arts and Social Sciences Library",
    color: "#c8d9d0"
  }
];

export const sampleDeadlines: Deadline[] = [
  {
    id: "sample-deadline-1",
    title: "Research proposal draft",
    courseName: "Research Methods",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString().slice(0, 10),
    dueTime: "16:00",
    priority: "high",
    status: "todo",
    note: "先完成结构和参考文献"
  },
  {
    id: "sample-deadline-2",
    title: "Group presentation slides",
    courseName: "Group Project",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString().slice(0, 10),
    dueTime: "12:00",
    priority: "medium",
    status: "todo"
  }
];

export const sampleLinks: CommonLink[] = [
  { id: "link-1", title: "University of Bristol", url: "https://www.bristol.ac.uk/", category: "study", sortOrder: 1 },
  { id: "link-2", title: "Blackboard", url: "https://www.ole.bris.ac.uk/", category: "study", sortOrder: 2 },
  { id: "link-3", title: "Bristol SU", url: "https://www.bristolsu.org.uk/", category: "life", sortOrder: 3 },
  { id: "link-4", title: "First Bus Bristol", url: "https://www.firstbus.co.uk/bristol-bath-and-west", category: "travel", sortOrder: 4 }
];

export const sampleLoveNotes: LoveNote[] = [
  {
    id: "sample-love-note-1",
    content: "今天也要好好吃饭，慢慢来就很好。我一直在这里。",
    active: true,
    pinned: true,
    visibleFrom: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    createdBy: "local"
  }
];

export const defaultAppData: AppData = {
  nickname: "小乖",
  nextMeetDate: "",
  semesterEndDate: "",
  note: "今天也要好好吃饭，慢慢来就很好。我一直在这里。",
  courses: sampleCourses,
  deadlines: sampleDeadlines,
  links: sampleLinks,
  loveNotes: sampleLoveNotes,
  backgroundSettings: defaultBackgroundSettings,
  periodRecords: [],
  periodSettings: DEFAULT_PERIOD_SETTINGS
};
