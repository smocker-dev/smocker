import * as React from "react";

interface SessionContextValue {
  selected: string;
  setSelected: (sessionID: string) => void;
}

const SessionContext = React.createContext<SessionContextValue>({
  selected: "",
  setSelected: () => undefined,
});

export const SessionProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => {
  const [selected, setSelected] = React.useState("");
  const value = React.useMemo(() => ({ selected, setSelected }), [selected]);
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export const useSession = (): SessionContextValue =>
  React.useContext(SessionContext);
