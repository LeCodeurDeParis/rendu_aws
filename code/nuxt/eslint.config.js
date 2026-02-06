import js from "@eslint/js";
import vue from "eslint-plugin-vue";

export default [
  {
    ignores: [".output/**", "node_modules/**"],
  },

  // Règles JS de base
  js.configs.recommended,

  // Règles Vue 3
  ...vue.configs["flat/recommended"],

  // Configuration projet
  {
    files: ["**/*.{js,vue}"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "no-console": "warn",
      "no-unused-vars": "warn",
    },
  },
];
