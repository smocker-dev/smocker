import { expect, test } from "@playwright/test";

// Non-regression (TNR) suite locking the OBSERVABLE FEATURES of the Smocker web UI against a
// server seeded with tests/sessions (session "Session #1" id 3giPMr5IR, one mock GET /test ->
// {"message":"test"} id YnJEM95SR, one matching history entry). Passing this suite on the new UI
// means feature parity with the old one. Assertions target stable text / anchor hrefs / URLs /
// SVG — never framework DOM or ARIA roles (antd 4 exposed nav items as role=link, antd 6 as
// role=menuitem, but both render real <a href> anchors) — so they hold across the migration.
//
// Ordering: reads run before any session-creating test (a freshly-seeded server has exactly one
// session, shown by default); mutating tests come last, destructive "Reset" is very last. Serial.

const MOCK_ID = "YnJEM95SR";
const HISTORY = "/pages/history";
const MOCKS = "/pages/mocks";

const intro = {
  history:
    "This is the history of the requests made during the selected session.",
  mocks: "This is the list of declared mocks ordered by priority.",
  visualize: "This is a graphical representation of call history.",
};

test.describe.configure({ mode: "serial" });

// --- Shell & routing -------------------------------------------------------------------------

test("app shell: navbar, sidebar, seeded session, no page errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page).toHaveTitle(/Smocker/);
  await expect(page.getByText("Documentation")).toBeVisible();
  await expect(page.getByText("Session #1")).toBeVisible();
  await expect(page.getByText("New Session")).toBeVisible();
  await expect(page.getByText("Reset Sessions")).toBeVisible();

  expect(errors, `page errors: ${errors.join(" | ")}`).toEqual([]);
});

test("root redirects to history with a session selected", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/pages\/history/);
  await expect(page).toHaveURL(/session=/);
  // The history page must actually render — guard against the redirect settling back to a blank
  // root (the session-param sync used to clobber the redirect before it committed).
  await expect(page.getByText(intro.history)).toBeVisible();
});

// --- Links -----------------------------------------------------------------------------------

test("navbar & footer links point to the right targets", async ({ page }) => {
  await page.goto(HISTORY);
  // Navbar nav anchors (nav href carries a ?session= query).
  await expect(
    page.locator('a[href^="/pages/history?"]').first(),
  ).toBeVisible();
  await expect(page.locator('a[href^="/pages/mocks?"]').first()).toBeVisible();
  // External links open in a new tab.
  await expect(
    page.locator('a[href="https://smocker.dev/"]').first(),
  ).toHaveAttribute("target", "_blank");
  await expect(
    page.locator('a[href="https://github.com/smocker-dev/smocker"]').first(),
  ).toHaveAttribute("target", "_blank");
  await expect(
    page.locator('a[href="https://smocker.dev"]').first(),
  ).toBeVisible();
});

test("history entry: 'Matched Mock' link and 'Create a new mock from entry' button", async ({
  page,
}) => {
  await page.goto(HISTORY);
  await expect(
    page.locator(`a[href="/pages/mocks/${MOCK_ID}"]`).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Create a new mock from entry/ }).first(),
  ).toBeVisible();
});

// --- Page content (features) -----------------------------------------------------------------

test("history page shows the seeded call", async ({ page }) => {
  await page.goto(HISTORY);
  await expect(page.getByText(intro.history)).toBeVisible();
  await expect(page.getByText("/test", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Matched Mock").first()).toBeVisible();
  await expect(page.getByText("Copy as curl").first()).toBeVisible();
  await expect(page.getByText("Autorefresh").first()).toBeVisible();
});

test("mocks page shows the seeded mock", async ({ page }) => {
  await page.goto(MOCKS);
  await expect(page.getByText(intro.mocks)).toBeVisible();
  await expect(page.getByText(new RegExp(MOCK_ID)).first()).toBeVisible();
  await expect(page.getByText("Add Mocks").first()).toBeVisible();
  // The seeded session has a call in its history, so the mock is not editable/deletable.
  await expect(page.getByTitle("Edit this mock")).toHaveCount(0);
  await expect(page.getByTitle("Delete this mock")).toHaveCount(0);
});

test("visualize page renders the sequence diagram", async ({ page }) => {
  await page.goto("/pages/visualize");
  await expect(page.getByText(intro.visualize)).toBeVisible();
  await expect(page.getByText("Diagram of calls")).toBeVisible();
  await expect(page.locator("svg").first()).toBeVisible();
});

// --- Navigation & interactions ---------------------------------------------------------------

test("navbar navigates between History and Mocks", async ({ page }) => {
  await page.goto(HISTORY);

  await page.locator('a[href^="/pages/mocks?"]').first().click();
  await expect(page).toHaveURL(/\/pages\/mocks/);
  await expect(page.getByText(intro.mocks)).toBeVisible();

  await page.locator('a[href^="/pages/history?"]').first().click();
  await expect(page).toHaveURL(/\/pages\/history/);
  await expect(page.getByText(intro.history)).toBeVisible();
});

test("history page 'Visualize' link opens the diagram", async ({ page }) => {
  await page.goto(HISTORY);
  await page.locator('a[href^="/pages/visualize"]').first().click();
  await expect(page).toHaveURL(/\/pages\/visualize/);
  await expect(page.getByText(intro.visualize)).toBeVisible();
});

test("'Matched Mock' link opens the mock detail route", async ({ page }) => {
  await page.goto(HISTORY);
  await page.locator(`a[href="/pages/mocks/${MOCK_ID}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/pages/mocks/${MOCK_ID}`));
  await expect(page.getByText(new RegExp(MOCK_ID)).first()).toBeVisible();
});

test("mock detail: clicking a mock filters to it and browser back returns to the list", async ({
  page,
}) => {
  await page.goto(MOCKS);
  await expect(page.getByText(intro.mocks)).toBeVisible();
  // Click the mock's ID link in the list (the href carries ?session, so match by prefix).
  await page.locator(`a[href^="/pages/mocks/${MOCK_ID}"]`).first().click();
  await expect(page).toHaveURL(new RegExp(`/pages/mocks/${MOCK_ID}`));
  await expect(
    page.getByText(/This is the definition of the mock with ID/),
  ).toBeVisible();
  // Browser back must return to the full list, not stay trapped on the single-mock route.
  await page.goBack();
  await expect(page).toHaveURL(/\/pages\/mocks(\?|$)/);
  await expect(page.getByText(intro.mocks)).toBeVisible();
});

test("'Add Mocks' opens the editor with Save/Cancel and closes on Cancel", async ({
  page,
}) => {
  await page.goto(MOCKS);
  await page.getByRole("button", { name: "Add Mocks" }).click();
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  const cancel = page.getByRole("button", { name: "Cancel" });
  await expect(cancel).toBeVisible();
  await cancel.click();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
});

test("'Create a new mock from entry' opens the prefilled editor in place", async ({
  page,
}) => {
  await page.goto(HISTORY);
  await expect(page).toHaveURL(/session=/);
  await expect(page.getByText(intro.history)).toBeVisible();
  await page
    .getByRole("button", { name: /Create a new mock from entry/ })
    .first()
    .click();
  // The drawer opens on the History page itself — no navigation to the Mocks page.
  await expect(page).toHaveURL(/\/pages\/history/);
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
});

// --- Mock creation (mutations) ---------------------------------------------------------------

// Whether we run against the legacy (Parcel/antd4/CodeMirror5) build. Set by the TNR gate.
const LEGACY = process.env.SMOCKER_E2E_VARIANT === "old";

test("create a mock via the Visual Editor form", async ({ page }) => {
  await page.goto(MOCKS);
  await page.getByRole("button", { name: "Add Mocks" }).click();
  // The Visual Editor is the default tab; set a request path (method defaults to GET) and save.
  await page.locator("#request_path").fill("/tnr-form");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0); // drawer closed
  await expect(page.getByText("/tnr-form").first()).toBeVisible(); // mock now listed
});

test("create a mock via the Raw YAML editor", async ({ page }) => {
  // The raw editor is a CodeMirror instance; driving it differs between CM5 (legacy) and CM6.
  test.skip(
    LEGACY,
    "raw-editor driving is CodeMirror-version specific; covered on the new UI",
  );
  await page.goto(MOCKS);
  await page.getByRole("button", { name: "Add Mocks" }).click();
  await page.getByRole("tab", { name: /Raw YAML/i }).click();
  const editor = page
    .locator('.cm-content[contenteditable="true"]:visible')
    .first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  // Single-line flow YAML avoids CodeMirror auto-indentation corrupting block YAML.
  await editor.pressSequentially(
    "[{request: {method: GET, path: /tnr-yaml}, response: {status: 200, body: hi}}]",
  );
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  await expect(page.getByText("/tnr-yaml").first()).toBeVisible();
});

test("lock and unlock a mock", async ({ page }) => {
  await page.goto(MOCKS);
  await page.getByText("Session #1", { exact: true }).click();
  const lockToggle = () =>
    page
      .locator("button:has(.anticon-lock), button:has(.anticon-unlock)")
      .first();
  await expect(lockToggle()).toBeVisible();
  const isLockEndpoint = (r: {
    url(): string;
    request(): { method(): string };
  }) =>
    /\/mocks\/(un)?lock$/.test(new URL(r.url()).pathname) &&
    r.request().method() === "POST";

  const first = page.waitForResponse(isLockEndpoint);
  await lockToggle().click();
  expect((await first).status()).toBe(200);

  const second = page.waitForResponse(isLockEndpoint);
  await lockToggle().click();
  expect((await second).status()).toBe(200);
});

test("autorefresh can be toggled on the history page", async ({ page }) => {
  await page.goto(HISTORY);
  await expect(page).toHaveURL(/session=/);
  await page.getByRole("button", { name: "Autorefresh" }).click();
  // Enabling autorefresh switches the control to its "pause" state.
  await expect(page.locator(".anticon-pause-circle").first()).toBeVisible();
});

// --- Session lifecycle (last; Reset then rename are destructive / name-changing) -------------

test("'New Session' creates and selects a new session", async ({ page }) => {
  await page.goto(HISTORY);
  const before = await page.getByText(/Session #\d+/).count();
  await page.getByRole("button", { name: "New Session" }).click();
  await expect(page.getByText(/Session #\d+/)).toHaveCount(before + 1);
});

test("selecting 'Session #1' in the sidebar shows its seeded mock", async ({
  page,
}) => {
  await page.goto(MOCKS);
  await page.getByText("Session #1", { exact: true }).click();
  await expect(page).toHaveURL(/session=/);
  await expect(page.getByText(new RegExp(MOCK_ID)).first()).toBeVisible();
});

test("'Reset Sessions' clears mocks and history", async ({ page }) => {
  await page.goto(MOCKS);
  await page.getByText("Session #1", { exact: true }).click();
  await expect(page.getByText(new RegExp(MOCK_ID)).first()).toBeVisible();
  await page.getByRole("button", { name: "Reset Sessions" }).click();
  await expect(page.getByText("No mocks found.")).toBeVisible();
  await expect(page.getByText(new RegExp(MOCK_ID))).toHaveCount(0);
});

test("edit and delete a mock when the session has no calls", async ({
  page,
}) => {
  await page.goto(MOCKS);
  // Start from an empty history so the mock is editable (independent of the other tests' order).
  await page.getByText("Session #1", { exact: true }).click();
  await page.getByRole("button", { name: "Reset Sessions" }).click();
  await expect(page.getByText("No mocks found.")).toBeVisible();

  // Create a mock in the (empty-history) session.
  await page.getByRole("button", { name: "Add Mocks" }).click();
  await page.locator("#request_path").fill("/editable-mock");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  await expect(page.getByText("/editable-mock").first()).toBeVisible();

  // With an empty history the mock exposes Edit/Delete controls.
  await expect(page.getByTitle("Edit this mock").first()).toBeVisible();

  // Edit it: the drawer opens pre-filled; change the path via the raw editor and save.
  await page.getByTitle("Edit this mock").first().click();
  await expect(page.getByText("Edit mock")).toBeVisible();
  await page.getByRole("tab", { name: /Raw YAML/i }).click();
  const editor = page
    .locator('.ant-drawer .cm-content[contenteditable="true"]:visible')
    .first();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Delete");
  await editor.pressSequentially(
    "[{request: {path: /edited-mock}, response: {status: 200, body: hi}}]",
  );
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  await expect(page.getByText("/edited-mock").first()).toBeVisible();
  await expect(page.getByText("/editable-mock")).toHaveCount(0);

  // Delete it (Popconfirm), and the list empties.
  await page.getByTitle("Delete this mock").first().click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("/edited-mock")).toHaveCount(0);
});

// Runs last: renaming changes the "Session #1" label the other tests rely on. After Reset there
// is a fresh "Session #1" to rename.
test("rename a session", async ({ page }) => {
  await page.goto(HISTORY);
  await page.getByText("Session #1", { exact: true }).click();
  await page.locator(".anticon-edit").first().click();
  // The edit control reveals an input pre-filled with the current name and a Save button.
  const boxes = page.getByRole("textbox");
  let input = boxes.first();
  for (let i = 0; i < (await boxes.count()); i++) {
    if ((await boxes.nth(i).inputValue()) === "Session #1") {
      input = boxes.nth(i);
      break;
    }
  }
  await input.fill("Renamed by TNR");
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("Renamed by TNR")).toBeVisible();
});

// Last: importing selects the imported session, which would disturb session-selection in later
// tests, so this runs at the very end.
test("import a session from a file", async ({ page }) => {
  await page.goto(HISTORY);
  const payload = JSON.stringify([
    {
      id: "tnr-imported-id",
      name: "TNR Imported",
      date: "2020-02-12T00:04:29.5940297+01:00",
      history: [],
      mocks: [
        {
          request: { path: "/imported-tnr", method: "GET" },
          response: {
            status: 200,
            body: "hi",
            headers: { "Content-Type": ["application/json"] },
          },
          state: {
            id: "m-tnr",
            times_count: 0,
            locked: false,
            creation_date: "2020-02-12T00:04:29.5940297+01:00",
          },
        },
      ],
    },
  ]);
  // The sidebar "Load a session from a file" control is a hidden <input type=file> that reads
  // the file and POSTs it to /sessions/import.
  await page.locator('input[type="file"]').setInputFiles({
    name: "sessions.json",
    mimeType: "application/json",
    buffer: Buffer.from(payload),
  });
  await expect(page.getByText("TNR Imported")).toBeVisible();
});
