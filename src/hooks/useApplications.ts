import { message } from "antd";
import { DocumentData, DocumentSnapshot, QuerySnapshot, Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  queueTemplateTestEmail,
  QueueEmailResult,
  queueRejectedApplicationEmails,
  resetAndDeleteApplicationRound,
  streamApplicationRoundMeta,
  streamApplications,
  submitApplication,
  submitApplicationRound,
  updateApplicationEmailDeliveryStatuses,
  updateApplicationDecision,
} from "../firebase/api/applications";
import { ApplicationDecision, EmailDeliveryStatus, IntakeApplication } from "../types/types-file";

type ApplicationsState = {
  loading: boolean;
  applications: IntakeApplication[];
  submittedAt?: Date;
};

export default function useApplications() {
  const [state, setState] = useState<ApplicationsState>({
    loading: true,
    applications: [],
  });

  useEffect(() => {
    const unsubscribeApplications = streamApplications(
      (snapshot: QuerySnapshot<DocumentData>) => {
        const applications: IntakeApplication[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            fullName: data.fullName,
            email: data.email,
            studyline: data.studyline,
            comment: data.comment,
            applicationFilePath: data.applicationFilePath,
            photoPath: data.photoPath,
            decision: (data.decision ?? "pending") as ApplicationDecision,
            emailDeliveryStatus: (data.emailDeliveryStatus ?? "pending") as EmailDeliveryStatus,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined,
          };
        });

        setState((prev) => ({ ...prev, applications, loading: false }));
      },
      (error) => {
        message.error(`Failed to load applications: ${error.message}`);
        setState((prev) => ({ ...prev, loading: false }));
      }
    );

    const unsubscribeMeta = streamApplicationRoundMeta(
      (snapshot: DocumentSnapshot<DocumentData>) => {
        const data = snapshot.data();
        const submittedAt =
          data?.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : undefined;
        setState((prev) => ({ ...prev, submittedAt }));
      },
      (error) => {
        message.error(`Failed to load application round metadata: ${error.message}`);
      }
    );

    return () => {
      unsubscribeApplications();
      unsubscribeMeta();
    };
  }, []);

  const submitNewApplication = async (payload: {
    fullName: string;
    email: string;
    studyline: string;
    comment: string;
    file: File;
    photoFile: File;
  }) => {
    await submitApplication(payload);
    message.success("Application submitted successfully.");
  };

  const setDecision = async (id: string, decision: "maybe" | "accept" | "reject") => {
    await updateApplicationDecision(id, decision);
  };

  const submitRound = async (submittedByUid: string) => {
    await submitApplicationRound(submittedByUid);
    message.success("Application round submitted.");
  };

  const queueRejectedEmails = async (
    rejections: Array<{ id: string; email: string; fullName: string }>,
    bodyText?: string
  ): Promise<QueueEmailResult> => {
    if (!rejections.length) {
      return { successful: [], failed: [] };
    }

    return queueRejectedApplicationEmails(
      rejections.map((rejection) => ({
        id: rejection.id,
        email: rejection.email,
        fullName: rejection.fullName,
        bodyText,
      }))
    );
  };

  const setEmailDeliveryStatuses = async (
    updates: Array<{
      id: string;
      emailDeliveryStatus?: "pending" | "success" | "failed";
    }>
  ) => {
    await updateApplicationEmailDeliveryStatuses(updates);
  };

  const sendTemplateTestEmail = async (payload: {
    templateType: "invite" | "rejection";
    email: string;
    fullName: string;
    bodyText?: string;
  }) => {
    await queueTemplateTestEmail(payload);
    message.success("Test email has been sent.");
  };

  const deleteRound = async () => {
    await resetAndDeleteApplicationRound(
      state.applications.map((application) => ({
        id: application.id,
        applicationFilePath: application.applicationFilePath,
        photoPath: application.photoPath,
      }))
    );
    message.success("Application round deleted.");
  };

  const grouped = useMemo(() => {
    return {
      pending: state.applications.filter((a) => a.decision === "pending"),
      maybe: state.applications.filter((a) => a.decision === "maybe"),
      accept: state.applications.filter((a) => a.decision === "accept"),
      reject: state.applications.filter((a) => a.decision === "reject"),
    };
  }, [state.applications]);

  return {
    applicationsState: state,
    grouped,
    submitNewApplication,
    setDecision,
    submitRound,
    queueRejectedEmails,
    setEmailDeliveryStatuses,
    sendTemplateTestEmail,
    deleteRound,
  };
}
