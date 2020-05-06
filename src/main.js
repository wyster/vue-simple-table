import { createApp } from "vue";
import { useStore } from "./store";

import App from "./App.vue";

const app = createApp(App);
app.use(useStore);
app.mount("#app");
