import type { Metadata } from "next";

import { OnboardingWorkspace } from "@/components/onboarding/OnboardingWorkspace";

export const metadata: Metadata = { title: "首次设置 | DadKit", description: "设置使用阶段、家庭成员和当前设备使用者。" };

export default function OnboardingPage() { return <OnboardingWorkspace />; }
