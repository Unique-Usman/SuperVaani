"use client";

import {
	createContext,
	ReactNode,
	useState,
	useContext,
	useEffect,
} from "react";
import {
	sendChatMessage,
	fetchConversations,
	fetchConversationMessages,
	cleanupUserSession,
	ConversationData,
	MessageData,
} from "@/config/api";
import { useSession } from "next-auth/react";

// Define the chat message type
export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
}

// Define conversation type
export interface Conversation {
	id: string;
	title: string;
	messages: ChatMessage[];
	createdAt: Date;
	updatedAt: Date;
}

export interface ChatContextType {
	input: string;
	setInput: (input: string) => void;
	currentConversation: Conversation | null;
	conversations: Conversation[];
	loading: boolean;
	sendMessage: (message?: string) => Promise<void>;
	newConversation: () => void;
	loadConversation: (id: string) => Promise<void>;
	hasMoreConversations: boolean;
	loadMoreConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
	const { data: session, status } = useSession();
	const isAuthenticated = status === "authenticated";

	const [input, setInput] = useState<string>("");
	const [conversations, setConversations] = useState<Conversation[]>([]);
	const [currentConversation, setCurrentConversation] =
		useState<Conversation | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [hasMoreConversations, setHasMoreConversations] =
		useState<boolean>(false);
	const [conversationsOffset, setConversationsOffset] = useState<number>(0);

	// Convert server data format to client format
	const convertMessageFormat = (message: MessageData): ChatMessage => {
		return {
			id: message.id,
			role: message.role,
			content: message.content,
			timestamp: new Date(message.timestamp),
		};
	};

	const convertConversationFormat = (
		conv: ConversationData,
		messages: ChatMessage[] = [],
	): Conversation => {
		return {
			id: conv.id,
			title: conv.title,
			messages: messages,
			createdAt: new Date(conv.created_at),
			updatedAt: new Date(conv.updated_at),
		};
	};

	// Load conversations from backend on initial render when authenticated
	useEffect(() => {
		if (status === "loading" || !isAuthenticated) return;

		const loadInitialConversations = async () => {
			try {
				const result = await fetchConversations(10, 0);

				const formattedConversations = result.conversations.map((conv) =>
					convertConversationFormat(conv),
				);

				setConversations(formattedConversations);
				setHasMoreConversations(result.hasMore);
				setConversationsOffset(formattedConversations.length);

				// Always start with a fresh page (no current conversation)
				setCurrentConversation(null);
			} catch (error) {
				console.error("Error loading conversations:", error);
			}
		};

		loadInitialConversations();
	}, [isAuthenticated, status]);

	// Cleanup when component unmounts or user changes
	useEffect(() => {
		return () => {
			if (isAuthenticated) {
				// Call cleanup function when component unmounts
				cleanupUserSession().catch((err) => {
					console.error("Error during cleanup:", err);
				});
			}
		};
	}, [isAuthenticated]);

	// Function to prepare for a new conversation but not store it yet
	const newConversation = () => {
		// Simply set the current conversation to null
		// A new conversation will be created when the first message is sent
		setCurrentConversation(null);
		setInput("");
	};

	// Function to load a conversation
	const loadConversation = async (id: string) => {
		// Check if we already have this conversation with messages loaded
		const existingConv = conversations.find(
			(conv) => conv.id === id && conv.messages.length > 0,
		);

		if (existingConv) {
			setCurrentConversation(existingConv);
			return;
		}

		// Find the conversation in our list
		const conversation = conversations.find((conv) => conv.id === id);
		if (!conversation) return;

		try {
			setLoading(true);

			// Fetch messages for this conversation
			const messages = await fetchConversationMessages(id);

			// Convert message format
			const formattedMessages = messages.map(convertMessageFormat);

			// Create updated conversation with messages
			const updatedConversation = {
				...conversation,
				messages: formattedMessages,
			};

			// Update the conversation in our list
			setConversations((prev) =>
				prev.map((conv) => (conv.id === id ? updatedConversation : conv)),
			);

			// Set as current conversation
			setCurrentConversation(updatedConversation);
		} catch (error) {
			console.error(`Error loading conversation ${id}:`, error);
		} finally {
			setLoading(false);
		}
	};

	// Function to load more conversations (pagination)
	const loadMoreConversations = async () => {
		if (!isAuthenticated || !hasMoreConversations) return;

		try {
			setLoading(true);

			const result = await fetchConversations(10, conversationsOffset);

			const formattedConversations = result.conversations.map((conv) =>
				convertConversationFormat(conv),
			);

			// Append new conversations to existing list
			setConversations((prev) => [...prev, ...formattedConversations]);
			setHasMoreConversations(result.hasMore);
			setConversationsOffset((prev) => prev + formattedConversations.length);
		} catch (error) {
			console.error("Error loading more conversations:", error);
		} finally {
			setLoading(false);
		}
	};

	// Function to send a message
	const sendMessage = async (message?: string) => {
		setLoading(true);
		const messageToSend = message || input;

		if (!messageToSend.trim()) {
			setLoading(false);
			return;
		}

		try {
			// Get current conversation ID if it exists
			const conversationId = currentConversation?.id;

			// Create user message for UI
			const userMessage: ChatMessage = {
				id: `temp_msg_${Date.now()}`, // Temporary ID
				role: "user",
				content: messageToSend,
				timestamp: new Date(),
			};

			let updatedMessages: ChatMessage[] = [];
			let tempConversationId = conversationId;

			// If we have a current conversation, update it with the new message
			if (currentConversation) {
				// Include all existing messages plus the new user message
				updatedMessages = [...currentConversation.messages, userMessage];

				const updatedConversation = {
					...currentConversation,
					messages: updatedMessages,
					updatedAt: new Date(),
				};

				setCurrentConversation(updatedConversation);
			} else {
				// Create a temporary conversation until we get the real ID
				updatedMessages = [userMessage];
				tempConversationId = `temp_conv_${Date.now()}`;

				const tempConversation: Conversation = {
					id: tempConversationId,
					title:
						messageToSend.slice(0, 30) +
						(messageToSend.length > 30 ? "..." : ""),
					messages: updatedMessages,
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				setCurrentConversation(tempConversation);
			}

			// Send message to API
			const response = await sendChatMessage(messageToSend, conversationId);

			// Get the real conversation ID and assistant response
			const realConversationId = response.conversationId;
			const assistantContent = response.message;

			// Create assistant message
			const assistantMessage: ChatMessage = {
				id: `msg_${Date.now() + 1}`,
				role: "assistant",
				content: assistantContent,
				timestamp: new Date(),
			};

			// Add assistant message to updated messages
			updatedMessages = [...updatedMessages, assistantMessage];

			// This is the complete conversation with both user and assistant messages
			const finalConversation: Conversation = {
				id: realConversationId,
				title:
					messageToSend.slice(0, 30) + (messageToSend.length > 30 ? "..." : ""),
				messages: updatedMessages,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Set as current conversation
			setCurrentConversation(finalConversation);

			// Update conversations list
			setConversations((prev) => {
				// Remove the temporary or old conversation
				const filtered = prev.filter(
					(conv) =>
						conv.id !== realConversationId && conv.id !== tempConversationId,
				);
				// Add the updated conversation at the top
				return [finalConversation, ...filtered];
			});

			// Clear input field
			setInput("");
		} catch (error) {
			console.error("Error sending message:", error);
			// Handle error - could add an error message to the conversation
		} finally {
			setLoading(false);
		}
	};

	const value = {
		input,
		setInput,
		currentConversation,
		conversations,
		loading,
		sendMessage,
		newConversation,
		loadConversation,
		hasMoreConversations,
		loadMoreConversations,
	};

	return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// Custom hook to use the chat context
export function useChatContext() {
	const context = useContext(ChatContext);
	if (context === undefined) {
		throw new Error("useChatContext must be used within a ChatProvider");
	}
	return context;
}
