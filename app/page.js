"use client";

import { useEffect, useRef, useState } from "react";
import ChatForm from "./components/ChatForm";
import Message from "./components/Message";
import SlideOver from "./components/SlideOver";
import EmptyState from "./components/EmptyState";
import { Cog6ToothIcon, CodeBracketIcon } from "@heroicons/react/20/solid";
import { useCompletion } from "ai/react";
import { Toaster, toast } from "react-hot-toast";

function approximateTokenCount(text) {
  return Math.ceil(text.length * 0.4);
}

const VERSIONS = [
  {
    name: "Llama 2 7B",
    version: "d24902e3fa9b698cc208b5e63136c4e26e828659a9f09827ca6ec5bb83014381",
    shortened: "7B",
  },
  {
    name: "Llama 2 13B",
    version: "9dff94b1bed5af738655d4a7cbcdcde2bd503aa85c94334fe1f42af7f3dd5ee3",
    shortened: "13B",
  },
  {
    name: "Llama 2 70B",
    version: "2796ee9483c3fd7aa2e171d38f4ca12251a30609463dcfd4cd76703f22e96cdf",
    shortened: "70B",
  },
  {
    name: "Llava 13B",
    version: "6bc1c7bb0d2a34e413301fee8f7cc728d2d4e75bfab186aa995f63292bda92fc",
    shortened: "Llava",
  },
  {
    name: "Salmonn",
    version: "f49c499450c8aa0692692b69c1af047e7911256a3ba2967277ad465aafe2c05f",
    shortened: "Salmonn",
  },
];

function CTA({ shortenedModelName }) {
  if (shortenedModelName == "Llava") {
    return (
      <a
        href="https://replicate.com/blog/run-llama-2-with-an-api?utm_source=project&utm_campaign=llama2ai"
        target="_blank"
        className="underline"
      >
        Run and fine-tune Llava in the cloud.
      </a>
    );
  } else if (shortenedModelName == "Salmonn") {
    return (
      <a
        href="https://replicate.com/blog/run-llama-2-with-an-api?utm_source=project&utm_campaign=llama2ai"
        target="_blank"
        className="underline"
      >
        Run and fine-tune Salmonn in the cloud.
      </a>
    );
  } else {
    return (
      <a
        href="https://replicate.com/blog/run-llama-2-with-an-api?utm_source=project&utm_campaign=llama2ai"
        target="_blank"
        className="underline"
      >
        Run and fine-tune Llama 2 in the cloud.
      </a>
    );
  }
}

export default function HomePage() {
  const MAX_TOKENS = 4096;
  const bottomRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);

  //   Llama params
  const [size, setSize] = useState(VERSIONS[2]); // default to 70B
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful assistant."
  );
  const [temp, setTemp] = useState(0.75);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(800);

  //  Llava params
  const [image, setImage] = useState(null);

  // Salmonn params
  const [audio, setAudio] = useState(null);

  const { complete, completion, setInput, input } = useCompletion({
    api: "/api",
    body: {
      version: size.version,
      systemPrompt: systemPrompt,
      temperature: parseFloat(temp),
      topP: parseFloat(topP),
      maxTokens: parseInt(maxTokens),
      image: image,
      audio: audio,
    },
    onError: (error) => {
      setError(error);
    },
  });

  const handleFileUpload = (file) => {
    if (file) {
      console.log(file);
      // determine if file is image or audio
      if (
        ["audio/mpeg", "audio/wav", "audio/ogg"].includes(
          file.originalFile.mime
        )
      ) {
        setAudio(file.fileUrl);
        setSize(VERSIONS[4]);
        toast.success(
          "You uploaded an audio file, so you're now speaking with Salmonn."
        );
      } else if (
        ["audio/mpeg", "audio/wav", "audio/ogg"].includes(
          file.originalFile.mime
        )
      ) {
        setImage(file.fileUrl);
        setSize(VERSIONS[3]);
        toast.success(
          "You uploaded an image, so you're now speaking with Llava."
        );
      } else {
        toast.error(
          `Sorry, we don't support that file type (${file.originalFile.mime}) yet. Feel free to push a PR to add support for it!`
        );
      }
    }
  };

  const setAndSubmitPrompt = (newPrompt) => {
    handleSubmit(newPrompt);
  };

  const handleSettingsSubmit = async (event) => {
    event.preventDefault();
    setOpen(false);
    setSystemPrompt(event.target.systemPrompt.value);
  };

  const handleSubmit = async (userMessage) => {
    const SNIP = "<!-- snip -->";

    const messageHistory = [...messages];
    if (completion.length > 0) {
      messageHistory.push({
        text: completion,
        isUser: false,
      });
    }
    messageHistory.push({
      text: userMessage,
      isUser: true,
    });

    const generatePrompt = (messages) => {
      return messages
        .map((message) =>
          message.isUser ? `[INST] ${message.text} [/INST]` : `${message.text}`
        )
        .join("\n");
    };

    // Generate initial prompt and calculate tokens
    let prompt = `${generatePrompt(messageHistory)}\n`;
    // Check if we exceed max tokens and truncate the message history if so.
    while (approximateTokenCount(prompt) > MAX_TOKENS) {
      if (messageHistory.length < 3) {
        setError(
          "Your message is too long. Please try again with a shorter message."
        );

        return;
      }

      // Remove the third message from history, keeping the original exchange.
      messageHistory.splice(1, 2);

      // Recreate the prompt
      prompt = `${SNIP}\n${generatePrompt(messageHistory)}\n`;
    }

    setMessages(messageHistory);

    complete(prompt);
  };

  useEffect(() => {
    if (messages?.length > 0 || completion?.length > 0) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, completion]);

  return (
    <>
      <div className="bg-slate-100 border-b-2 text-center p-3">
        Powered by Replicate. <CTA shortenedModelName={size.shortened} />
      </div>
      <nav className="grid grid-cols-2 pt-3 pl-6 pr-3 sm:grid-cols-3 sm:pl-0">
        <div className="hidden sm:inline-block"></div>
        <div className="font-semibold text-gray-500 sm:text-center">
          {size.shortened == "Llava"
            ? "🌋"
            : size.shortened == "Salmonn"
            ? "🐟"
            : "🦙"}{" "}
          <span className="hidden sm:inline-block">Chat with</span>{" "}
          <button
            className="py-2 font-semibold text-gray-500 hover:underline"
            onClick={() => setOpen(true)}
          >
            {size.shortened == "Llava" || size.shortened == "Salmonn"
              ? size.shortened
              : "Llama 2 " + size.shortened}
          </button>
        </div>
        <div className="flex justify-end">
          <a
            className="inline-flex items-center px-3 py-2 mr-3 text-sm font-semibold text-gray-700 bg-white rounded-md shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            href="https://github.com/replicate/chat"
          >
            <CodeBracketIcon
              className="w-5 h-5 text-gray-500 sm:mr-2 group-hover:text-gray-900"
              aria-hidden="true"
            />{" "}
            <span className="hidden sm:inline">Clone on GitHub</span>
          </a>
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 text-sm font-semibold text-gray-900 bg-white rounded-md shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            onClick={() => setOpen(true)}
          >
            <Cog6ToothIcon
              className="w-5 h-5 text-gray-500 sm:mr-2 group-hover:text-gray-900"
              aria-hidden="true"
            />{" "}
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </nav>

      <Toaster position="top-left" reverseOrder={false} />

      <main className="max-w-2xl pb-5 mx-auto mt-4 sm:px-4">
        <div className="text-center"></div>
        {messages.length == 0 && !image && !audio && (
          <EmptyState setPrompt={setAndSubmitPrompt} setOpen={setOpen} />
        )}

        <SlideOver
          open={open}
          setOpen={setOpen}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          handleSubmit={handleSettingsSubmit}
          temp={temp}
          setTemp={setTemp}
          maxTokens={maxTokens}
          setMaxTokens={setMaxTokens}
          topP={topP}
          setTopP={setTopP}
          versions={VERSIONS}
          size={size}
          setSize={setSize}
        />

        {image && (
          <div>
            <img src={image} className="mt-6 sm:rounded-xl" />
          </div>
        )}

        {audio && (
          <div>
            <audio controls src={audio} className="mt-6 sm:rounded-xl" />
          </div>
        )}

        <ChatForm
          prompt={input}
          setPrompt={setInput}
          onSubmit={handleSubmit}
          handleFileUpload={handleFileUpload}
        />

        {error && <div>{error}</div>}

        <article className="pb-24">
          {messages.map((message, index) => (
            <Message
              key={`message-${index}`}
              message={message.text}
              isUser={message.isUser}
            />
          ))}
          <Message message={completion} isUser={false} />
          <div ref={bottomRef} />
        </article>
      </main>
    </>
  );
}
