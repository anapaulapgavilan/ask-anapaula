"use client";

import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { z } from "zod";
import { APPROVED_CONTACT_EMAIL } from "../config/profile";
import { chatRequestSchema } from "../lib/chat-schema";
import type { Language } from "../lib/i18n";
import type { AvatarPresentationState } from "./AnimatedAvatar";
import { Disclaimer } from "./Disclaimer";
import { SuggestedQuestions } from "./SuggestedQuestions";

type Copy = {
  section: string;
  intro: string;
  inputLabel: string;
  placeholder: string;
  send: string;
  stop: string;
  setup: string;
  starters: readonly string[];
  responding: string;
  failed: string;
  incomplete: string;
  contactLink: string;
  characterLimit: string;
  conversationLimit: string;
  newConversation: string;
  copy: string;
  copied: string;
  copyFailed: string;
};

const errorEnvelope = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<(typeof message.parts)[number], { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function Chat({
  language,
  copy,
  onAvatarStateChange,
}: {
  language: Language;
  copy: Copy;
  onAvatarStateChange: (state: AvatarPresentationState) => void;
}) {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<"copied" | "failed" | null>(null);

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: ({ messages }) => {
      const cleanMessages = messages.map((message) => ({
        id: message.id,
        role: message.role,
        parts: message.parts.map((part) => part.type === "text"
          ? { type: "text" as const, text: part.text }
          : { type: "unsupported" as const, text: "" }),
      }));
      const parsed = chatRequestSchema.safeParse({ messages: cleanMessages, language });
      if (!parsed.success) throw new Error(copy.characterLimit);
      return { body: parsed.data };
    },
    fetch: async (input, init) => {
      let response: Response;
      try {
        response = await fetch(input, init);
      } catch {
        throw new Error(copy.failed);
      }
      if (!response.ok) {
        let body: unknown;
        try {
          body = await response.clone().json();
        } catch {
          throw new Error(copy.failed);
        }
        const parsed = errorEnvelope.safeParse(body);
        if (!parsed.success) throw new Error(copy.failed);
        const { code, message } = parsed.data.error;
        if (code === "CHAT_NOT_READY") throw new Error(copy.setup);
        if (code === "CONVERSATION_TOO_LONG") throw new Error(copy.conversationLimit);
        if (code === "MESSAGE_TOO_LONG") throw new Error(copy.characterLimit);
        throw new Error(message);
      }
      return response;
    },
  }), [copy.characterLimit, copy.conversationLimit, copy.failed, copy.setup, language]);

  const chat = useChat({ transport });
  const busy = chat.status === "submitted" || chat.status === "streaming";
  const overMessageLimit = Array.from(input).length > 1000;
  const conversationFull = chat.messages.length >= 20;
  const latestAssistant = [...chat.messages].reverse().find((message) => message.role === "assistant");
  const latestUserIndex = chat.messages.reduce(
    (index, message, current) => message.role === "user" ? current : index,
    -1,
  );
  const latestAssistantIndex = latestAssistant
    ? chat.messages.findIndex((message) => message.id === latestAssistant.id)
    : -1;
  const avatarStatus = chat.status === "error"
    ? "error"
    : chat.status === "submitted" || (chat.status === "streaming" && (!latestAssistant || !messageText(latestAssistant)))
      ? "thinking"
      : chat.status === "streaming"
        ? "responding"
        : "idle";

  useEffect(() => {
    onAvatarStateChange({ status: avatarStatus, requestId });
  }, [avatarStatus, onAvatarStateChange, requestId]);

  const submit = (text: string) => {
    const normalized = text.trim().normalize("NFC");
    if (!normalized || Array.from(normalized).length > 1000 || conversationFull || busy) {
      setInputError(Array.from(normalized).length > 1000 ? copy.characterLimit : "");
      return;
    }
    setInputError("");
    setCopyFeedback(null);
    setRequestId(crypto.randomUUID());
    void chat.sendMessage({ text: normalized }).catch((error: unknown) => {
      setInputError(error instanceof Error ? error.message : copy.failed);
    });
    setInput("");
  };

  const stop = () => {
    chat.stop();
  };

  const startNewConversation = () => {
    chat.setMessages([]);
    chat.clearError();
    setInput("");
    setInputError("");
    setCopyFeedback(null);
    setRequestId(null);
  };

  const copyAnswer = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback("copied");
    } catch {
      setCopyFeedback("failed");
    }
  };

  return (
    <section aria-labelledby="conversation-title" className="chat-section" id="conversation">
      <div className="chat-heading">
        <div>
          <p className="section-kicker">{copy.section}</p>
          <h2 id="conversation-title">{copy.intro}</h2>
        </div>
      </div>

      {chat.messages.length === 0 && (
        <SuggestedQuestions
          label={copy.section}
          onSelect={submit}
          questions={copy.starters}
        />
      )}

      <div aria-label={copy.section} aria-live="polite" className="message-list" role="log">
        {chat.messages.map((message) => {
          const text = messageText(message);
          return (
            <article className={`message message-${message.role}`} key={message.id}>
              {message.role === "assistant" ? (
                <div className="message-markdown">
                  <ReactMarkdown disallowedElements={["img"]} remarkPlugins={[remarkGfm]} skipHtml>
                    {text}
                  </ReactMarkdown>
                </div>
              ) : <p>{text}</p>}
              {message.role === "assistant" && text && (
                <button className="copy-button" onClick={() => void copyAnswer(text)} type="button">
                  {copy.copy}
                </button>
              )}
              {message.role === "assistant" && chat.status === "error" &&
                message.id === latestAssistant?.id && latestAssistantIndex > latestUserIndex && text && (
                  <p className="incomplete-answer" role="status">{copy.incomplete}</p>
                )}
            </article>
          );
        })}
      </div>

      {conversationFull && (
        <div className="conversation-limit" role="status">
          <p>{copy.conversationLimit}</p>
          <button className="secondary-button" onClick={startNewConversation} type="button">
            {copy.newConversation}
          </button>
        </div>
      )}
      {(inputError || chat.status === "error") && (
        <div className="form-error" role="alert">
          <p>{inputError || chat.error?.message || copy.failed}</p>
          <a href={`mailto:${APPROVED_CONTACT_EMAIL}`}>{copy.contactLink}</a>
        </div>
      )}
      {copyFeedback && (
        <p
          aria-live={copyFeedback === copy.copyFailed ? "assertive" : "polite"}
          className="copy-feedback"
          data-testid="copy-feedback"
          role={copyFeedback === copy.copyFailed ? "alert" : "status"}
        >
          {copyFeedback === "copied" ? copy.copied : copy.copyFailed}
        </p>
      )}

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
      >
        <label htmlFor="question-input">{copy.inputLabel}</label>
        <textarea
          autoComplete="off"
          id="question-input"
          onChange={(event) => {
            const value = event.target.value;
            setInput(value);
            setInputError(Array.from(value).length > 1000 ? copy.characterLimit : "");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!busy) submit(input);
            }
          }}
          placeholder={copy.placeholder}
          value={input}
        />
        <div className="composer-controls">
          {busy ? (
            <button className="secondary-button" onClick={stop} type="button">{copy.stop}</button>
          ) : (
            <button className="primary-button" disabled={!input.trim() || overMessageLimit || conversationFull} type="submit">
              {copy.send}
            </button>
          )}
        </div>
        <div className="disclosure"><Disclaimer language={language} /></div>
      </form>

      {chat.status === "streaming" && <span className="sr-only">{copy.responding}</span>}
    </section>
  );
}
