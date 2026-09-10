// Round-trips a representative ProseMirror JSON fixture through
// prosemirrorJSONToYDoc -> yDocToProsemirrorJSON (the same conversion
// onLoadDocument/onStoreDocument perform against real Rails content) and
// asserts the document survives intact. Pure Node, no browser or live Rails
// server needed.
//
// Compared via ProseMirror Node#eq, not raw JSON deep-equality: the
// round-trip normalizes mark/attr defaults on the way out (e.g. a markType
// with no attrs gets an explicit `attrs: {}`, and a node attr equal to its
// schema default is omitted rather than written out) — semantically
// identical documents, since the frontend's own `editor.commands.setContent`
// parses JSON through this same schema and hits the same normalization on
// every load regardless of collaboration, but not byte-identical JSON.
import { describe, expect, it } from "vitest";
import { prosemirrorJSONToYDoc, yDocToProsemirrorJSON } from "y-prosemirror";
import { schema } from "../src/schema.js";

const FRAGMENT = "default";

function roundTrip(json: Record<string, unknown>) {
  const ydoc = prosemirrorJSONToYDoc(schema, json, FRAGMENT);
  return yDocToProsemirrorJSON(ydoc, FRAGMENT);
}

function assertSameDocument(json: Record<string, unknown>) {
  const before = schema.nodeFromJSON(json);
  const after = schema.nodeFromJSON(roundTrip(json));
  expect(after.eq(before)).toBe(true);
}

const FIXTURE = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Launch checklist" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Ship the " },
        { type: "text", marks: [{ type: "bold" }], text: "collab server" },
        { type: "text", text: " before Friday." },
      ],
    },
    {
      type: "workspaceTaskList",
      content: [
        {
          type: "workspaceTaskItem",
          attrs: { taskId: 42 },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Write the schema mirror" }] }],
        },
        {
          type: "workspaceTaskItem",
          attrs: { taskId: null },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Wire up the frontend provider" }] }],
        },
      ],
    },
  ],
};

describe("JSON <-> Yjs round trip", () => {
  it("preserves a document with headings, marks, and custom task nodes", () => {
    assertSameDocument(FIXTURE);
  });

  it("round-trips the empty-document fallback shape", () => {
    assertSameDocument({
      type: "doc",
      content: [{ type: "heading", attrs: { level: 1 }, content: [] }, { type: "paragraph" }],
    });
  });
});
