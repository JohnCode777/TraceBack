"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { noteSchema, transitionSchema } from "@/lib/validation";

type Developer = { userId: string; user: { name: string } };
type Props = { projectId: string; bugId: string; role: string; status: string; assigneeId: string | null; developers: Developer[] };
export function BugActions({ projectId, bugId, role, status, assigneeId, developers }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const base = `/api/projects/${projectId}/bugs/${bugId}`;
  async function post(path: string, body: unknown) {
    setError("");
    const response = await fetch(`${base}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Request failed"); return; }
    router.refresh();
  }
  async function transition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const input = Object.fromEntries(data);
    const parsed = transitionSchema.safeParse(input);
    if (!parsed.success) { setError(parsed.error.issues.map(i=>i.message).join("; ")); return; }
    await post("transition", parsed.data);
  }
  async function note(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const parsed = noteSchema.safeParse(Object.fromEntries(data));
    if (!parsed.success) { setError(parsed.error.issues.map(i=>i.message).join("; ")); return; }
    await post("notes", parsed.data);
    form.reset();
  }
  const canDev = role === "Developer" || role === "Admin";
  const canTest = role === "Tester" || role === "Admin";
  const moves = status === "Submitted" && canDev ? ["Investigating"] : status === "Investigating" && canDev ? ["Fixed"] : status === "Fixed" && canTest ? ["Verified", "Investigating"] : status === "Verified" && canTest ? ["Investigating"] : [];
  return <section className="mt-8 grid gap-8 md:grid-cols-2">
    {canDev && <form onSubmit={async e=>{e.preventDefault(); await post("assign", { assigneeId: String(new FormData(e.currentTarget).get("assigneeId")) || null });}} className="grid gap-2"><h2 className="text-xl font-semibold">Assign developer</h2><select name="assigneeId" className="border p-2" defaultValue={assigneeId ?? ""}><option value="">Unassigned</option>{developers.map(d=><option key={d.userId} value={d.userId}>{d.user.name}</option>)}</select><button className="w-fit rounded bg-slate-900 p-2 text-white">Assign</button></form>}
    {moves.length > 0 && <form onSubmit={transition} className="grid gap-2"><h2 className="text-xl font-semibold">Change status</h2><label>Move to<select name="to" className="block w-full border p-2">{moves.map(m=><option key={m}>{m}</option>)}</select></label><label>Comment or reason<textarea name="comment" className="block w-full border p-2" /></label>{status === "Investigating" && <><label>Resolution summary<textarea name="resolutionSummary" className="block w-full border p-2" required /></label><label>Root cause category<select name="rootCauseCategory" className="block w-full border p-2">{["Logic error","Configuration","Data","Race condition","Third party","Environment","Unknown"].map(v=><option key={v}>{v}</option>)}</select></label><label>Reproduced by developer<select name="reproducedByDev" className="block w-full border p-2">{["Yes","Partially","No"].map(v=><option key={v}>{v}</option>)}</select></label><label>Fix reference<input name="fixReference" className="block w-full border p-2" /></label></>}<button className="w-fit rounded bg-slate-900 p-2 text-white">Update status</button></form>}
    <form onSubmit={note} className="grid gap-2"><h2 className="text-xl font-semibold">Add note</h2><label>Type<select name="type" className="block w-full border p-2">{["Observation","Hypothesis","Ruled out","Root cause","Workaround","Question"].map(v=><option key={v}>{v}</option>)}</select></label><label>Note<textarea name="body" className="block w-full border p-2" required /></label><button className="w-fit rounded bg-slate-900 p-2 text-white">Add note</button></form>
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}

export function NoteEditor({ projectId, bugId, noteId, type, body }: { projectId: string; bugId: string; noteId: string; type: string; body: string }) {
  const router = useRouter(); const [editing, setEditing] = useState(false); const [error, setError] = useState("");
  if (!editing) return <button className="text-sm underline" onClick={()=>setEditing(true)}>Edit note</button>;
  return <form onSubmit={async e=>{ e.preventDefault(); const data = new FormData(e.currentTarget); const parsed = noteSchema.safeParse(Object.fromEntries(data)); if(!parsed.success){setError("Invalid note");return;} const response = await fetch(`/api/projects/${projectId}/bugs/${bugId}/notes/${noteId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(parsed.data)}); if(!response.ok){setError((await response.json()).error ?? "Could not edit note");return;} setEditing(false);router.refresh();}} className="mt-2 grid gap-2"><input type="hidden" name="type" value={type} /><textarea name="body" defaultValue={body} className="border p-2" /><div className="flex gap-3"><button className="underline">Save</button><button type="button" className="underline" onClick={()=>setEditing(false)}>Cancel</button></div>{error && <p role="alert">{error}</p>}</form>;
}
