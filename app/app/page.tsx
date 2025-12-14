// app/page.tsx - This will be the login page

"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
	const router = useRouter();
	const { data: session, status } = useSession();

	// If already authenticated, redirect to chat
	useEffect(() => {
		if (status === "authenticated" && session) {
			router.push("/chat");
		}
	}, [session, status, router]);

	if (status === "loading") {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-900">
				<div className="animate-pulse text-white text-xl">Loading...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-900">
			<div className="bg-white p-8 rounded-lg shadow-md w-96">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-pink-500">
						SuperVaani
					</h1>
					<p className="text-gray-600 mt-2">
						Your campus assistant at Plaksha University
					</p>
				</div>

				<button
					onClick={() => signIn("azure-ad", { callbackUrl: "/chat" })}
					className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
				>
					Sign in with Microsoft
				</button>
			</div>
		</div>
	);
}
