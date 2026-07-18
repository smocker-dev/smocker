import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import { load } from "js-yaml";
import mockSchema from "../../docs/mock.schema.json";
import {
  MockEditorForm,
  mockToEditorForm,
} from "../components/MockEditor/convert";

// docs/mock.schema.json is the canonical mock format (also enforced on the Go side). We validate
// raw YAML against it before letting the user switch to the Visual Editor.
const schema = mockSchema as { $id: string };
const ajv = new Ajv2020({ strict: false, allErrors: true });
ajv.addSchema(mockSchema);
// Validate a single mock against #/$defs/mock directly (rather than the root, which is a
// oneOf[mock, array] and only reports an opaque "must match exactly one schema in oneOf").
const validateMock = ajv.getSchema(`${schema.$id}#/$defs/mock`);

export type VisualParse =
  { ok: true; form: MockEditorForm } | { ok: false; error: string };

// Turns ajv errors into the most actionable message: the deepest field-level error (e.g.
// "/response/body must be string"), skipping the noisy top-level oneOf/anyOf combinators.
const describeErrors = (errors: ErrorObject[] | null | undefined): string => {
  if (!errors || errors.length === 0) {
    return "does not match the mock schema";
  }
  const specific = errors.filter(
    (e) => e.instancePath && e.keyword !== "oneOf" && e.keyword !== "anyOf",
  );
  const pool = specific.length > 0 ? specific : errors;
  const best = pool.reduce((a, b) =>
    b.instancePath.length > a.instancePath.length ? b : a,
  );
  const where = best.instancePath
    ? best.instancePath.replace(/^\//, "").replace(/\//g, ".")
    : "mock";
  return `${where} ${best.message}`;
};

// Parses a single valid mock from raw YAML and returns the editor form to hydrate the Visual
// Editor with. Otherwise returns a human-readable reason it can't switch.
export const parseYamlForVisualEditor = (yaml: string): VisualParse => {
  if (!yaml.trim()) {
    return { ok: false, error: "The editor is empty." };
  }
  let doc: unknown;
  try {
    doc = load(yaml);
  } catch (e) {
    return { ok: false, error: `Invalid YAML: ${(e as Error).message}` };
  }
  const mocks = Array.isArray(doc) ? doc : [doc];
  if (mocks.length !== 1) {
    return {
      ok: false,
      error: `The visual editor edits a single mock, but ${mocks.length} were found. Keep one, or use the raw editor.`,
    };
  }
  if (!validateMock || !validateMock(mocks[0])) {
    return {
      ok: false,
      error: describeErrors(validateMock?.errors),
    };
  }
  return { ok: true, form: mockToEditorForm(mocks[0]) };
};

export type SaveCheck = { ok: true } | { ok: false; error: string };

// Validates the raw YAML about to be saved: one or several mocks, each valid against the schema.
// Runs before POSTing so obvious mistakes are caught without leaving/closing the editor.
export const validateMocksForSave = (yaml: string): SaveCheck => {
  if (!yaml.trim()) {
    return { ok: false, error: "The editor is empty." };
  }
  let doc: unknown;
  try {
    doc = load(yaml);
  } catch (e) {
    return { ok: false, error: `Invalid YAML: ${(e as Error).message}` };
  }
  const mocks = Array.isArray(doc) ? doc : [doc];
  if (mocks.length === 0) {
    return { ok: false, error: "There is no mock to save." };
  }
  for (let i = 0; i < mocks.length; i++) {
    if (!validateMock || !validateMock(mocks[i])) {
      const prefix = mocks.length > 1 ? `mock #${i + 1}: ` : "";
      return {
        ok: false,
        error: prefix + describeErrors(validateMock?.errors),
      };
    }
  }
  return { ok: true };
};
