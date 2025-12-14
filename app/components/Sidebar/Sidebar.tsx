"use client";

import { useState } from "react";
import { useChatContext } from "@/contexts/ChatContext";
import { signOut } from "next-auth/react";
import Image from "next/image";
import "./Sidebar.css";
import {
	HiOutlineMenu,
	HiPlus,
	HiOutlineQuestionMarkCircle,
	HiOutlineClock,
	HiOutlineCog,
} from "react-icons/hi";

export default function Sidebar() {
	const [extended, setExtended] = useState(false);
	const {
		conversations,
		newConversation,
		loadConversation,
		currentConversation,
		hasMoreConversations,
		loadMoreConversations,
	} = useChatContext();

	const formatDate = (date: Date) => {
		// Return date in format: Apr 22, 2025
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	return (
		<div
			className={`bg-gray-800 full_height text-gray-300 sticky top-0 flex flex-col h-transition-all ${extended ? "w-64" : "w-16"}`}
		>
			{/* Top section - fixed */}
			<div className="flex-shrink-0">
				<div className="p-4 flex items-center">
					<button
						onClick={() => setExtended((prev) => !prev)}
						className="text-gray-300 hover:text-white"
					>
						<HiOutlineMenu className="w-6 h-6" />
					</button>
				</div>

				<div className="mt-2 px-3">
					<button
						onClick={newConversation}
						className="w-full flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
					>
						<HiPlus className="w-5 h-5" />
						{extended && <span>New Chat</span>}
					</button>
				</div>
			</div>

			{/* Recent conversations section - scrollable */}
			{extended && (
				<div className="flex flex-col flex-grow min-h-0">
					<div className="px-4 py-3">
						<h3 className="text-xs uppercase font-semibold text-gray-400">
							Recent Conversations
						</h3>
					</div>

					<div className="flex-grow overflow-y-auto px-3 pb-2">
						{conversations.map((conversation) => (
							<button
								key={conversation.id}
								onClick={() => loadConversation(conversation.id)}
								className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-700 transition-colors rounded-md mb-1 ${
									currentConversation?.id === conversation.id
										? "bg-gray-700"
										: ""
								}`}
							>
								<div className="mt-1 shrink-0">
									<Image
										src="/assets/message_icon.png"
										alt=""
										width={16}
										height={16}
									/>
								</div>
								<div className="text-left truncate">
									<p className="text-sm truncate">{conversation.title}</p>
									<p className="text-xs text-gray-400">
										{formatDate(conversation.updatedAt)}
									</p>
								</div>
							</button>
						))}

						{hasMoreConversations && (
							<button
								onClick={loadMoreConversations}
								className="w-full text-center py-2 text-blue-400 hover:text-blue-300 text-sm"
							>
								Load more conversations
							</button>
						)}
					</div>
				</div>
			)}

			{/* Bottom section - fixed */}
			<div className="mt-auto border-t border-gray-700 flex-shrink-0">
				<div className="px-3 py-4">
					<button
						className={`w-full flex items-center gap-3 p-3 hover:bg-gray-700 rounded-md transition-colors`}
					>
						<HiOutlineQuestionMarkCircle className="w-5 h-5" />
						{extended && <span>Help</span>}
					</button>

					<button
						className={`w-full flex items-center gap-3 p-3 hover:bg-gray-700 rounded-md transition-colors`}
					>
						<HiOutlineClock className="w-5 h-5" />
						{extended && <span>Activity</span>}
					</button>

					<button
						className={`w-full flex items-center gap-3 p-3 hover:bg-gray-700 rounded-md transition-colors`}
					>
						<HiOutlineCog className="w-5 h-5" />
						{extended && <span>Settings</span>}
					</button>

					<button
						onClick={() => signOut({ callbackUrl: "/" })}
						className={`w-full flex items-center gap-3 p-3 text-red-400 hover:bg-gray-700 rounded-md transition-colors mt-2`}
					>
						<svg
							className="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
							/>
						</svg>
						{extended && <span>Sign Out</span>}
					</button>
				</div>
			</div>
		</div>
	);
}
