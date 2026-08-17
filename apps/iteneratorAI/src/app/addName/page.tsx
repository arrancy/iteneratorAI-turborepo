"use client";

import { useEffect, useState } from "react";

export default function AddName() {
  const [notifications, setNotifications] = useState<string[]>([]);
  const [status, setStatus] = useState<string>("not connected");
  useEffect(() => {
    const eventSource = new EventSource(
      "http://localhost:3000/api/v1/app/notification",
    );
    console.log("readyState:", eventSource.readyState);

    eventSource.onopen = (event) => {
      console.log("opened");
      setStatus("connected");
    };
    eventSource.onmessage = (event) => {
      const incomingData = JSON.parse(event.data);
      const incomingDataString = JSON.stringify(incomingData);
      setNotifications((prevNotifications) => {
        return [...prevNotifications, incomingDataString];
      });
    };

    eventSource.onerror = (err) => {
      console.error(err);
    };
    return () => eventSource.close();
  }, []);
  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-200 items-center justify-center">
      <div className="border-slate-200 text-3xl font-semibold bg-slate-900 text-slate-50 p-3 border-2 rounded-lg text-center">
        sse notifications : <br></br>
        {status}
        <div className="mt-4">
          {notifications.map((notification, key) => (
            <div key={key}>{notification}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
