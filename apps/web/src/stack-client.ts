"use client";
import { StackClientApp } from "@stackframe/stack";

export const stackClientApp = new StackClientApp({
  tokenStore: "nextjs-cookie",
  urls: {
    home: "/",
    signIn: "/handler/sign-in",
    signUp: "/handler/sign-up",
    afterSignIn: "/app/dashboard",
    afterSignUp: "/app/dashboard",
    afterSignOut: "/",
  },
});
