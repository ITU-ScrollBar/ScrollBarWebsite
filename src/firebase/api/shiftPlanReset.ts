// "Reset period" — undoes a generated shift plan back to its pre-generation snapshot
// (see functions/src/shiftPlanning/firebaseData.ts persistPlannerResult, which captures the
// snapshot atomically with the one-and-only generate run for a period). Runs client-side,
// same permission class as the existing manual engagement removal in ShiftAssignmentInfo.tsx.
import { collection, deleteField, doc, DocumentReference, writeBatch } from "firebase/firestore";
import { db } from "..";
import { Engagement, ShiftPlanningPeriod } from "../../types/types-file";

const env = import.meta.env.VITE_APP_ENV as string;

const WRITE_BATCH_LIMIT = 450; // stay comfortably under Firestore's 500 ops/batch cap

const getPeriodsCollection = () => collection(doc(collection(db, "env"), env), "shiftPlanningPeriods");
const getEngagementsCollection = () => collection(doc(collection(db, "env"), env), "engagements");
const getUsersCollection = () => collection(db, "users");

type BatchOp =
  | { kind: "delete"; ref: DocumentReference }
  | { kind: "update"; ref: DocumentReference; data: Record<string, unknown> };

const commitOpsInChunks = async (ops: BatchOp[]) => {
  for (let i = 0; i < ops.length; i += WRITE_BATCH_LIMIT) {
    const chunk = ops.slice(i, i + WRITE_BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.kind === "delete") {
        batch.delete(op.ref);
      } else {
        batch.update(op.ref, op.data);
      }
    }
    await batch.commit();
  }
};

export type ResetShiftPlanningPeriodResult = {
  deletedEngagementCount: number;
  restoredRoleCount: number;
};

export const resetShiftPlanningPeriod = async (params: {
  period: ShiftPlanningPeriod;
  periodEngagements: Engagement[];
}): Promise<ResetShiftPlanningPeriodResult> => {
  const { period, periodEngagements } = params;
  const snapshot = period.preGenerationSnapshot;

  if (!snapshot) {
    throw new Error("This period has no pre-generation snapshot to reset to.");
  }

  const keepEngagementIds = new Set(snapshot.engagementIds);
  const engagementsToDelete = periodEngagements.filter((engagement) => !keepEngagementIds.has(engagement.id));

  const ops: BatchOp[] = engagementsToDelete.map((engagement) => ({
    kind: "delete",
    ref: doc(getEngagementsCollection(), engagement.id),
  }));

  for (const roleSnapshot of snapshot.roleSnapshots) {
    ops.push({
      kind: "update",
      ref: doc(getUsersCollection(), roleSnapshot.userId),
      data: { roles: roleSnapshot.roles },
    });
  }

  ops.push({
    kind: "update",
    ref: doc(getPeriodsCollection(), period.id),
    data: {
      status: snapshot.status,
      generatedAt: deleteField(),
      generatedBy: deleteField(),
      stats: deleteField(),
      preGenerationSnapshot: deleteField(),
    },
  });

  await commitOpsInChunks(ops);

  return {
    deletedEngagementCount: engagementsToDelete.length,
    restoredRoleCount: snapshot.roleSnapshots.length,
  };
};

