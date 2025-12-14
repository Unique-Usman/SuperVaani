"use client";

import { useSession } from "next-auth/react";
import { useChatContext } from "@/contexts/ChatContext";
import Image from "next/image";
import "./Main.css";
import PlakshaIcon from "../../public/assets/plaksha.png";
import { useRef, useEffect } from "react";
import { HiPhotograph, HiMicrophone, HiPaperAirplane } from "react-icons/hi";
import {
	LuAmbulance,
	LuNotebookPen,
	LuDumbbell,
	LuBrain,
} from "react-icons/lu";

// Import for message rendering
import { MarkdownRenderer } from "../MarkdownRenderer";

// Define suggestion cards
const suggestionCards = [
	{
		text: "What are my courses in the first semester ?",
		icon: <LuNotebookPen />,
	},
	{
		text: "Is there any Gym ?",
		icon: <LuDumbbell />,
	},
	{
		text: "Who are the professors in Machine Learning ?",
		icon: <LuBrain />,
	},
	{
		text: "Whom do I contact in case of emergency ?",
		icon: <LuAmbulance />,
	},
];

export default function Main() {
	const { data: session } = useSession();
	const { input, setInput, currentConversation, loading, sendMessage } =
		useChatContext();

	// Reference for scrolling to bottom
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Scroll to bottom when messages change
	useEffect(() => {
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [currentConversation?.messages]);

	// Handle form submission
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (input.trim()) {
			sendMessage(input.trim());
		}
	};

	// Handle suggestion card click
	const handleSuggestionClick = (suggestion: string) => {
		setInput(suggestion);
		sendMessage(suggestion);
	};

	// User avatar component to avoid repetition
	const UserAvatar = () => {
		return session?.user?.image ? (
			<Image
				src={session.user.image}
				alt={session.user.name || "User"}
				width={36}
				height={36}
				className="rounded-full"
			/>
		) : (
			<div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white">
				{session?.user?.name?.charAt(0) || "U"}
			</div>
		);
	};

	return (
		<div className="flex-1  flex flex-col bg-gray-900 text-gray-100">
			{/* Header */}
			<div className="flex sticky top-0 bg-gray-900 justify-between items-center p-4 border-b border-gray-800">
				<h1 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
					SuperVaani
				</h1>
				<div className="flex items-center gap-2">
					<UserAvatar />
				</div>
			</div>

			{/* Main Content - Fixed height with overflow */}
			<div className="flex-1 overflow-hidden">
				<div className="h-full overflow-y-auto p-4" id="messages-container">
					<div className="max-w-3xl mx-auto">
						{!currentConversation?.messages.length ? (
							<>
								{/* Welcome message */}
								<div className="text-center mb-8 animate-fadeIn">
									<h2 className="text-4xl font-bold mb-4">
										<div className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
											<p> Hi {`${session?.user?.name}`}! </p>
											Welcome to SuperVaani...
										</div>
									</h2>
									<p className="text-xl text-gray-300">
										Curious About Plaksha? Ask now!
									</p>
								</div>

								{/* Suggestion cards */}
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
									{suggestionCards.map((card, index) => (
										<div
											key={`suggestion-${index}`}
											onClick={() => handleSuggestionClick(card.text)}
											className="bg-gray-800 p-4 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-700 transition-colors"
										>
											<p className="text-gray-200">{card.text}</p>
											<div className="p-3 bg-gray-700 rounded-full p-1">
												{card.icon}
											</div>
										</div>
									))}
								</div>
							</>
						) : (
							// Chat messages
							<div className="flex flex-col space-y-6">
								{currentConversation.messages.map((message, index) => (
									<div
										key={message.id || `message-${index}`}
										className={`flex ${message.role === "user" ? "justify-end items-center" : "justify-start"}`}
									>
										{/* Bot image for assistant messages */}
										{message.role !== "user" && (
											<div className="mr-2 flex-shrink-0">
												<Image
													src={PlakshaIcon}
													alt="SuperVaani"
													width={36}
													height={36}
													className="rounded-full"
													priority
												/>
											</div>
										)}

										<div
											className={`
                        max-w-[75%] sm:max-w-[80%] md:max-w-3xl rounded-lg p-4
                        ${
													message.role === "user"
														? "bg-blue-600 text-white rounded-br-none"
														: "bg-gray-800 rounded-bl-none"
												}
                      `}
										>
											{message.role === "user" ? (
												<p>{message.content}</p>
											) : (
												<div className="prose prose-invert max-w-none">
													<MarkdownRenderer content={message.content} />
												</div>
											)}
										</div>

										{/* User image for user messages */}
										{message.role === "user" && (
											<div className="ml-2 flex-shrink-0">
												<UserAvatar />
											</div>
										)}
									</div>
								))}

								{/* Loading indicator */}
								{loading && (
									<div className="flex justify-start">
										<div className="mr-2 flex-shrink-0">
											<Image
												src={PlakshaIcon}
												alt="SuperVaani"
												width={36}
												height={36}
												className="rounded-full"
											/>
										</div>
										<div className="bg-gray-800 rounded-lg p-4 rounded-bl-none max-w-[75%] sm:max-w-[80%] md:max-w-3xl">
											<div className="flex space-x-2">
												<div
													className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
													style={{ animationDelay: "0ms" }}
												></div>
												<div
													className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
													style={{ animationDelay: "150ms" }}
												></div>
												<div
													className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
													style={{ animationDelay: "300ms" }}
												></div>
											</div>
										</div>
									</div>
								)}

								{/* Scroll anchor */}
								<div ref={messagesEndRef} />
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Input area */}
			<div className="p-4 border-t bg-gray-900 border-gray-800 input">
				<div className="max-w-3xl mx-auto">
					<form onSubmit={handleSubmit} className="relative">
						<div className="flex items-center bg-gray-800 rounded-lg p-2">
							<input
								type="text"
								value={input}
								onChange={(e) => setInput(e.target.value)}
								placeholder="Enter a prompt here"
								className="flex-1 bg-transparent border-none outline-none p-2 text-gray-100"
							/>
							<div className="flex items-center gap-2 px-2">
								<button
									type="button"
									className="text-gray-400 hover:text-gray-300"
								>
									<HiPhotograph className="w-5 h-5" />
								</button>
								<button
									type="button"
									className="text-gray-400 hover:text-gray-300"
								>
									<HiMicrophone className="w-5 h-5" />
								</button>
								{input && (
									<button
										type="submit"
										className="text-blue-400 hover:text-blue-300"
									>
										<HiPaperAirplane className="w-5 h-5 transform rotate-90" />
									</button>
								)}
							</div>
						</div>
					</form>
					<p className="text-center text-xs text-gray-500 mt-2">
						SuperVaani may display inaccurate information, so double-check its
						responses. Report any errors to the SuperVaani team.
					</p>
				</div>
			</div>
		</div>
	);
}
