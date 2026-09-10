// No Yjs binary state is stored anywhere. Rails' `documents.content` JSON
// column stays the sole at-rest source of truth: on first connection to a
// document's room, seed the in-memory Y.Doc from Rails' JSON; on Hocuspocus's
// debounced onStoreDocument, convert back and PATCH it to Rails. Once every
// client disconnects, Hocuspocus drops the in-memory doc — the next session
// reloads fresh from Rails.
//
// IMPORTANT: Tiptap's Collaboration extension defaults to reading/writing
// the Y.XmlFragment named "default" (`field: 'default'` in
// @tiptap/extension-collaboration), NOT y-prosemirror's own default fragment
// name ("prosemirror") — the xmlFragment argument below must be passed
// explicitly on both the read and write side, or the frontend would find an
// empty fragment and Hocuspocus would never see the frontend's edits.
import * as Y from "yjs";
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from "y-prosemirror";
import type { onLoadDocumentPayload, onStoreDocumentPayload } from "@hocuspocus/server";
import { schema } from "./schema.js";
import type { AuthContext } from "./auth.js";

const RAILS_INTERNAL_URL = process.env.RAILS_INTERNAL_URL ?? "http://backend:3000";
const FRAGMENT = "default";

const EMPTY_DOC_JSON = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 } },
    { type: "paragraph" },
  ],
};

export async function onLoadDocument({ document, context }: onLoadDocumentPayload<AuthContext>) {
  const fragment = document.getXmlFragment(FRAGMENT);
  if (fragment.length > 0) return; // already seeded by an earlier connection this process

  const json = context.initialContent && Object.keys(context.initialContent).length
    ? context.initialContent
    : EMPTY_DOC_JSON;

  const seeded = prosemirrorJSONToYDoc(schema, json, FRAGMENT);
  Y.applyUpdate(document, Y.encodeStateAsUpdate(seeded));
}

export async function onStoreDocument({ document, documentName, lastContext }: onStoreDocumentPayload<AuthContext>) {
  const documentId = documentName.replace(/^document-/, "");
  const json = yDocToProsemirrorJSON(document, FRAGMENT);

  // lastContext is whichever currently-connected client's onAuthenticate ran
  // most recently for this document. Any authorized connection's token is
  // equally valid here: Rails' PATCH only checks workspace ownership, not
  // per-field authorship, and the Yjs-merged `content` is identical no
  // matter which authorized client's token stamps the outgoing request.
  const res = await fetch(`${RAILS_INTERNAL_URL}/api/v1/documents/${documentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${lastContext.token}` },
    body: JSON.stringify({ document: { content: json } }),
  });

  // Hocuspocus retries a failed onStoreDocument on its own debounce/unload
  // schedule, but only if the hook actually reports failure — swallowing a
  // non-2xx response here would silently drop edits.
  if (!res.ok) {
    throw new Error(`Failed to persist document ${documentId}: Rails returned ${res.status}`);
  }
}
