import {
  collection,
  doc,
  getDocs,
  getDoc,
  CollectionReference,
  DocumentReference,
} from 'firebase/firestore';
import { db } from '../index';
import { DocumentData } from './../../types/types-file';

export const getCollection = async (
  path: string,
  useEnv: boolean
): Promise<DocumentData[]> => {
  const ref: CollectionReference = useEnv
    ? collection(db, 'env', process.env.VITE_APP_ENV as string, path)
    : collection(db, path);

  const snapshot = await getDocs(ref);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    key: doc.id,
    ...doc.data(),
  }));
};

export const getDocument = async (
  collectionPath: string,
  id: string,
  useEnv: boolean
): Promise<DocumentData | null> => {
  const ref: DocumentReference = useEnv
    ? doc(db, 'env', process.env.VITE_APP_ENV as string, collectionPath, id)
    : doc(db, collectionPath, id);

  const snapshot = await getDoc(ref);
  return snapshot.exists()
    ? { id: snapshot.id, key: snapshot.id, ...snapshot.data() }
    : null;
};

export const getExtension = (path: string): string => {
  const basename = path.split(/[\\/]/).pop() || '';
  const pos = basename.lastIndexOf('.');
  if (basename === '' || pos < 1) return '';
  return basename.slice(pos + 1);
};