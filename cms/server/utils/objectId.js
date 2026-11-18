import { ObjectId } from 'mongodb';

/**
 * ObjectId dari string id, atau null bila tidak valid (mis. slug).
 * `new ObjectId('slug')` melempar error; di handler async Express 4 error itu tidak
 * tertangkap dan mematikan seluruh proses server, jadi selalu periksa dulu.
 */
export function toObjectId(id) {
  if (id instanceof ObjectId) return id;
  if (typeof id !== 'string' || !/^[0-9a-fA-F]{24}$/.test(id)) return null;
  return new ObjectId(id);
}
