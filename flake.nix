{
  description = "Dex: a Markdown slide engine with stable, deep-linkable slides";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_24
            pkgs.pnpm
          ]
          # Headless browser for `pnpm check:fit` and `pnpm test:e2e`.
          ++ pkgs.lib.optionals pkgs.stdenv.isLinux [ pkgs.chromium ];

          shellHook = pkgs.lib.optionalString pkgs.stdenv.isLinux ''
            export CHROMIUM_PATH=${pkgs.chromium}/bin/chromium
          '';
        };
      });
    };
}
