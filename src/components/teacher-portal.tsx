"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { validateClassInput } from "../lib/classes";

type TeacherClass = { id: string; name: string; grade: number };

export function TeacherPortal() {
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!),
    [],
  );
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [className, setClassName] = useState("");
  const [grade, setGrade] = useState(7);

  const loadClasses = useCallback(async (id: string) => {
    const { data, error } = await supabase.from("classes").select("id, name, grade").order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setClasses((data ?? []) as TeacherClass[]);
    setTeacherId(id);
  }, [supabase]);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) loadClasses(data.user.id); }); }, [supabase, loadClasses]);

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (mode === "sign-up") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
      if (error) setMessage(error.message);
      else if (data.user) await loadClasses(data.user.id);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else if (data.user) await loadClasses(data.user.id);
    }
  };

  const createClass = async (event: FormEvent) => {
    event.preventDefault();
    const result = validateClassInput({ name: className, grade });
    if (!result.ok) { setMessage(Object.values(result.errors).join(" ")); return; }
    const { data, error } = await supabase.from("classes").insert({ teacher_id: teacherId, ...result.value }).select("id, name, grade").single();
    if (error) setMessage(error.message);
    else { setClasses((items) => [data as TeacherClass, ...items]); setClassName(""); setMessage("Class created."); }
  };

  if (!teacherId) return <section className="mx-auto max-w-md px-5 py-12"><div className="panel"><p className="eyebrow">Teacher access</p><h1 className="mt-2 text-3xl font-black">{mode === "sign-in" ? "Sign in" : "Create teacher account"}</h1><form className="mt-6 space-y-4" onSubmit={submitAuth}>{mode === "sign-up" && <label className="block text-sm font-bold">Name<input className="input-shell mt-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required /></label>}<label className="block text-sm font-bold">Email<input className="input-shell mt-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label className="block text-sm font-bold">Password<input className="input-shell mt-2" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button className="primary-action w-full" type="submit">{mode === "sign-in" ? "Sign in" : "Create account"}</button></form><button className="ghost-action mt-4" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")} type="button">{mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in"}</button>{message && <p className="mt-4 text-sm text-[#8b352a]" role="status">{message}</p>}</div></section>;

  return <section className="mx-auto max-w-3xl px-5 py-12"><div className="panel"><p className="eyebrow">Your classes</p><h1 className="mt-2 text-3xl font-black">Create your first class</h1><form className="mt-6 flex flex-wrap gap-3" onSubmit={createClass}><input aria-label="Class name" className="input-shell flex-1" placeholder="e.g. 7B Grammar Lab" value={className} onChange={(e) => setClassName(e.target.value)} /><select aria-label="Grade" className="input-shell w-32" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>{[6, 7, 8, 9].map((value) => <option key={value} value={value}>Grade {value}</option>)}</select><button className="primary-action" type="submit">Create class</button></form>{message && <p className="mt-4 text-sm" role="status">{message}</p>}<ul className="mt-8 space-y-3">{classes.map((item) => <li className="rounded-md border border-[#d8dee8] p-4" key={item.id}><strong>{item.name}</strong><span className="ml-2 text-sm text-[#657286]">Grade {item.grade}</span></li>)}</ul></div></section>;
}
