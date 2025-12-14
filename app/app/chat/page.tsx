// app/chat/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar/Sidebar";
import Main from "@/components/Main/Main";
import { ChatProvider } from "@/contexts/ChatContext";
import { useSession } from "next-auth/react";

const RollingLoader = () => {
	return (
		<div className="flex justify-center items-center">
			<div className="w-16 h-16 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
		</div>
	);
};

export default function ChatPage() {
	const { status } = useSession();
	const router = useRouter();

	useEffect(() => {
		// Client-side redirect for unauthenticated users
		if (status === "unauthenticated") {
			router.push("/");
		}
	}, [status, router]);

	if (status === "loading") {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-900">
				<RollingLoader />
			</div>
		);
	}

	// Don't render anything for unauthenticated users
	if (status === "unauthenticated") {
		return null;
	}

	return (
		<ChatProvider>
			<div className="flex min-h-screen bg-gray-900">
				<Sidebar />
				<Main />
			</div>
		</ChatProvider>
	);
}
