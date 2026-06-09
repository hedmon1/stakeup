import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export async function uploadCheckinPhoto(
  groupId: string, goalId: string, uid: string, uri: string
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const path = `groups/${groupId}/goals/${goalId}/checkins/${uid}/${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return path;
}

export async function uploadProfilePhoto(uid: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `profiles/${uid}.jpg`);
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
  return await getDownloadURL(storageRef);
}

export function getPhotoURL(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}
