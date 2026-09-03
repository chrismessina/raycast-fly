import { Color, Icon } from "@raycast/api";

type StateIconResult = { source: Icon; tintColor: Color };

export function getAppStateIcon(state: string): StateIconResult {
  switch (state) {
    case "DEPLOYED":
      return { source: Icon.Dot, tintColor: Color.Green };
    case "SUSPENDED":
      return { source: Icon.Dot, tintColor: Color.Yellow };
    case "DESTROYED":
      return { source: Icon.Dot, tintColor: Color.Red };
    default:
      return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
  }
}

export function getMachineStateIcon(state: string): StateIconResult {
  switch (state) {
    case "started":
      return { source: Icon.Dot, tintColor: Color.Green };
    case "stopped":
    case "suspended":
      return { source: Icon.Dot, tintColor: Color.Yellow };
    case "destroyed":
      return { source: Icon.Dot, tintColor: Color.Red };
    case "created":
      return { source: Icon.Dot, tintColor: Color.Blue };
    default:
      return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
  }
}
