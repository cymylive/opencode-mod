import type { LocationRef } from "@opencode-ai/sdk/v2"
import { createContext, useContext, type Accessor, type ParentProps } from "solid-js"

const context = createContext<Accessor<LocationRef | undefined>>()

export function LocationProvider(props: ParentProps<{ location?: LocationRef }>) {
  return <context.Provider value={() => props.location}>{props.children}</context.Provider>
}

export function useLocation(): Accessor<LocationRef | undefined> {
  const value = useContext(context)
  return value ?? (() => undefined)
}
