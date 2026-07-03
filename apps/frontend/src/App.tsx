import type { Placeholder } from "@bora/shared";

// Proves @bora/shared resolves via pnpm workspace linking and typechecks.
type SharedLink = Placeholder;

function App() {
  const sharedLink: SharedLink = undefined;
  void sharedLink;

  return <h1>Bora</h1>;
}

export default App;
