import nextConfig from "eslint-config-next";

const overrides = nextConfig.map((entry: any) => {
  if (entry.name === "next") {
    return {
      ...entry,
      rules: {
        ...entry.rules,
        "react-hooks/preserve-manual-memoization": "off",
        "react-hooks/set-state-in-effect": "off",
      },
    };
  }

  return entry;
});

export default overrides;
