# nodemod-cleanup

```
    ╭───────────────────────────────────╮
    │                                   │
    │   node_modules      ➜    🗑️      │
    │      500MB                        │
    │                                   │
    ╰───────────────────────────────────╯
         _                   _
        | |__   _   _  ___  | |__  _   _
        | '_ \ | | | |/ _ \ | '_ \| | | |
        | |_) || |_| |  __/ | |_) | |_| |
        |_.__/  \__, |\___| |_.__/ \__, |
                |___/              |___/
```

Your disk called. It wants its space back.

## Install

```bash
bun install
```

## Run

```bash
bun run index.ts           # scan current directory
bun run index.ts ~/code    # scan specific directory
```

## What it does

1. Finds all `node_modules` folders
2. Shows their sizes (largest first)
3. Lets you pick which ones to nuke
4. Nukes them

## License

MIT
