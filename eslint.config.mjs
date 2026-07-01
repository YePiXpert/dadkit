import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "android/.gradle/**",
      "android/app/build/**",
      "android/app/src/main/assets/public/**",
      "android/build/**",
      "coverage/**",
      "ios/App/build/**",
      "ios/App/App/public/**",
      "next-env.d.ts",
      "node_modules/**",
      "out/**",
    ],
  },
];

export default eslintConfig;
