import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trimedPath } from "./utils";
import {
  GraphHistory,
  GraphHistorySchema,
  History,
  HistorySchema,
  Mocks,
  MocksSchema,
  Session,
  Sessions,
  SessionSchema,
  SessionsSchema,
} from "./types";

const ContentTypeJSON = "application/json";
const ContentTypeYAML = "application/x-yaml";

const networkErrorMessage =
  "Failed to connect to the server, please make sure it's still running";

interface RequestOptions {
  method: string;
  body?: string;
  contentType?: string;
}

const request = async (
  path: string,
  { method, body, contentType }: RequestOptions,
): Promise<unknown> => {
  let response: Response;
  try {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    response = await fetch(`${trimedPath}${path}`, {
      method,
      headers,
      body,
    });
  } catch {
    throw new Error(networkErrorMessage);
  }

  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const message =
      (payload as { message?: string } | undefined)?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
};

const sessionQuery = (sessionID?: string) =>
  sessionID ? `?session=${sessionID}` : "";

// -----------------------------------------------------------------------------
// Fetch functions (one per endpoint)
// -----------------------------------------------------------------------------

export const getSessionsSummary = async (): Promise<Sessions> => {
  const data = await request("/sessions/summary", { method: "GET" });
  return SessionsSchema.parse(data);
};

export const postNewSession = async (): Promise<Session> => {
  const data = await request("/sessions", { method: "POST" });
  return SessionSchema.parse(data);
};

export const putUpdateSession = async (session: Session): Promise<Session> => {
  const data = await request("/sessions", {
    method: "PUT",
    body: JSON.stringify(session),
    contentType: ContentTypeJSON,
  });
  return SessionSchema.parse(data);
};

export const deleteSession = async (id: string): Promise<void> => {
  await request(`/sessions/${id}`, { method: "DELETE" });
};

export const postUploadSessions = async (
  sessions: Sessions,
): Promise<Sessions> => {
  const data = await request("/sessions/import", {
    method: "POST",
    body: JSON.stringify(sessions),
    contentType: ContentTypeJSON,
  });
  return SessionsSchema.parse(data);
};

export const getHistory = async (sessionID?: string): Promise<History> => {
  const data = await request(`/history${sessionQuery(sessionID)}`, {
    method: "GET",
  });
  return HistorySchema.parse(data);
};

export const getHistorySummary = async (
  sessionID: string,
  src: string,
  dest: string,
): Promise<GraphHistory> => {
  const data = await request(
    `/history/summary?session=${sessionID}&src=${src}&dest=${dest}`,
    { method: "GET" },
  );
  return GraphHistorySchema.parse(data);
};

export const getMocks = async (sessionID?: string): Promise<Mocks> => {
  const data = await request(`/mocks${sessionQuery(sessionID)}`, {
    method: "GET",
  });
  return MocksSchema.parse(data);
};

export const postAddMocks = async (mocks: string): Promise<void> => {
  await request("/mocks", {
    method: "POST",
    body: mocks,
    contentType: ContentTypeYAML,
  });
};

export const postLockMocks = async (ids: string[]): Promise<Mocks> => {
  const data = await request("/mocks/lock", {
    method: "POST",
    body: JSON.stringify(ids),
    contentType: ContentTypeJSON,
  });
  return MocksSchema.parse(data);
};

export const postUnlockMocks = async (ids: string[]): Promise<Mocks> => {
  const data = await request("/mocks/unlock", {
    method: "POST",
    body: JSON.stringify(ids),
    contentType: ContentTypeJSON,
  });
  return MocksSchema.parse(data);
};

export const putUpdateMock = async (args: {
  sessionID?: string;
  id: string;
  mock: string;
}): Promise<void> => {
  await request(`/mocks/${args.id}${sessionQuery(args.sessionID)}`, {
    method: "PUT",
    body: args.mock,
    contentType: ContentTypeYAML,
  });
};

export const deleteMock = async (args: {
  sessionID?: string;
  id: string;
}): Promise<void> => {
  await request(`/mocks/${args.id}${sessionQuery(args.sessionID)}`, {
    method: "DELETE",
  });
};

export const deleteHistory = async (args: {
  sessionID?: string;
}): Promise<void> => {
  await request(`/history${sessionQuery(args.sessionID)}`, {
    method: "DELETE",
  });
};

export const postReset = async (): Promise<void> => {
  await request("/reset", { method: "POST" });
};

// -----------------------------------------------------------------------------
// Query keys
// -----------------------------------------------------------------------------

export const queryKeys = {
  sessions: ["sessions"] as const,
  history: (sessionID: string) => ["history", sessionID] as const,
  historySummary: (sessionID: string, src: string, dest: string) =>
    ["history-summary", sessionID, src, dest] as const,
  mocks: (sessionID: string) => ["mocks", sessionID] as const,
};

// -----------------------------------------------------------------------------
// Query hooks
// -----------------------------------------------------------------------------

export const useSessionsSummary = (options?: {
  refetchInterval?: number | false;
}) =>
  useQuery({
    queryKey: queryKeys.sessions,
    queryFn: getSessionsSummary,
    refetchInterval: options?.refetchInterval ?? false,
  });

export const useHistory = (
  sessionID: string,
  options?: { refetchInterval?: number | false },
) =>
  useQuery({
    queryKey: queryKeys.history(sessionID),
    queryFn: () => getHistory(sessionID),
    refetchInterval: options?.refetchInterval ?? false,
  });

export const useHistorySummary = (
  sessionID: string,
  src: string,
  dest: string,
) =>
  useQuery({
    queryKey: queryKeys.historySummary(sessionID, src, dest),
    queryFn: () => getHistorySummary(sessionID, src, dest),
  });

export const useMocks = (
  sessionID: string,
  options?: { refetchInterval?: number | false },
) =>
  useQuery({
    queryKey: queryKeys.mocks(sessionID),
    queryFn: () => getMocks(sessionID),
    refetchInterval: options?.refetchInterval ?? false,
  });

// -----------------------------------------------------------------------------
// Mutation hooks (invalidation reproduces the old epics' refetch chains)
// -----------------------------------------------------------------------------

const invalidateAll = (
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<unknown> =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ["sessions"] }),
    queryClient.invalidateQueries({ queryKey: ["history"] }),
    queryClient.invalidateQueries({ queryKey: ["mocks"] }),
  ]);

export const useNewSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postNewSession,
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useUpdateSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putUpdateSession,
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useDeleteSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSession,
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useUploadSessions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postUploadSessions,
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useAddMocks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postAddMocks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mocks"] }),
  });
};

export const useUpdateMock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putUpdateMock,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mocks"] }),
  });
};

export const useDeleteMock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMock,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mocks"] }),
  });
};

export const useDeleteHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteHistory,
    onSuccess: () => {
      // Clearing the history also resets mock call counters and re-enables edition.
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["mocks"] });
    },
  });
};

export const useLockMocks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postLockMocks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mocks"] }),
  });
};

export const useUnlockMocks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postUnlockMocks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mocks"] }),
  });
};

export const useReset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postReset,
    onSuccess: () => invalidateAll(queryClient),
  });
};
