import { strToU8, zipSync } from "fflate";
import { getStorageFileBytes } from "../../../../firebase/api/common";
import { IntakeApplication } from "../../../../types/types-file";

// Leading ' stops Excel from running applicant-written text as a formula.
const csvCell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`;

const safeName = (value: string) => value.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 60) || "applicant";

const extension = (path: string) => path.match(/\.[A-Za-z0-9]{1,5}$/)?.[0] ?? "";

/**
 * Bundles every application into one zip: applications.csv with all fields, plus each
 * applicant's application file and photo. Returns how many files could not be fetched.
 */
export default async function downloadAllApplications(
  applications: IntakeApplication[],
  studyLineName: (id: string) => string
): Promise<number> {
  const files: Record<string, Uint8Array> = {};
  let failed = 0;

  const rows = await Promise.all(
    applications.map(async (application, index) => {
      const prefix = `${String(index + 1).padStart(3, "0")}-${safeName(application.fullName ?? "")}`;
      const fileNames = await Promise.all(
        [
          { path: application.applicationFilePath, name: `${prefix}-application` },
          { path: application.photoPath, name: `${prefix}-photo` },
        ].map(async ({ path, name }) => {
          if (!path) return "";
          const fileName = `files/${name}${extension(path)}`;
          try {
            files[fileName] = await getStorageFileBytes(path);
            return fileName;
          } catch {
            failed += 1;
            return "download failed";
          }
        })
      );
      return [
        application.fullName,
        application.email,
        studyLineName(application.studyline),
        application.comment,
        application.decision,
        application.createdAt?.toLocaleString() ?? "",
        ...fileNames,
      ];
    })
  );

  const header = ["Name", "Email", "Study line", "Comment", "Decision", "Submitted", "Application file", "Photo"];
  // BOM so Excel opens the CSV as UTF-8 (Danish letters); ";" because Danish Excel splits columns on it.
  const csv = "\uFEFF" + [header, ...rows].map((row) => row.map((cell) => csvCell(cell ?? "")).join(";")).join("\r\n");
  files["applications.csv"] = strToU8(csv);

  const zip = zipSync(files, { level: 0 });
  const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `applications-${new Date().toISOString().slice(0, 10)}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return failed;
}
