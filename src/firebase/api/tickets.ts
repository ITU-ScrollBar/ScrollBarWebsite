import { auth } from "..";
import { storage } from "../index";
import { getExtension } from "./common";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  Ticket,
  TicketCreateParams,
  TicketDepartment,
  TicketImpact,
  TicketRequestType,
  TicketStatus,
} from "../../types/types-file";

const projectId = import.meta.env.VITE_APP_FIREBASE_PROJECT_ID as string;
const ticketsEndpoint = `https://europe-west1-${projectId}.cloudfunctions.net/calendar/tickets`;

const uploadTicketImage = async (
  file: File,
  uid: string,
  index: number
): Promise<{ path: string; url: string }> => {
  const extension = getExtension(file.name);
  const extensionSuffix = extension ? `.${extension}` : "";
  const path = `tickets/${uid}/${Date.now()}-${index}${extensionSuffix}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type,
  });

  const url = await getDownloadURL(storageRef);
  return { path, url };
};

const safeDeleteStoragePath = async (path?: string) => {
  if (!path) {
    return;
  }

  try {
    await deleteObject(ref(storage, path));
  } catch {
    // Best-effort cleanup for partially uploaded images.
  }
};

export const createTicket = async (ticket: TicketCreateParams, imageFiles: File[] = []) => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be signed in to create a ticket.");
  }

  const uploadedImages: Array<{ path: string; url: string }> = [];

  try {
    for (let index = 0; index < imageFiles.length; index += 1) {
      const file = imageFiles[index];
      if (!file.type.startsWith("image/")) {
        throw new Error("All attachments must be image files.");
      }

      const uploaded = await uploadTicketImage(file, currentUser.uid, index);
      uploadedImages.push(uploaded);
    }

    const token = await currentUser.getIdToken();
    const payload = {
      title: ticket.title,
      description: ticket.description,
      imageUrls: uploadedImages.map((image) => image.url),
      imagePaths: uploadedImages.map((image) => image.path),
      department: ticket.department,
      requestType: ticket.requestType,
      impact: ticket.impact,
    };

    const response = await fetch(ticketsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to create ticket");
    }

    return (await response.json()) as { id: string };
  } catch (error) {
    await Promise.all(uploadedImages.map((image) => safeDeleteStoragePath(image.path)));
    throw error;
  }
};

type ListTicketsHttpResponse = {
  tickets: {
    id: string;
    title: string;
    description: string;
    imageUrls?: string[];
    imagePaths?: string[];
    department: Ticket["department"];
    requestType: Ticket["requestType"];
    impact: Ticket["impact"];
    status: TicketStatus;
    createdByUid?: string;
    createdAtMs?: number;
    updatedAtMs?: number;
  }[];
};

export const listTickets = async (): Promise<(Ticket & { key: string })[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be signed in to list tickets.");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(ticketsEndpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to load tickets");
  }

  const payload = (await response.json()) as ListTicketsHttpResponse;

  return payload.tickets.map((ticket) => ({
    id: ticket.id,
    key: ticket.id,
    title: ticket.title,
    description: ticket.description,
    imageUrls: ticket.imageUrls ?? [],
    imagePaths: ticket.imagePaths ?? [],
    department: ticket.department,
    requestType: ticket.requestType,
    impact: ticket.impact,
    status: ticket.status,
    createdByRef: ticket.createdByUid ?? null,
    createdAt: ticket.createdAtMs ? new Date(ticket.createdAtMs) : undefined,
    updatedAt: ticket.updatedAtMs ? new Date(ticket.updatedAtMs) : undefined,
  }));
};

export const updateTicketStatus = async (
  id: string,
  status: TicketStatus
): Promise<void> => {
  return updateTicket(id, { status });
};

export const updateTicket = async (
  id: string,
  update: {
    title?: string;
    description?: string;
    department?: TicketDepartment;
    requestType?: TicketRequestType;
    impact?: TicketImpact;
    status?: TicketStatus;
  }
): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be signed in to update ticket.");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${ticketsEndpoint}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(update),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to update ticket");
  }
};

export const deleteTicket = async (id: string): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be signed in to delete ticket.");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(`${ticketsEndpoint}/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to delete ticket");
  }
};
