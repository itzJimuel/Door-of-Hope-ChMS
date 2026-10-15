export type Role = "admin" | "pastor" | "leader" | "usher" | "member";
export type ActivityStatus = "new" | "active" | "irregular" | "inactive";
export type MembershipStatus = "visitor" | "regular_attendee" | "member";
export type EventType = "sunday_service" | "small_group" | "prayer_meeting" | "event";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  pastor: "Pastor",
  leader: "Group leader",
  usher: "Usher / check-in",
  member: "Member (no access yet)",
};

export const MEMBERSHIP_LABELS: Record<MembershipStatus, string> = {
  visitor: "Visitor",
  regular_attendee: "Regular Attendee",
  member: "Member",
};

export const EVENT_LABELS: Record<EventType, string> = {
  sunday_service: "Sunday Service",
  small_group: "Small Group",
  prayer_meeting: "Prayer Meeting",
  event: "Event",
};

export const STATUS_ORDER: ActivityStatus[] = ["active", "new", "irregular", "inactive"];
