import { createApp } from "vue";
import { useStore } from "./store";

import App from "./App.vue";

const app = createApp(App);
app.use(useStore);
app.mount("#app");

if (process.env.NODE_ENV === "development") {
  window.app = app;
  window.store = useStore();
}
