import EventEmitter from "events";

export const notificationEmitter = new EventEmitter();
export enum NotificationPurpose {
  sent = "sent",
  accepted = "accepted",
  rejected = "rejected",
}
export type NotificationEventArgs = {
  type: "notification";
  purpose: NotificationPurpose;
  text: string;
  inviteId: string;
  tripId: string;
  actingUserId: string;
};
