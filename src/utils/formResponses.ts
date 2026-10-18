import { LendingEquipment, LendingRequest, LendingRequestStatus } from "../types/types-file";

// Shared by the member-facing lending form and the admin Form Responses page.
export const equipmentLabels: Record<LendingEquipment, string> = {
  [LendingEquipment.SOUNDBOKS]: "Soundboks",
  [LendingEquipment.SPEAKER_STAND]: "Speaker stand",
  [LendingEquipment.ICE_BUCKET]: "Ice bucket(s)",
  [LendingEquipment.IPAD]: "iPad(s)",
  [LendingEquipment.OTHER]: "Other",
};

export const equipmentOptions = Object.values(LendingEquipment).map((equipment) => ({
  label: equipmentLabels[equipment],
  value: equipment,
}));

export const lendingStatusLabels: Record<LendingRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
};

export const lendingStatusColors: Record<LendingRequestStatus, string> = {
  pending: "gold",
  approved: "green",
  declined: "red",
};

/** "Other" is stored with the member's own wording, so show that instead of the bare label. */
export const describeEquipment = (request: Pick<LendingRequest, "equipment" | "equipmentDetails">) => {
  const label = equipmentLabels[request.equipment] ?? equipmentLabels[LendingEquipment.OTHER];
  const details = request.equipmentDetails?.trim();

  if (request.equipment === LendingEquipment.OTHER && details) {
    return details;
  }

  return details ? `${label} - ${details}` : label;
};

export const formatFormDate = (value?: Date) => {
  if (!value) {
    return "-";
  }

  return value.toLocaleDateString("en-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatFormDateTime = (value?: Date) => {
  if (!value) {
    return "-";
  }

  return value.toLocaleString("en-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
