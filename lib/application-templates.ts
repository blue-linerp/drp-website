import type { Question } from "./questions";

export interface ApplicationTemplate {
  id: string;
  name: string;
  summary: string;
  title: string;
  slug: string;
  category: "WHITELIST" | "DEPARTMENT" | "STAFF" | "SPECIAL";
  department: string;
  icon: string;
  description: string;
  requiresWhitelist: boolean;
  grantsWhitelist: boolean;
  questions: Question[];
}

const question = (id: string, label: string, section: string, type: Question["type"] = "long_text", required = true): Question => ({ id, label, section, type, required });
const about = () => [
  question("preferred_name", "What name should we call you?", "About you", "short_text"),
  question("timezone", "What is your time zone?", "About you", "short_text"),
  question("availability", "What days and times are you usually available?", "About you"),
];
const character = () => question("character_name", "What is your character's first and last name?", "Your character", "short_text");
const agreement = () => question("agree_rules", "I have read and agree to the server rules.", "Final check", "agree_rules");

export const APPLICATION_TEMPLATES: ApplicationTemplate[] = [
  {
    id: "whitelist", name: "Whitelist", summary: "Welcome new players and assess their roleplay knowledge.",
    title: "Whitelist Application", slug: "whitelist-application", category: "WHITELIST", department: "", icon: "key-round",
    description: "Apply to join DreamRP and begin your story in the city.", requiresWhitelist: false, grantsWhitelist: true,
    questions: [...about(), character(),
      question("character_story", "Tell us about your character and what brings them to the city.", "Your character"),
      question("roleplay_experience", "Describe your previous roleplay experience. New players are welcome.", "Roleplay"),
      question("rules_scenario", "What would you do if another player broke a rule during a scene?", "Roleplay"),
      question("value_of_life", "What does valuing your character's life mean to you? Give an example.", "Roleplay"), agreement()],
  },
  {
    id: "police", name: "Police / LEO", summary: "Recruit officers with experience and scenario questions.",
    title: "Police Department Application", slug: "police-application", category: "DEPARTMENT", department: "police", icon: "shield",
    description: "Apply to serve as a law enforcement officer in DreamRP.", requiresWhitelist: true, grantsWhitelist: false,
    questions: [...about(), character(),
      question("why_police", "Why does your character want to join the police department?", "Department"),
      question("leo_experience", "Describe any previous law enforcement roleplay experience.", "Department"),
      question("strengths", "What strengths would your character bring to the department?", "Department"),
      question("traffic_stop", "How would you handle a traffic stop that escalates into a pursuit?", "Scenarios"),
      question("officer_conduct", "How would you respond if another officer violated department policy?", "Scenarios"), agreement()],
  },
  {
    id: "staff", name: "Staff / Admin", summary: "Review moderation experience, judgment, and availability.",
    title: "Staff Application", slug: "staff-application", category: "STAFF", department: "", icon: "badge-check",
    description: "Apply to help support and moderate the DreamRP community.", requiresWhitelist: true, grantsWhitelist: false,
    questions: [...about(),
      question("why_staff", "Why would you like to join the staff team?", "Staff"),
      question("experience", "Describe your previous moderation or staff experience.", "Staff"),
      question("hours", "How many hours per week can you realistically dedicate to staff duties?", "Staff", "number"),
      question("friend_report", "How would you handle a report against a friend?", "Scenarios"),
      question("conflicting_reports", "Two players give conflicting accounts of a scene. How would you investigate?", "Scenarios"),
      question("confidentiality", "How would you protect private information shared in a staff ticket?", "Scenarios"), agreement()],
  },
  {
    id: "ems", name: "EMS / Medical", summary: "Recruit medical staff and explore patient-care scenarios.",
    title: "EMS Application", slug: "ems-application", category: "DEPARTMENT", department: "ems", icon: "heart-pulse",
    description: "Apply to provide medical care and emergency services in the city.", requiresWhitelist: true, grantsWhitelist: false,
    questions: [...about(), character(), question("why_ems", "Why does your character want to join EMS?", "Department"),
      question("experience", "Describe your medical or EMS roleplay experience.", "Department"),
      question("medical_scenario", "How would you roleplay assessing and treating an injured patient?", "Scenarios"),
      question("scene_safety", "What would you do if you arrived at an unsafe scene?", "Scenarios"), agreement()],
  },
  {
    id: "doj", name: "Department of Justice", summary: "Applications for attorneys, prosecutors, and judges.",
    title: "DOJ Application", slug: "doj-application", category: "DEPARTMENT", department: "doj", icon: "scale",
    description: "Apply to work within the city's legal system.", requiresWhitelist: true, grantsWhitelist: false,
    questions: [...about(), character(),
      { ...question("role", "Which position are you applying for?", "Department", "select"), options: ["Defense attorney", "Prosecutor", "Judge", "Other"] },
      question("why_doj", "Why does your character want to work in the legal system?", "Department"),
      question("experience", "Describe your legal roleplay experience.", "Department"),
      question("fairness", "How would you handle a conflict of interest in a case?", "Scenarios"), agreement()],
  },
  {
    id: "business", name: "Business", summary: "Collect business plans, staffing, and roleplay ideas.",
    title: "Business Application", slug: "business-application", category: "SPECIAL", department: "", icon: "store",
    description: "Pitch a business and explain how it will add to the city's roleplay.", requiresWhitelist: true, grantsWhitelist: false,
    questions: [character(), question("business_name", "What is the name of your proposed business?", "Business plan", "short_text"),
      question("business_concept", "Describe the business and what it will offer.", "Business plan"),
      question("location", "Where would you like the business to operate?", "Business plan", "short_text"),
      question("staffing", "How will you staff and manage the business?", "Operations"),
      question("roleplay", "What roleplay opportunities will your business create for others?", "Operations"), agreement()],
  },
  {
    id: "gang", name: "Gang / Organization", summary: "Review an organization's story, members, and plans.",
    title: "Organization Application", slug: "organization-application", category: "SPECIAL", department: "", icon: "users",
    description: "Apply to establish an organization in DreamRP.", requiresWhitelist: true, grantsWhitelist: false,
    questions: [character(), question("organization_name", "What is the name of your organization?", "Organization", "short_text"),
      question("members", "List the founding members and their character names.", "Organization"),
      question("story", "Describe your organization's background and goals.", "Organization"),
      question("roleplay", "What roleplay will your organization create for other players?", "Plans"),
      question("conflict", "How will you handle conflict with another organization fairly?", "Plans"), agreement()],
  },
  {
    id: "creator", name: "Content Creator", summary: "Review channels, content, and community involvement.",
    title: "Content Creator Application", slug: "creator-application", category: "SPECIAL", department: "", icon: "video",
    description: "Apply to join the DreamRP creator community.", requiresWhitelist: true, grantsWhitelist: false,
    questions: [...about(), question("channel", "Link your main content channel.", "Your content", "url"),
      { ...question("platforms", "Which platforms do you use?", "Your content", "multi_select"), options: ["YouTube", "Twitch", "TikTok", "Kick", "Other"], min: 1 },
      question("content", "What kind of content do you create?", "Your content"),
      question("community", "How would you contribute to the DreamRP community?", "Your content"), agreement()],
  },
];
