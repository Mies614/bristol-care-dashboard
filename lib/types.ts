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
  content?: string;
  active: boolean;
  pinned: boolean;
  author?: "admin" | "user" | "xiaoguai" | "me";
  noteType?: "text" | "image" | "audio" | "video" | "mixed";
  displayStyle?: "sticky" | "postcard" | "bubble" | "photo_card" | "timeline" | "minimal" | "romantic";
  mood?: string;
  visibleFrom?: string;
  createdAt?: string;
  createdBy?: string;
  imageUrl?: string;
  imagePath?: string;
  imageAlt?: string;
  audioUrl?: string;
  audioPath?: string;
  videoUrl?: string;
  videoPath?: string;
  mediaSize?: number;
  deletedAt?: string;
  updatedAt?: string;
};

export type AlbumItem = {
  id: string;
  title?: string;
  note?: string;
  takenAt?: string;
  location?: string;
  type: "photo" | "live_photo" | "video";
  imageUrl?: string;
  imagePath?: string;
  videoUrl?: string;
  videoPath?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  isFavorite?: boolean;
  createdBy?: string;
  createdAt?: string;
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
