import axios from "axios";
import trimEnd from "lodash/trimEnd";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useSearchParams } from "react-router-dom";
import {
  ErrorType,
  HistoryCodec,
  HistoryType,
  SessionCodec,
  SessionsCodec,
  SessionsType,
  SessionType
} from "./types";

export const trimedPath = trimEnd(window.basePath, "/");

const getSessions = async () => {
  const { data } = await axios.get(`${trimedPath}/sessions/summary`);
  return SessionsCodec.parse(data);
};

export const useSessions = () => {
  const [refetchInterval] = React.useState(10000);
  return useQuery<SessionsType, ErrorType>(["sessions"], getSessions, {
    refetchInterval
  });
};

const addSession = async () => {
  const { data } = await axios.post(`${trimedPath}/sessions`);
  return SessionCodec.parse(data);
};

export const useAddSession = () => {
  const queryClient = useQueryClient();
  return useMutation<SessionType, ErrorType>(addSession, {
    onSuccess: () => {
      queryClient.invalidateQueries(["sessions"]);
    }
  });
};

const uploadSessions = async (sessions: SessionsType) => {
  const { data } = await axios.post(`${trimedPath}/sessions/import`, sessions);
  return SessionsCodec.parse(data);
};

export const useUploadSessions = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  return useMutation<SessionsType, ErrorType, SessionsType>(uploadSessions, {
    onSuccess: () => {
      queryClient.invalidateQueries(["sessions"]);
      searchParams.delete("session");
      setSearchParams(searchParams);
    }
  });
};

const resetSessions = async () => {
  await axios.post(`${trimedPath}/reset`);
  return;
};

export const useResetSessions = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  return useMutation<void, ErrorType>(resetSessions, {
    onSuccess: () => {
      queryClient.invalidateQueries(["sessions"]);
      searchParams.delete("session");
      setSearchParams(searchParams);
    }
  });
};

const updateSession = async (session: SessionType) => {
  const { data } = await axios.put(`${trimedPath}/sessions`, session);
  return SessionCodec.parse(data);
};

export const useUpdateSession = () => {
  const queryClient = useQueryClient();
  return useMutation<SessionType, ErrorType, SessionType>(updateSession, {
    onSuccess: () => {
      queryClient.invalidateQueries(["sessions"]);
    }
  });
};

const getHistory = async (sessionID: string) => {
  const { data } = await axios.get(
    `${trimedPath}/history?session=${sessionID}`
  );
  return HistoryCodec.parse(data);
};

export const useHistory = (sessionID: string) => {
  const [refetchInterval] = React.useState(10000);
  return useQuery<HistoryType, ErrorType>(
    ["history", sessionID],
    () => getHistory(sessionID),
    {
      refetchInterval
    }
  );
};
