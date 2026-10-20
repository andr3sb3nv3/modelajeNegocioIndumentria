import "server-only";
import { assertDemoSheetId, DEMO_DRIVE, logicalSheetId, sheetUrl } from "./config";

type DemoTabs = Record<string, Record<string, number>>;

/** Link directo cuando el manifiesto incluye el gid de la pestaña; sin consultas ni credenciales. */
export async function linkPestana(id: string, pestana: string) {
  assertDemoSheetId(id);
  const tabs = (DEMO_DRIVE as typeof DEMO_DRIVE & { tabs?: DemoTabs }).tabs;
  const gid = tabs?.[logicalSheetId(id)]?.[pestana] ?? tabs?.[id]?.[pestana];
  const url = sheetUrl(id);
  return typeof gid === "number" && Number.isInteger(gid) && gid >= 0 ? `${url}#gid=${gid}` : url;
}
