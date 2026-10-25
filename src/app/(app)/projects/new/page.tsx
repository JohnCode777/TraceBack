import { createProjectAction } from "@/app/actions";
import { ActionForm } from "@/components/action-form";
export default function NewProjectPage() {
  return (
    <div className="card max-w-xl space-y-5">
      <h1 className="text-2xl font-bold">Create project</h1>
      <ActionForm action={createProjectAction} submit="Create project">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" required maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="key">Key (2–5 letters)</label>
          <input
            id="key"
            name="key"
            required
            minLength={2}
            maxLength={5}
            pattern="[A-Za-z]{2,5}"
          />
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={2000}
          />
        </div>
      </ActionForm>
    </div>
  );
}
