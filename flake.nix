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
            # TeX for rendering ```tikz diagrams (xelatex + dvisvgm). Only needed
            # for diagrams that are not in a content folder's .dex/cache/ yet.
            (pkgs.texliveSmall.withPackages (ps: [
              ps.standalone
              ps.pgf
              ps.pgfplots
              ps.fontspec
              ps.xetex
              ps.dvisvgm
              ps.fira
            ]))
          ]
          # Headless browser for `pnpm check:fit` and `pnpm test:e2e`.
          ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [ pkgs.chromium ];

          shellHook = pkgs.lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
            export CHROMIUM_PATH=${pkgs.chromium}/bin/chromium
          '';
        };
      });
    };
}
