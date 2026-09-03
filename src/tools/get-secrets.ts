import { fetchSecrets } from "../api/graphql";

type Input = {
  /**
   * The name of the Fly.io app to list secrets for
   */
  appName: string;
};

export default async function (input: Input) {
  const secrets = await fetchSecrets(input.appName);
  return secrets.map((s) => ({
    name: s.name,
    createdAt: s.createdAt,
  }));
}
