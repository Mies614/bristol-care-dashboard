export const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
] as const;

export type DayName = (typeof DAYS)[number];

export type Course = {
  id: string;
  name: string;
  day: DayName;
  startTime: string;
  endTime: string;
  location?: string;
  teacher?: string;
  note?: string;
  color?: string;
};

export type Deadline = {
  id: string;
  title: string;
  courseName?: string;
  dueDate: string;
  dueTime?: string;
  priority: "low" | "medium" | "high";
  status: "todo" | "done";
  note?: string;
};

export type CommonLink = {
  id: string;
  title: string;
  url: string;
  category?: string;
  sortOrder?: number;
};

export type QuickLink = CommonLink & {
  category: string;
  sortOrder?: number;
};

export type LoveNote = {
  id: string;
  content: string;
  active: boolean;
  pinned: boolean;
  visibleFrom?: string;
  createdAt?: string;
  createdBy?: string;
  imageUrl?: string;
  imagePath?: string;
  imageAlt?: string;
  deletedAt?: string;
};

export type CloudSettings = {
  girlfriendName?: string;
  nextMeetingDate?: string | null;
  semesterEndDate?: string | null;
  backgroundSettings?: BackgroundSettings;
};

export type BackgroundSettings = {
  mode: "preset" | "color" | "image" | "url";
  preset?: "cream" | "pink" | "lavender" | "blue" | "green" | "dark";
  color?: string;
  imageDataUrl?: string;
  imageUrl?: string;
  imageFit?: "cover" | "contain";
  imagePosition?: "center" | "top" | "bottom";
  overlay?: "none" | "light" | "medium" | "strong";
  blur?: boolean;
};

export type AppData = {
  nickname: string;
  nextMeetDate: string;
  semesterEndDate?: string;
  note: string;
  courses: Course[];
  deadlines: Deadline[];
  links: CommonLink[];
  loveNotes: LoveNote[];
  backgroundSettings: BackgroundSettings;
};
