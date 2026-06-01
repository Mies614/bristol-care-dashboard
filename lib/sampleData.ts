import type { AppData, Course, Deadline, CommonLink, LoveNote } from "./types";
import { defaultBackgroundSettings } from "./background";
import { DEFAULT_PERIOD_SETTINGS } from "./period";
import { DEFAULT_THEME_SETTINGS } from "./theme";

export const sampleCourses: Course[] = [];

export const sampleDeadlines: Deadline[] = [];

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
  themeSettings: DEFAULT_THEME_SETTINGS,
  periodRecords: [],
  periodSettings: DEFAULT_PERIOD_SETTINGS
};