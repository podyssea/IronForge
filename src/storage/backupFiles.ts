import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { AppState } from "./migrations";
import { createBackupJson, restoreBackupJson } from "./backup";

export async function shareAppBackup(state: AppState, now = new Date()): Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error("File sharing is not available on this device.");
  const date = now.toISOString().slice(0, 10);
  const file = new File(Paths.cache, `IronForge-backup-${date}.json`);
  file.create({ overwrite: true });
  file.write(createBackupJson(state, now));
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Save IronForge backup",
  });
}

export async function pickAppBackup(): Promise<ReturnType<typeof restoreBackupJson> | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/json"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const file = new File(result.assets[0].uri);
  return restoreBackupJson(await file.text());
}
