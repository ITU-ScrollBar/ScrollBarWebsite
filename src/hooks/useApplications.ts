import { message } from "antd";
import { DocumentData, DocumentSnapshot, QuerySnapshot, Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  resetAndDeleteApplicationRound,
  streamApplicationRoundMeta,
  streamApplications,
  submitApplication,
  submitApplicationRound,
  updateApplicationDecision,
} from "../firebase/api/applications";
import { ApplicationDecision, IntakeApplication } from "../types/types-file";

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
    deleteRound,
  };
}
