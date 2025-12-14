// auth.ts
import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
		AzureADProvider({
			clientId: process.env.AZURE_AD_CLIENT_ID!,
			clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
			tenantId: process.env.AZURE_AD_TENANT_ID!,
			id: "azure-ad",
			authorization: {
				url: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/authorize`,
				params: {
					scope: "openid profile email User.Read",
				},
			},
			token: {
				url: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
			},
			client: { token_endpoint_auth_method: "client_secret_post" },
		} as any),
	],
	pages: {
		signIn: "/",
	},
	callbacks: {
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user;
			const pathname = nextUrl.pathname;
			
			// Define protected routes that require authentication
			const protectedRoutes = ["/chat", "/upload"];
			const isOnProtectedRoute = protectedRoutes.some(route => 
				pathname.startsWith(route)
			);
			
			// If on a protected route, require authentication
			if (isOnProtectedRoute) {
				if (isLoggedIn) return true;
				return false;
			}
			
			// If logged in and on root path, redirect to chat
			if (isLoggedIn && pathname === "/") {
				return Response.redirect(new URL("/chat", nextUrl));
			}
			
			// Allow all other routes
			return true;
		},
	},
	trustHost: true,
});
