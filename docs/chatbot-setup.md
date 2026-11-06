# Chat assistant setup (Zapier Chatbots)

The site shows a "Chat with us" link (in the phone "More" stack and as a round button from 768 px) that opens the chatbot's public page, run by Zapier, in a new tab. The chat is not embedded in the site: Zapier's embed is a paid (Pro trial) feature, and the free public page cannot be framed by other sites. Nothing from Zapier loads on our pages. While `chatbot.url` in `src/config/site.ts` is null, no chat link or privacy paragraph appears.

## 1. Create the chatbot in Zapier

1. In Zapier, open Chatbots and create a new chatbot for Unicorp Travel.
2. Under Behavior (instructions), paste the text in section 3: the three rules sections, then a line `# Knowledge:` and, underneath, the full contents of `https://unicorp-travel.vercel.app/chatbot-knowledge.txt`. This is the live address for now; when the client gives a domain, use `https://<their domain>/chatbot-knowledge.txt`. The file is rebuilt with every deploy, so after any content change (services, FAQs, contact details) deploy, then paste the new contents again.
3. Optional, paid (Pro): instead of pasting, add that address as a Knowledge source (type "Website / URL") and refresh it after each deploy. If you do, keep the rules but change "Knowledge section" to "knowledge source".
4. Do not set up lead capture or a Zap: the chatbot does not collect or forward visitor details. Visitors are pointed to the enquiry form, WhatsApp or a phone call.
5. Appearance: Avatar = `public/apple-touch-icon.png`; colour `#ED0000`.
6. Greeting message: "Please don't share personal or payment details here; to enquire, use WhatsApp, call or the enquiry form on our website."
7. Open Share, then the Public Link tab, and copy the public URL (currently `https://unicorp-travel-assistant.zapier.app`).

## 2. Paste the URL

In `src/config/site.ts`, set `chatbot.url` to the public URL. Build and deploy. The privacy page shows its chat paragraph automatically while the URL is set. Set it to `null` to remove the chat everywhere.

To test the empty case in a throwaway build, set the environment variable `CHATBOT_TEST_URL=none`. Never use it for a real deploy.

## 3. Bot instructions

Paste this, then the knowledge text underneath `# Knowledge:`:

```
# Objective: You are the website assistant for Unicorp Travel, a travel agency in Noida that arranges holidays, corporate travel, air tickets, visas, hotels and car rentals. Your objective is to answer visitors' questions about Unicorp Travel's services and help them get in touch with the team. Answer efficiently and, where useful, include the relevant page link from the Knowledge section. If a question is not clear, ask a short follow-up question.

# Style: Friendly and professional, in short, plain Indian English. Keep replies brief: a few sentences, or short bullet points for lists. Use bold only for key words. No headers. Use emojis sparingly, at most one per message.

# Other Rules: Answer only from the Knowledge section below. If the answer is not there, do not guess. Never quote prices, fares, visa rules, availability or processing times, and never promise or confirm a booking. Do not ask visitors for their name, phone number, email or other personal details, because this chat cannot pass them to the team. For those questions, or anything the Knowledge section does not cover, say the Unicorp Travel team will help, and point the visitor to the enquiry form on the website, WhatsApp or a phone call, using the links and numbers in the Knowledge section. Never claim to be a person. If a user asks about anything unrelated to travel with Unicorp Travel, do not answer it; kindly redirect them to something you can help with.

# Knowledge:
(paste the contents of chatbot-knowledge.txt here)
```

## 4. No lead capture

The chat does not collect or forward visitor details. The greeting tells visitors not to share personal or payment details and to use WhatsApp, a call or the enquiry form.

## 5. What the knowledge file contains

`/chatbot-knowledge.txt` is a compact text (aimed at 8,000 characters or fewer, so it pastes into the instructions) built from `src/config/site.ts` (only facts the site may show) and the content collections. It holds the address, phone numbers, email, WhatsApp link, enquiry form pages, contact desks, one line with a page link for each service, and holiday packages and FAQs only while they fit. Office hours are added only once the client confirms them in `site.ts` (they are not shown on the site yet, so the file has none). Entries marked `demo: true` are left out. Links are absolute, from `SITE_URL`, else Vercel's production domain variable; local builds give plain paths. Package prices are left out on purpose so the bot cannot quote them. The file carries the same `noindex` header as the rest of the demo.

## 6. Privacy

The privacy page gets a "Chat on this website" paragraph while `chatbot.url` is set: the link opens a page run by Zapier, messages typed there are processed by Zapier and its AI providers to answer the question, and visitors are told not to share personal or payment details. The client should review its wording, and confirm with Zapier's terms who processes chat data, before launch.
