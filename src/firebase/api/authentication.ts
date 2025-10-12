import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  UserCredential,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

import { auth, db, storage } from '../index';
import { getCollection, getDocument, getExtension } from './common';

// Define the shape of the form data when creating a new user
interface FormData {
  email: string;
  password: string;
  firstname: string;
  surname: string;
  studyline: string;
}

// Observer type - specifies the methods for `next` and `error`
interface Observer<T> {
  next: (snapshot: T) => void;
  error: (error: Error) => void;
}

// Payload interfaces for update and delete operations
interface UpdateUserPayload {
  id: string;
  field: string;
  value: any;
}

interface DeleteInvitePayload {
  id: string;
}

interface ResetPasswordPayload {
  email: string;
}

// User profile type
export interface UserProfile {
  displayName: string;
  email: string;
  studyline: string;
  isAdmin: boolean;
  roles: string[];
  active: boolean;
  photoUrl: string;
}

// Create an account for a new user
export const createAccount = async (form: FormData): Promise<User> => {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
    const userData: UserProfile = {
      displayName: `${form.firstname} ${form.surname}`,
      email: form.email,
      studyline: form.studyline,
      isAdmin: false,
      roles: ['regular_access', 'tender', 'newbie'],
      active: true,
      photoUrl: '',
    };

    await updateDoc(doc(db, 'invites', form.email), { registered: true });
    await saveUser(userCredential.user.uid, userData);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Login a user with email and password
export const loginWithEmailAndPassword = async (
  email: string,
  password: string
): Promise<any> => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    const userData = await getDocument('/users', userCredential.user.uid, false);
    return userData;
  } catch (error) {
    throw error;
  }
};

// Check if the email is already invited
export const checkIfEmailIsInvited = (email: string): Promise<any> => {
  return getDocument('invites', email, false);
};

// Get a list of study lines
export const getStudyLines = (): Promise<DocumentData> => {
  return getCollection('/studylines', false);
};

// Get user data and listen for changes
export const getUser = (
  id: string,
  observer: Observer<any>
): (() => void) => {
  const ref = doc(db, 'users', id);
  return onSnapshot(ref, observer);
};

// Stream all users and listen for changes
export const streamUsers = (observer: Observer<QuerySnapshot>) => {
  const usersQuery = query(collection(db, 'users'), orderBy('displayName', 'asc'));
  
  return onSnapshot(usersQuery, {
    next: (snapshot: QuerySnapshot) => {
      observer.next(snapshot);
    },
    error: observer.error,
  });
};

// Stream invited users and listen for changes
export const streamInvitedUsers = (observer: Observer<QuerySnapshot>) => {
  return onSnapshot(collection(db, 'invites'), {
    next: (snapshot: QuerySnapshot) => {
      observer.next(snapshot);
    },
    error: observer.error,
  });
};
// Invite a user by email
export const inviteUser = (email: string): Promise<void> => {
  return setDoc(doc(db, 'invites', email), { registered: false });
};

// Delete an invite by its ID
export const deleteInvite = ({ id }: DeleteInvitePayload): Promise<void> => {
  return deleteDoc(doc(db, 'invites', id));
};

// Update a user's information
export const updateUser = ({ id, field, value }: UpdateUserPayload): Promise<void> => {
  return updateDoc(doc(db, 'users', id), { [field]: value });
};

// Upload a profile picture and return its URL
export const uploadProfilePicture = async (
  picture: File,
  email: string
): Promise<string> => {
  const extension = getExtension(picture.name);
  const storageRef = ref(storage, `profile_pictures/${email}.${extension}`);
  await uploadBytes(storageRef, picture, {
    contentType: picture.type,
    customMetadata: { uploadedBy: email },
  });
  return await getDownloadURL(storageRef);
};

// Save user data to Firestore
const saveUser = (id: string, profile: UserProfile): Promise<void> => {
  return setDoc(doc(db, 'users', id), profile);
};

// Sign out the currently authenticated user
export const signOutUser = (): Promise<void> => {
  return signOut(auth);
};

// Send a password reset email
export const sendResetPasswordEmailToUser = ({
  email,
}: ResetPasswordPayload): Promise<void> => {
  return sendPasswordResetEmail(auth, email);
};
