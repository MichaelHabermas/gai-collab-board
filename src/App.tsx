import { ReactElement } from "react";

export const App = (): ReactElement => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white">CollabBoard</h1>
        <p className="mt-4 text-slate-400">
          Real-time collaborative whiteboard
        </p>
      </div>
    </div>
  );
};
