import { signOut } from "../login/actions";

export default function NoAccess() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-sm text-center">
        <h1 className="mb-2 text-lg font-bold">Your account is waiting for access</h1>
        <p className="mb-4 text-gray-600">
          Please ask the church admin to give your account a role (Pastor, Leader or Usher).
        </p>
        <form action={signOut}>
          <button className="btn-secondary">Sign out</button>
        </form>
      </div>
    </main>
  );
}
