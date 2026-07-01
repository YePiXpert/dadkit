import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yepixpert.dadkit",
  appName: "DadKit",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#fff7f8",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
