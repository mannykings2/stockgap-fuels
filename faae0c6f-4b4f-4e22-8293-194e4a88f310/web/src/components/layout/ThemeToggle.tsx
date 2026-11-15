import { Moon, Sun } from "lucide-react";
import { cx } from "@/components/ui/primitives";
import { useTheme } from "@/features/theme/ThemeProvider";

export function ThemeToggle({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cx(
        "inline-flex size-9 items-center justify-center rounded-[10px] border transition-colors",
        onDark
          ? "border-white/30 bg-white/5 text-white/85 hover:bg-white/12 hover:text-white"
          : "border-line bg-surface text-muted hover:text-ink",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
