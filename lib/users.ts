import fs from "fs/promises";
import path from "path";
import { User } from "./types";

const usersFilePath = path.join(process.cwd(), "data", "users.json");

async function ensureUsersFile() {
  try {
    await fs.access(usersFilePath);
  } catch {
    await fs.mkdir(path.dirname(usersFilePath), { recursive: true });
    await fs.writeFile(usersFilePath, "[]", "utf8");
  }
}

export async function getUsers(): Promise<User[]> {
  await ensureUsersFile();
  const raw = await fs.readFile(usersFilePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveUsers(users: User[]) {
  await ensureUsersFile();
  await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), "utf8");
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const users = await getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  return user || null;
}

export async function findUserById(id: string): Promise<User | null> {
  const users = await getUsers();
  const user = users.find((u) => u.id === id);
  return user || null;
}

export async function createUser(user: User) {
  const users = await getUsers();
  users.push(user);
  await saveUsers(users);
  return user;
}