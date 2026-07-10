"use client";

import { createContext, useContext } from "react";
import { SETTINGS_DEFAULTS, type LearnerSettings } from "@/lib/constants";

export const SettingsContext = createContext<LearnerSettings>(SETTINGS_DEFAULTS);

export function useSettings() {
  return useContext(SettingsContext);
}
