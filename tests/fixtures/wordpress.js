/** A stateful WP-CLI simulation: unknown commands fail instead of silently passing. */
export function wordpressSimulation(overrides = {}) {
  const state = {
    installed: false,
    options: {
      blogname: "Test Site",
      blogdescription: "",
      permalink_structure: "",
      show_on_front: "posts",
      page_on_front: "0",
    },
    posts: ["1", "2", "3"],
    homepage: "",
    plugins: [{ name: "akismet", status: "inactive" }],
    themes: [],
    ...overrides,
  };
  const handle = (args) => {
    if (args[0] === "exec" && args.includes("wp")) {
      return handle(["wp", ...args.slice(args.indexOf("wp") + 1).filter((arg) => !arg.startsWith("--path="))]);
    }
    if (args[0] === "exec") return { stdout: "https://test-site.ddev.site\n" };
    if (args[0] === "launch") return {};
    assertWp(args);
    const [, resource, command, ...rest] = args;
    if (resource === "core" && command === "is-installed") return { exitCode: state.installed ? 0 : 1 };
    if (resource === "core" && command === "install") {
      state.installed = true;
      return {};
    }
    if (resource === "option" && command === "get") {
      if (!Object.hasOwn(state.options, rest[0])) throw new Error(`Unexpected option: ${rest[0]}`);
      return { stdout: state.options[rest[0]] + "\n" };
    }
    if (resource === "option" && command === "update") {
      state.options[rest[0]] = rest[1];
      return {};
    }
    if (resource === "rewrite" && command === "structure") {
      state.options.permalink_structure = rest[0];
      return {};
    }
    if (resource === "user" && command === "get") return { stdout: "1\n" };
    if (resource === "eval") return { stdout: command.startsWith("echo array_key_last") ? "twentytwentysix" : "" };
    if (resource === "post" && command === "exists") return { exitCode: state.posts.includes(rest[0]) ? 0 : 1 };
    if (resource === "post" && command === "delete") {
      state.posts = state.posts.filter((id) => id !== rest[0]);
      return {};
    }
    if (resource === "post" && command === "list") return { stdout: state.homepage };
    if (resource === "post" && command === "create") {
      state.homepage = "10";
      state.posts.push("10");
      return { stdout: "10\n" };
    }
    if (resource === "plugin" && command === "list") return { stdout: JSON.stringify(state.plugins) };
    if (resource === "plugin" && command === "delete") {
      state.plugins = state.plugins.filter((plugin) => plugin.name !== rest[0]);
      return {};
    }
    if (resource === "plugin" && command === "install") {
      state.plugins.push({ name: rest[0], status: "active" });
      return {};
    }
    if (resource === "plugin" && command === "activate") {
      state.plugins.find((plugin) => plugin.name === rest[0]).status = "active";
      return {};
    }
    if (resource === "theme" && command === "list") return { stdout: JSON.stringify(state.themes) };
    if (resource === "theme" && command === "install") {
      state.themes.push({ name: rest[0], status: rest.includes("--activate") ? "active" : "inactive" });
      return {};
    }
    if (resource === "theme" && command === "activate") {
      state.themes.find((theme) => theme.name === rest[0]).status = "active";
      return {};
    }
    throw new Error(`Unexpected WP-CLI command: ${args.join(" ")}`);
  };
  return { state, handle };
}

function assertWp(args) {
  if (args[0] !== "wp") throw new Error(`Expected WP-CLI: ${args.join(" ")}`);
}
