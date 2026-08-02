import type { Metadata } from "next";

import { HouseholdSettingsWorkspace } from "@/components/household/HouseholdSettingsWorkspace";

export const metadata: Metadata = { title: "家庭成员 | DadKit", description: "管理家庭成员、照护者和当前设备使用者。" };

export default function FamilySettingsPage() { return <HouseholdSettingsWorkspace />; }
