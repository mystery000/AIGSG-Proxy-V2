import { Outlet, Navigate } from "react-router-dom";

import { useAuthContext } from "../context/AuthContext";

const PrivateRoutes = () => {
  const authContext = useAuthContext();
  return authContext.accessToken ? <Outlet /> : <Navigate to='/login' />;
};

export default PrivateRoutes;
