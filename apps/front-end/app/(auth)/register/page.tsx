"use client";
import { useState } from "react";
import AuthLayout from "./AuthLayout";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <AuthLayout>
      <form
        className="w-full flex flex-col gap-4"
        onSubmit={e => {
          e.preventDefault();
          setError("");
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            setError("Registration not enabled (mock error)");
          }, 1200);
        }}
        aria-label="Register form"
      >
        <h1 className="text-xl font-bold text-white mb-2">Register</h1>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={loading}
          />
        </div>
        {error && <div className="text-red-400 text-sm" role="alert">{error}</div>}
        <button
          type="submit"
          className="w-full rounded bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </AuthLayout>
  );
}
