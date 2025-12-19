import { Launcher } from "@/components/Launcher";
import { ThemeProvider } from "@/components/theme";

function App() {
  return (
    <ThemeProvider>
      <Launcher />
    </ThemeProvider>
  );
}

export default App;
