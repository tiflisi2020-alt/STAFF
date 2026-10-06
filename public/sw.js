self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "ცვლა მალე იწყება", body: "" };
  event.waitUntil(
    self.registration.showNotification(data.title || "ცვლა მალე იწყება", {
      body: data.body || "",
      lang: "ka",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/schedule"));
});
