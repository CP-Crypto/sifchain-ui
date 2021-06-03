import { getEnv, SifEnv } from "./getEnv";

const profiles = {
  devnet: {
    tag: "devnet",
    ethAssetTag: "ethereum.devnet",
    sifAssetTag: "sifchain.mainnet",
  },
  testnet: {
    tag: "testnet",
    ethAssetTag: "ethereum.testnet",
    sifAssetTag: "sifchain.mainnet",
  },
  mainnet: {
    tag: "mainnet",
    ethAssetTag: "ethereum.mainnet",
    sifAssetTag: "sifchain.mainnet",
  },
  localnet: {
    tag: "localnet",
    ethAssetTag: "ethereum.localnet",
    sifAssetTag: "sifchain.localnet",
  },
};
const cases = [
  { hostname: "testnet.sifchain.finance", tag: "testnet" },
  { hostname: "devnet.sifchain.finance", tag: "devnet" },
  { hostname: "gateway.pinata.cloud", tag: "devnet" },
  { hostname: "dex.sifchain.finance", tag: "mainnet" },
  { hostname: "localhost", tag: "localnet" },
];

cases.forEach(({ hostname, tag }) => {
  describe(`host is ${hostname} then use cookie > "${tag}"`, () => {
    const tests = [
      {
        input: { hostname, cookie: undefined },
        output: profiles[tag as keyof typeof profiles],
      },
      {
        input: { hostname, cookie: SifEnv.MAINNET },
        output: profiles.mainnet,
      },
      {
        input: { hostname, cookie: SifEnv.DEVNET },
        output: profiles.devnet,
      },
      {
        input: { hostname, cookie: SifEnv.TESTNET },
        output: profiles.testnet,
      },
    ];
    tests.forEach(({ input: { hostname, cookie }, output }) => {
      test(`hostname: ${hostname} + cookie: ${cookie} = ${output.tag}`, () => {
        expect(
          getEnv({
            location: { hostname },
            cookies: { getEnv: () => cookie?.toString() },
          }),
        ).toEqual(output);
      });
    });
  });
});