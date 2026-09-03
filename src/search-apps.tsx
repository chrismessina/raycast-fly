import { WithValidToken } from "./pages/with-valid-token";
import { AppsList } from "./pages/lists/apps-list";

export default function SearchApps() {
  return <WithValidToken>{({ isLoading }) => <AppsList isLoading={isLoading} />}</WithValidToken>;
}
