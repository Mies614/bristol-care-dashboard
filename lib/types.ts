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
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
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
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
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

export type PeriodRecord = {
  id: string;
  startDate: string;
  endDate?: string;
  flow?: "light" | "medium" | "heavy";
  symptoms?: string[];
  mood?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
};

export type PeriodSettings = {
  averageCycleLength: number;
  averagePeriodLength: number;
  reminderDaysBefore: number;
};

export type CloudSettings = {
  girlfriendName?: string;
  nextMeetingDate?: string | null;
  semesterEndDate?: string | null;
  backgroundSettings?: BackgroundSettings;
  themeSettings?: ThemeSettings;
  periodSettings?: PeriodSettings;
  periodRecords?: PeriodRecord[];
  autoSyncSettings?: AutoSyncSettings;
  quickActions?: string; // JSON stringified QuickAction[]
};

export type AutoSyncSettings = {
  enabled: boolean;
  [key: string]: unknown;
};

export type BackgroundImageFit = "cover" | "contain" | "portrait" | "softPortrait" | "fullPhoto";

export type BackgroundOverlay = "none" | "light" | "medium" | "strong";

export type ContentProtection = "none" | "softPanel" | "strongPanel" | "gradientMask";

export type BackgroundSettings = {
  mode: "preset" | "color" | "image" | "url" | "cloudImage";
  preset?: "cream" | "pink" | "lavender" | "blue" | "green" | "dark";
  color?: string;
  imageDataUrl?: string;
  imageUrl?: string;
  cloudImageUrl?: string;
  cloudImagePath?: string;
  imageFit?: BackgroundImageFit;
  imagePosition?: "center" | "top" | "bottom" | "left" | "right";
  focalPoint?: {
    x: number;
    y: number;
  };
  overlay?: BackgroundOverlay;
  blur?: boolean;
  blurAmount?: number;
  portraitEnhance?: boolean;
  dim?: number;
  scale?: number;
  contentProtection?: ContentProtection;
  photoVisibility?: number;
};

export type AppThemeStyle = "soft" | "romantic" | "minimal" | "study" | "night" | "photo" | "playful" | "elegant";

export type ThemeCardStyle = "glass" | "solid" | "paper" | "flat" | "outline";

export type ThemeNavStyle = "glass" | "pill" | "paper" | "minimal" | "floating";

export type ThemeRadius = "medium" | "large" | "extra";

export type ThemeDecoration = "none" | "stars" | "hearts" | "tape" | "moon" | "dots";

export type BackgroundTreatment = "soft" | "clearPhoto" | "blurPhoto" | "dimPhoto" | "gradientPhoto";

export type ThemeSettings = {
  style: AppThemeStyle;
  cardStyle: ThemeCardStyle;
  navStyle: ThemeNavStyle;
  radius: ThemeRadius;
  decoration: ThemeDecoration;
  backgroundTreatment?: BackgroundTreatment;
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
  themeSettings: ThemeSettings;
  periodRecords?: PeriodRecord[];
  periodSettings?: PeriodSettings;
};