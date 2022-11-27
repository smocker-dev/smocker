import { CreateToastFnReturn, useToast } from "@chakra-ui/react";
import axios from "axios";
import trimEnd from "lodash/trimEnd";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useSearchParams } from "react-router-dom";
import { SessionCodec, SessionsCodec, SessionsType } from "./types";

export const trimedPath = trimEnd(window.basePath, "/");

const errorToast = () => {
  return useToast({
    status: "error",
    duration: 9000,
    isClosable: true,
    position: "top-right",
    variant: "subtle"
  });
};

const processError = (
  toaster: CreateToastFnReturn,
  err: any,
  id: string,
  message: string
) => {
  console.log(err);
  if (!toaster.isActive(id)) {
    toaster({
      id,
      title: message,
      description: err.issues ? "Invalid response format" : err.message
    });
  }
};

const getSessions = async () => {
  const { data } = await axios.get(`${trimedPath}/sessions/summary`);
  return SessionsCodec.parse(data);
};

export const useSessions = () => {
  const [refetchInterval] = React.useState(10000);
  const toast = errorToast();
  return useQuery(["sessions"], getSessions, {
    refetchInterval,
    onError: e => {
      processError(toast, e, "get-sessions", "Unable to retrieve sessions");
    }
  });
};

const addSession = async () => {
  const { data } = await axios.post(`${trimedPath}/sessions`);
  return SessionCodec.parse(data);
};

export const useAddSession = () => {
  const queryClient = useQueryClient();
  const toast = errorToast();
  return useMutation(addSession, {
    onSuccess: () => {
      queryClient.invalidateQueries(["sessions"]);
    },
    onError: e => {
      processError(toast, e, "add-session", "Unable to create session");
    }
  });
};

const uploadSessions = async (sessions: SessionsType) => {
  const { data } = await axios.post(`${trimedPath}/sessions/import`, sessions);
  return SessionsCodec.parse(data);
};

export const useUploadSessions = () => {
  const queryClient = useQueryClient();
  const toast = errorToast();
  const [searchParams, setSearchParams] = useSearchParams();
  return useMutation(uploadSessions, {
    onSuccess: () => {
      queryClient.invalidateQueries(["sessions"]);
      searchParams.delete("session");
      setSearchParams(searchParams);
    },
    onError: e => {
      processError(toast, e, "upload-sessions", "Unable to import sessions");
    }
  });
};

const resetSessions = async () => {
  await axios.post(`${trimedPath}/reset`);
  return;
};

export const useResetSessions = () => {
  const queryClient = useQueryClient();
  const toast = errorToast();
  const [searchParams, setSearchParams] = useSearchParams();
  return useMutation(resetSessions, {
    onSuccess: () => {
      queryClient.invalidateQueries(["sessions"]);
      searchParams.delete("session");
      setSearchParams(searchParams);
    },
    onError: e => {
      processError(toast, e, "reset-sessions", "Unable to reset sessions");
    }
  });
};
