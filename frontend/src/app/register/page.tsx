/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Suspense } from "react";
import RegisterForm from "./RegisterForm";

export default function Register() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}