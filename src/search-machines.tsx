import { WithValidToken } from "./pages/with-valid-token";
import { MachinesList } from "./pages/lists/machines-list";

export default function SearchMachines() {
  return <WithValidToken>{({ isLoading }) => <MachinesList isLoading={isLoading} />}</WithValidToken>;
}
