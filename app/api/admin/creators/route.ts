import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const usersFile = path.join(process.cwd(), "data", "users.json");

function readUsers() {
  return JSON.parse(fs.readFileSync(usersFile, "utf-8"));
}

function writeUsers(data: any) {
  fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
}

export async function GET() {
  const users = readUsers();
  const creators = users.filter((u: any) => u.creatorEnabled);
  return NextResponse.json({ users: creators });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { userId, action } = body;

  const users = readUsers();
  const index = users.findIndex((u: any) => u.id === userId);

  if (index === -1) {
    return NextResponse.json({ success: false });
  }

  if (action === "approve") {
    users[index].creatorStatus = "approved";
    users[index].permissions = {
      ...users[index].permissions,
      canSubmitReview: true,
      canReceiveCommission: true
    };
  }

  writeUsers(users);

  return NextResponse.json({ success: true });
}