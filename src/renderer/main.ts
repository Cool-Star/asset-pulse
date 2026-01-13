import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";
import "element-plus/theme-chalk/dark/css-vars.css"; // Import Dark Mode Vars
import * as ElementPlusIconsVue from "@element-plus/icons-vue";
import "./styles/global.scss";

const app = createApp(App);

// 注册 Element Plus
app.use(ElementPlus);

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

app.use(router).mount("#app");

// window.location.href = "https://www.baidu.com";
