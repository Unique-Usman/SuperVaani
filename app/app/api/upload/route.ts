import { NextResponse } from "next/server";
import { auth } from "@/auth";

const getAuthorizedEmails = (): string[] => {
  const emailsEnv = process.env.AUTHORIZED_UPLOAD_EMAILS;
  if (!emailsEnv) {
    console.warn("AUTHORIZED_UPLOAD_EMAILS not set in environment variables");
    return [];
  }
  return emailsEnv.split(",").map((email) => email.trim().toLowerCase());
};

export async function GET() {
  try {
    const session = await auth();

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { authorized: false, reason: "Not authenticated" },
        { status: 200 },
      );
    }

    const authorizedEmails = getAuthorizedEmails();
    const userEmail = session.user.email.toLowerCase();
    const isAuthorized = authorizedEmails.includes(userEmail);

    return NextResponse.json({
      authorized: isAuthorized,
      email: session.user.email,
    });
  } catch (error) {
    console.error("Authorization check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
