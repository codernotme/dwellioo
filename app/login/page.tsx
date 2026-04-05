"use client";

import { useState } from "react";
import { Button, Card } from "@heroui/react";
import { login, signup } from "./actions";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (formData: FormData) => {
    setErrorMsg("");
    const action = isLogin ? login : signup;
    const result = await action(formData);
    if (result?.error) {
      setErrorMsg(result.error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 flex-col gap-6">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold text-foreground">Dwellioo</h1>
        <p className="text-foreground/60 text-sm mt-2">
          Property Management System
        </p>
      </div>

      <Card className="w-full max-w-sm p-6 shadow-xl">
        <Card.Header className="pb-4">
          <Card.Title className="text-xl font-semibold">
             {isLogin ? "Welcome Back" : "Create Account"}
          </Card.Title>
          <Card.Description>
            {isLogin
              ? "Enter your credentials to access your dashboard"
              : "Sign up to start managing your properties"}
          </Card.Description>
        </Card.Header>
        <div className="p-6">
          <form action={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="email">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Mail size={18} className="text-foreground/40" />
                </div>
                <input
                  required
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-2 border border-default-200 rounded-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-sm"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Lock size={18} className="text-foreground/40" />
                </div>
                <input
                  required
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-2 border border-default-200 rounded-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-sm"
                />
              </div>
            </div>
            
            {errorMsg && (
              <p className="text-danger text-sm">{errorMsg}</p>
            )}

            <Button variant="primary" type="submit" className="w-full mt-2 font-medium">
              {isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
        </div>

        <Card.Footer className="flex justify-center pt-6 pb-2">
          <p className="text-sm text-foreground/60">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Button 
               variant="ghost" 
               size="sm"
               className="p-0 h-auto font-semibold"
               onPress={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign up" : "Sign in"}
            </Button>
          </p>
        </Card.Footer>
      </Card>
    </div>
  );
}
