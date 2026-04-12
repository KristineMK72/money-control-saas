self.addEventListener("install", () => {
  console.log("Service worker installed");
});

self.addEventListener("activate", () => {
  console.log("Service worker activated");
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || "AskBen";
  const options = {
    body: data.body || "You have an upcoming bill reminder.",
    icon: "/apple-touch-icon.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
