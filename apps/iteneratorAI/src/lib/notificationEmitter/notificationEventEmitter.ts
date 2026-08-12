import EventEmitter from "events";

export const notificationEmitter = new EventEmitter();
export type NotificationEventArgs = {
  type: "inviteNotification";
  text: string;
  inviteId: string;
};
