import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: "./",
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: "index.template.html",
      output: {
        format: "iife",
        inlineDynamicImports: true,
        entryFileNames: "assets/quiz-bundle.js",
        name: "NiyunQuizApp"
      }
    }
  }
});
