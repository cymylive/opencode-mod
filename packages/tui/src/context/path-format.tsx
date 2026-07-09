import path from "path"
import { createContext, useContext, type ParentProps, type Accessor } from "solid-js"
import { abbreviateHome } from "../runtime"
import { useLocation } from "./location"
import { useTuiPaths } from "./runtime"

const PathFormatterCtx = createContext<Accessor<string | undefined>>()

export function PathFormatterProvider(props: ParentProps<{ path?: string }>) {
  return (
    <PathFormatterCtx.Provider value={() => props.path}>
      {props.children}
    </PathFormatterCtx.Provider>
  )
}

export function usePathFormatter() {
  const paths = useTuiPaths()
  const location = useLocation()
  const ctx = useContext(PathFormatterCtx)
  const dir = () => ctx?.() ?? location()?.directory ?? paths.cwd
  return {
    path: () => dir(),
    format: (input?: string) => formatPath(input, dir(), paths.home),
  }
}

function formatPath(input: string | undefined, base: string, home: string) {
  if (typeof input !== "string" || !input) return ""

  const absolute = path.isAbsolute(input) ? input : path.resolve(base, input)
  const relative = path.relative(base, absolute)

  if (!relative) return "."
  if (relative !== ".." && !relative.startsWith(".." + path.sep)) return relative
  return abbreviateHome(absolute, home)
}
