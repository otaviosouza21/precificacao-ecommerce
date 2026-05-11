"use server";

import { lerProgresso, ProgressoSync } from "./progressoStore";

export async function getProgressoSync(sessionKey: string): Promise<ProgressoSync | null> {
  return lerProgresso(sessionKey);
}
