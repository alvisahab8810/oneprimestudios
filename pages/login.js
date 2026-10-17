import React from "react";
import AuthForm from "@/components/auth/AuthForm";

// The form itself lives in components/auth/AuthForm so the welcome popup can
// reuse exactly the same fields and styling
const LoginPage = () => <AuthForm />;

export default LoginPage;
