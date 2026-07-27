"use client";

import { signOut } from "next-auth/react";

export default function Dashboard() {
  return (
    <>
      <div className="text-3xl text-center font-semibold">page</div>
      <button
        className="border-2 border-white text-xl font-bold cursor-pointer"
        onClick={() => signOut()}
      >
        signout
      </button>
    </>
  );
}
