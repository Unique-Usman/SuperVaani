"use client";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface MarkdownRendererProps {
	content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]} // Add GitHub Flavored Markdown support
			rehypePlugins={[rehypeRaw]} // Allow HTML in markdown
			components={{
				// Custom link rendering to make links clickable
				a: ({ href, children }) => {
					if (!href) return <span>{children}</span>;

					return (
						<a
							href={href}
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-400 hover:underline cursor-pointer font-medium"
						>
							{children}
						</a>
					);
				},
				// Code block rendering with syntax highlighting
				code({ inline, className, children }) {
					const match = /language-(\w+)/.exec(className || "");
					return !inline && match ? (
						<SyntaxHighlighter
							style={atomDark}
							language={match[1]}
							PreTag="div"
							className="rounded-md my-2"
						>
							{String(children).replace(/\n$/, "")}
						</SyntaxHighlighter>
					) : (
						<code className={`${className} px-1 py-0.5 rounded bg-gray-700`}>
							{children}
						</code>
					);
				},
				// Proper styling for other elements
				h1: ({ children }) => (
					<h1 className="text-2xl font-bold my-4">{children}</h1>
				),
				h2: ({ children }) => (
					<h2 className="text-xl font-bold my-3">{children}</h2>
				),
				h3: ({ children }) => (
					<h3 className="text-lg font-bold my-2">{children}</h3>
				),
				ul: ({ children }) => (
					<ul className="list-disc pl-6 my-2">{children}</ul>
				),
				ol: ({ children }) => (
					<ol className="list-decimal pl-6 my-2">{children}</ol>
				),
				li: ({ children }) => <li className="my-1">{children}</li>,
				p: ({ children }) => <p className="my-2">{children}</p>,
				blockquote: ({ children }) => (
					<blockquote className="border-l-4 border-gray-500 pl-4 italic my-2">
						{children}
					</blockquote>
				),
				table: ({ children }) => (
					<div className="overflow-x-auto my-4">
						<table className="min-w-full border border-gray-600">
							{children}
						</table>
					</div>
				),
				thead: ({ children }) => (
					<thead className="bg-gray-700">{children}</thead>
				),
				tbody: ({ children }) => (
					<tbody className="divide-y divide-gray-600">{children}</tbody>
				),
				tr: ({ children }) => <tr className="bg-gray-800">{children}</tr>,
				th: ({ children }) => (
					<th className="px-4 py-2 text-left text-sm font-medium text-gray-300">
						{children}
					</th>
				),
				td: ({ children }) => <td className="px-4 py-2 text-sm">{children}</td>,
				hr: () => <hr className="my-4 border-gray-600" />,
			}}
		>
			{content}
		</ReactMarkdown>
	);
}
