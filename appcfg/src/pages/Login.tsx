import { useState } from "react";
import { useNavigate } from "react-router-dom";

import * as Yup from "yup";
import { useFormik } from "formik";
import authService from "../services/authentication";
import { useAuthContext } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("");
  const { setAccessToken } = useAuthContext();
  const [error, setError] = useState("");

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: Yup.object().shape({
      email: Yup.string().email("Invalid email").required("Email is required"),
      password: Yup.string()
        .required("Password is required")
        .min(8, "At least 8 characters required"),
    }),

    onSubmit: async () => {
      try {
        setError("");
        const user = await authService.login({
          email: formik.values.email,
          password: formik.values.password,
        });
        setAccessToken(user.access_token);
        navigate("/");
      } catch (error) {
        setMsg("");
        //@ts-ignore
        setError(error.response.data.detail);
      }
    },
  });

  return (
    <div className='bg-gray-100 flex justify-center items-center h-screen'>
      <div className='w-1/2 h-screen hidden lg:block'>
        <img
          src='https://placehold.co/800x/667fff/ffffff.png?text=AIGSG+PROXY&font=Montserrat'
          alt='Placeholder Image'
          className='object-cover w-full h-full'
        />
      </div>
      <div className='lg:p-36 md:p-52 sm:20 p-8 w-full lg:w-1/2'>
        <h1 className='text-2xl font-semibold mb-4'>LOGIN</h1>
        <form onSubmit={formik.handleSubmit}>
          <div className='mb-4'>
            <label htmlFor='email' className='block text-gray-600'>
              Email
            </label>
            <input
              type='text'
              id='email'
              name='email'
              className='w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500'
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.email}
              required
            />
          </div>
          <div className='mb-4'>
            <label htmlFor='password' className='block text-gray-600'>
              Password
            </label>
            <input
              type='password'
              id='password'
              name='password'
              className='w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500'
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.password}
              required
            />
          </div>

          {error ? (
            <div className='mb-4 text-sm text-red-600 dark:text-red-500'>
              {error}
            </div>
          ) : null}

          {msg ? (
            <div className='mb-4 text-sm text-green-600 dark:text-green-500'>
              {msg}
            </div>
          ) : null}

          <button
            type='submit'
            className='bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md py-2 px-4 w-full'
            disabled={formik.isSubmitting}
          >
            {formik.isSubmitting ? (
              <div aria-label='Loading...' role='status' className='w-full'>
                <svg
                  className='animate-spin w-6 h-6 fill-white mx-auto'
                  viewBox='3 3 18 18'
                >
                  <path
                    className='opacity-20'
                    d='M12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5ZM3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z'
                  ></path>
                  <path d='M16.9497 7.05015C14.2161 4.31648 9.78392 4.31648 7.05025 7.05015C6.65973 7.44067 6.02656 7.44067 5.63604 7.05015C5.24551 6.65962 5.24551 6.02646 5.63604 5.63593C9.15076 2.12121 14.8492 2.12121 18.364 5.63593C18.7545 6.02646 18.7545 6.65962 18.364 7.05015C17.9734 7.44067 17.3403 7.44067 16.9497 7.05015Z'></path>
                </svg>
              </div>
            ) : (
              "Login"
            )}
          </button>
        </form>
        <div className='mt-6 text-blue-500 text-center'>
          <a className='hover:underline' onClick={() => navigate("/register")}>
            Sign up Here
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
