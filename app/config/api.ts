// config/api.ts
import { getSession } from "next-auth/react";

export interface ConversationData {
	id: string;
	title: string;
	created_at: string;
	updated_at: string;
}

export interface MessageData {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: string;
}

// Send a chat message to the backend
export async function sendChatMessage(
	userMessage: string,
	conversationId?: string,
): Promise<any> {
	try {
		// Get the current user session using client-side method
		const session = await getSession();

		// Use the user's email or ID as a stable identifier
		// Fall back to a generated ID if no user is authenticated
		const userID = session?.user?.email
			? encodeURIComponent(session.user.email)
			: generateUserID(userMessage);

		const payload = {
			user_message: userMessage,
			conversation_id: conversationId,
		};

		const response = await fetch(
			`https://supervaani.plaksha.edu.in/api/${userID}/supervaani`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			},
		);

		if (!response.ok) {
			throw new Error(`Network response was not ok: ${response.statusText}`);
		}

		const data = await response.json();
		return {
			message: data.supervaani_message,
			conversationId: data.conversation_id,
		};
	} catch (error) {
		console.error("Error:", error);
		throw error;
	}
}

// Fetch user's conversations from the backend
export async function fetchConversations(
	limit: number = 10,
	offset: number = 0,
): Promise<{ conversations: ConversationData[]; hasMore: boolean }> {
	try {
		// Get the current user session using client-side method
		const session = await getSession();

		if (!session?.user?.email) {
			return { conversations: [], hasMore: false };
		}

		const userID = encodeURIComponent(session.user.email);

		const response = await fetch(
			`https://supervaani.plaksha.edu.in/api/${userID}/conversations?limit=${limit}&offset=${offset}`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Network response was not ok: ${response.statusText}`);
		}

		const data = await response.json();
		return {
			conversations: data.conversations,
			hasMore: data.has_more,
		};
	} catch (error) {
		console.error("Error fetching conversations:", error);
		return { conversations: [], hasMore: false };
	}
}

// Fetch messages for a specific conversation
export async function fetchConversationMessages(
	conversationId: string,
): Promise<MessageData[]> {
	try {
		// Get the current user session using client-side method
		const session = await getSession();

		if (!session?.user?.email) {
			return [];
		}

		const userID = encodeURIComponent(session.user.email);

		const response = await fetch(
			`https://supervaani.plaksha.edu.in/api/${userID}/conversations/${conversationId}`,
			{
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Network response was not ok: ${response.statusText}`);
		}

		const data = await response.json();
		return data.messages;
	} catch (error) {
		console.error("Error fetching conversation messages:", error);
		return [];
	}
}

// Clean up when user leaves or logs out - client-side safe
export async function cleanupUserSession(): Promise<void> {
	try {
		// Use client-side method to get session
		const session = await getSession();

		// If no session or no email, just return
		if (!session?.user?.email) {
			return;
		}

		const userID = encodeURIComponent(session.user.email);

		await fetch(`https://supervaani.plaksha.edu.in/api/${userID}/leave`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});
	} catch (error) {
		console.error("Error cleaning up session:", error);
	}
}

// Helper function to generate a user ID based on message length
function generateUserID(userMessage: string): string {
	return `user_${userMessage.length}`;
}
