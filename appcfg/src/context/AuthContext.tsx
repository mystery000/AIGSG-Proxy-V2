import { createContext, ReactNode, useContext } from "react";
import { useLocalStorage } from "usehooks-ts";

export type UserInfo = {
  accessToken: string;
  setAccessToken: (token: string) => void;
};

const initialContextState: UserInfo = {
  accessToken: "",
  setAccessToken: (token: string) => {},
};

const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useLocalStorage("access_token", "");
  return (
    <AuthContext.Provider
      value={{
        accessToken: token,
        setAccessToken: setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(`useAuthContext must be used within a AuthContextProvider`);
  }
  return context;
};

export const AuthContext = createContext<UserInfo>(initialContextState);

AuthContext.displayName = "AuthContext";

export const ManagedAppContext = ({ children }: { children: ReactNode }) => (
  <AuthContextProvider>{children}</AuthContextProvider>
);
