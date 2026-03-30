import { message } from "antd";
import { useEffect, useState } from "react";
import {
  deleteInvite,
  getStudyLines,
  inviteUser,
  streamInvitedUsers,
  streamUsers,
  updateUser,
  deleteUser,
  deleteFileFromStorage
} from "../firebase/api/authentication";
import { Tender, Invite, StudyLine } from "../types/types-file"; // Ensure the correct import path
import { DocumentData } from "firebase/firestore";
import useEngagements from "./useEngagements";

type TenderState = {
  loading: boolean;
  isLoaded: boolean;
  tenders: Tender[];
  studylines?: StudyLine[]; // Optional property for study lines
};

const useTenders = () => {
  const [tenderState, setTenderState] = useState<TenderState>({
    loading: false,
    isLoaded: false,
    tenders: [],
    studylines: [], // Initialize with an empty array or fetch from API if needed
  });

  const { engagementState } = useEngagements();

  const [invitedTenders, setInvitedTenders] = useState<Invite[]>([]);

  useEffect(() => {
    setTenderState((prevState) => ({ ...prevState, loading: true }));

    // Fetch study lines
    getStudyLines()
      .then((response) => {
        const studylines: StudyLine[] = response.map((doc: DocumentData) => {
          return doc as StudyLine; // Type the document data as StudyLine
        });

        setTenderState((prevState) => ({
          ...prevState,
          loading: false,
          isLoaded: true,
          studylines: studylines,
        }));
      })
      .catch((error) => {
        message.error(`Failed to fetch study lines: ${error.message}`);
        setTenderState((prevState) => ({
          ...prevState,
          loading: false,
          isLoaded: false,
        }));
      });

    // Stream tenders data
    const unsubscribeTenders = streamUsers({
      next: (snapshot) => {
        const updatedTenders: Tender[] = snapshot.docs.map((doc) => {
          const data = doc.data() as Tender; // Typing the data as Tender
          return { ...data, uid: doc.id };
        });
        setTenderState((prevState) => ({
          ...prevState,
          loading: false,
          isLoaded: true,
          tenders: updatedTenders,
        }));
      },
      error: (error) => {
        message.error(
          `An error occurred while streaming tenders: ${error.message}`
        );
        setTenderState((prevState) => ({
          ...prevState,
          loading: false,
          isLoaded: false,
        }));
      },
    });

    // Stream invited tenders data
    const unsubscribeInvitedTenders = streamInvitedUsers({
      next: (snapshot) => {
        const updatedInvites: Invite[] = snapshot.docs.map((doc) => {
          const data = doc.data() as Invite; // Typing the data as Invite
          return { ...data, id: doc.id, key: doc.id };
        });
        setInvitedTenders(updatedInvites);
      },
      error: (error) => {
        message.error(
          `An error occurred while streaming invited tenders: ${error.message}`
        );
      },
    });

    // Cleanup streams on component unmount
    return () => {
      unsubscribeInvitedTenders();
      unsubscribeTenders();
    };
  }, []);

  // Add invite
  const addInvite = (email: string) => {
    return inviteUser(email)
      .then((response) => {
        message.success("Invite sent successfully!");
        return response; // Return the response from the inviteUser function
      })
      .catch((error) => {
        message.error(`Failed to send invite: ${error.message}`);
        throw error; // Propagate error for further handling if needed
      });
  };

  // Remove invite
  const removeInvite = (row: string) => {
    return deleteInvite({id: row})
      .then(() => {
        message.success("Invite removed successfully!");
      })
      .catch((error) => {
        message.error(`Failed to remove invite: ${error.message}`);
        throw error; // Propagate error for further handling if needed
      });
  };

  // Update tender
  const updateTender = (id: string, field: string, value: any) => {
    return updateUser({ id, field, value })
      .then(() => {
        message.success("Tender updated successfully!");
      })
      .catch((error) => {
        message.error(`Failed to update tender: ${error.message}`);
        throw error; // Propagate error for further handling if needed
      });
  };

  // Soft-deletes a tender
  // Only succeeds if the tender exists and has no future shifts/engagements
  const deleteTender = (id: string) => {
    const tender = tenderState.tenders.find(tender => tender.uid === id);
    if (!tender) {
      message.error("Tender not found.");
      return;
    }

    // Check for future shifts or engagements before deleting
    const tenderShifts = engagementState.engagements.filter(engagement => engagement.userId === id && engagement.shiftEnd > new Date());

    if (tenderShifts.length > 0) {
      message.error(`Cannot delete ${tender.displayName ?? "tender"}. Remove them from ${tenderShifts.length} upcoming shifts first.`);
      return;
    }

    if (tender.photoUrl) {
      deleteFileFromStorage(tender.photoUrl).catch((error) => {
        message.error(`Failed to delete tender photo: ${error.message}`);
      });
    }
    const tenderName = tender.displayName;
    deleteUser(tender.uid)
      .then(() => {
        message.success(`${tenderName ?? "Tender"} deleted successfully!`);
      })
      .catch((error) => {
        message.error(`Failed to delete ${tenderName ?? "tender"}: ${error.message}`);
      }
    );
  };

  return {
    tenderState,
    invitedTenders,
    addInvite,
    removeInvite,
    updateTender,
    deleteTender,
  };
};

export default useTenders;
