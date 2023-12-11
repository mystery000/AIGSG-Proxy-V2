import axios from "axios";

const BASE_DOMAIN = window.location.host;
const BASE_URL = `http://${BASE_DOMAIN}/api`;

type RegisterForm = {
  username: string;
  email: string;
  password: string;
};

interface AuthResponse {
  access_token: string;
  token_type: string;
}

const register = async (form: RegisterForm) => {
  try {
    const response = await axios.post(`${BASE_URL}/register`, form);
    return response.data as { detail: string };
  } catch (error) {
    throw error;
  }
};

const login = async (form: Partial<RegisterForm>) => {
  try {
    const response = await axios.post(`${BASE_URL}/login`, form);
    return response.data as AuthResponse;
  } catch (error) {
    throw error;
  }
};

export default {
  register,
  login,
};
